/**
 * 중요 상태 변경 Command Executor.
 * RequestContext → Authorization → Idempotency → Transaction → Mutation → Audit → Outbox
 *
 * 기존 RPC 안의 TX/idempotency/outbox를 여기로 옮기지 않는다.
 * side effect는 transaction runner 안에서만 기록한다.
 */
import { evaluatePermission } from '@/core/authorization/authorizationService';
import { resolveAuthScope } from '@/core/authorization/scopes';
import type { WriteAuditLogInput } from '@/core/audit/types';
import {
  beginIdempotency,
  completeIdempotency,
  failIdempotency,
  type IdempotencyStore,
} from '@/core/idempotency/evaluate';
import type { EnqueueOutboxInput } from '@/core/outbox/types';
import {
  confirmReservationCommand,
  confirmReservationHandler,
  type ConfirmReservationPort,
} from './command';
import type {
  AtomicWork,
  CommandHandler,
  CommandRuntime,
  DomainCommand,
  RequestContext,
} from './types';
import { CommandExecutorError } from './types';

export type CommandTransactionRunner = <T>(work: () => Promise<T>) => Promise<T>;

export type CommandExecutorDeps = {
  authorize?: typeof evaluatePermission;
  writeAudit?: (input: WriteAuditLogInput) => Promise<string>;
  enqueueOutbox?: (input: EnqueueOutboxInput) => Promise<void>;
  transaction?: CommandTransactionRunner;
  idempotencyStore?: IdempotencyStore;
};

function assertAuthorized<TInput>(
  context: RequestContext,
  command: DomainCommand<TInput>,
  handler: CommandHandler<TInput, unknown>,
  authorize: typeof evaluatePermission
): void {
  if (handler.authorize) {
    if (!handler.authorize(context, command.input)) {
      throw new CommandExecutorError('unauthorized', '권한이 없습니다.');
    }
    return;
  }
  const permission = handler.permission ?? command.permission;
  if (!permission) return;
  const scope = resolveAuthScope({
    organizationId: context.organizationId,
    type: command.scopeType ?? context.scope.type,
    locationId: context.locationId,
    customerId: context.scope.customerId,
    resourceId: context.scope.resourceId,
  });
  const allowed = authorize({
    role: context.role,
    permission,
    scope,
    extraGrants: context.extraGrants,
  });
  if (!allowed) {
    throw new CommandExecutorError('unauthorized', '권한이 없습니다.');
  }
}

function bindContextEffects(
  context: RequestContext,
  effects: AtomicWork<unknown>['effects']
): { audit?: WriteAuditLogInput; outbox?: EnqueueOutboxInput } {
  if (!effects) return {};
  return {
    audit: effects.audit
      ? {
          ...effects.audit,
          organizationId: effects.audit.organizationId ?? context.organizationId,
          locationId: effects.audit.locationId ?? context.locationId,
        }
      : undefined,
    outbox: effects.outbox
      ? {
          ...effects.outbox,
          organizationId: effects.outbox.organizationId ?? context.organizationId,
          locationId: effects.outbox.locationId ?? context.locationId,
        }
      : undefined,
  };
}

async function flushEffects(
  bound: { audit?: WriteAuditLogInput; outbox?: EnqueueOutboxInput },
  deps: CommandExecutorDeps
): Promise<void> {
  if (bound.audit) {
    const write =
      deps.writeAudit ?? (await import('@/core/audit/auditWriter')).writeAuditLog;
    await write(bound.audit);
  }
  if (bound.outbox) {
    if (!deps.enqueueOutbox) {
      throw new CommandExecutorError(
        'transaction_required',
        'outbox enqueue는 업무 TX 안에서만 허용됩니다.'
      );
    }
    await deps.enqueueOutbox(bound.outbox);
  }
}

function syncIdempotencyStore(target: IdempotencyStore | undefined, source: IdempotencyStore) {
  if (!target || target === source) return source;
  source.forEach((row, key) => target.set(key, row));
  return target;
}

function createRuntime<TInput>(
  context: RequestContext,
  input: TInput,
  deps: CommandExecutorDeps
): CommandRuntime<TInput> {
  return {
    context,
    input,
    runAtomic: async <TResult>(work: AtomicWork<TResult>) => {
      const bound = bindContextEffects(context, work.effects);
      const hasEffects = Boolean(bound.audit || bound.outbox);
      if (hasEffects && !deps.transaction) {
        throw new CommandExecutorError(
          'transaction_required',
          'audit/outbox는 transaction 단위 안에서만 기록합니다.'
        );
      }
      const run = deps.transaction ?? (async <T>(fn: () => Promise<T>) => fn());
      return run(async () => {
        const result = await work.mutate();
        await flushEffects(bound, deps);
        return result;
      });
    },
  };
}

/**
 * Command 전용 실행 경계. 단순 조회는 통과시키지 않는다.
 */
export async function executeCommand<TInput, TResult>(
  context: RequestContext,
  command: DomainCommand<TInput>,
  handler: CommandHandler<TInput, TResult>,
  deps: CommandExecutorDeps = {}
): Promise<TResult> {
  if (handler.name !== command.name) {
    throw new CommandExecutorError('handler_mismatch', 'command와 handler 이름이 다릅니다.');
  }
  assertAuthorized(context, command, handler, deps.authorize ?? evaluatePermission);

  const idem = command.idempotency;
  let store = deps.idempotencyStore ?? (idem ? new Map() : undefined);
  if (idem && store) {
    const begun = beginIdempotency(store, {
      organizationId: context.organizationId,
      key: idem.key,
      operation: idem.operation,
      requestHash: idem.requestHash,
    });
    store = syncIdempotencyStore(deps.idempotencyStore, begun.store);
    if (begun.result.outcome === 'replay') {
      return begun.result.response as TResult;
    }
    if (begun.result.outcome === 'mismatch') {
      throw new CommandExecutorError('idempotency_mismatch', '동일 키의 요청 내용이 다릅니다.');
    }
    if (begun.result.outcome === 'in_progress') {
      throw new CommandExecutorError('idempotency_in_progress', '동일 요청이 처리 중입니다.');
    }
  }

  try {
    const result = await handler.execute(createRuntime(context, command.input, deps));
    if (idem && store) {
      store = syncIdempotencyStore(
        deps.idempotencyStore,
        completeIdempotency(store, context.organizationId, idem.key, result)
      );
    }
    return result;
  } catch (error) {
    if (idem && store) {
      syncIdempotencyStore(
        deps.idempotencyStore,
        failIdempotency(store, context.organizationId, idem.key)
      );
    }
    throw error;
  }
}

/**
 * 파일럿: 기존 confirm_reservation RPC를 executor 경계로 실행한다.
 * RPC 내부 idempotency/outbox는 그대로 두고, 권한·context만 여기서 맞춘다.
 */
export async function executeConfirmReservation(
  context: RequestContext,
  reservationId: string,
  confirm?: ConfirmReservationPort,
  deps?: CommandExecutorDeps
): Promise<void> {
  const port =
    confirm ??
    (async (id: string) => {
      const { reservationService } = await import('@/core/schedules/services/reservationService');
      await reservationService.confirmReservation(id);
    });
  await executeCommand(
    context,
    confirmReservationCommand(reservationId),
    confirmReservationHandler(port),
    deps
  );
}
