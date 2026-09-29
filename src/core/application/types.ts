/**
 * 공통 Request Context / Command 타입.
 * 기존 AuthScope · AuthorizationGrant · role 문자열을 재사용한다.
 */
import type { AuthorizationGrant, AuthScope, AuthScopeType } from '@/core/authorization/types';
import type { Permission } from '@/core/authorization/types';
import type { WriteAuditLogInput } from '@/core/audit/types';
import type { EnqueueOutboxInput } from '@/core/outbox/types';

export type RequestContextErrorCode =
  | 'missing_user'
  | 'missing_organization'
  | 'org_location_mismatch'
  | 'location_not_accessible';

export class RequestContextError extends Error {
  readonly code: RequestContextErrorCode;

  constructor(code: RequestContextErrorCode, message: string) {
    super(message);
    this.name = 'RequestContextError';
    this.code = code;
  }
}

/**
 * 업무 mutation 실행 주체.
 * locationId는 UI 선택이 아니라 검증된 실행 지점이다.
 */
export type RequestContext = {
  userId: string;
  organizationId: string;
  role: string | null;
  locationId: string | null;
  staffId: string | null;
  scope: AuthScope;
  extraGrants: readonly AuthorizationGrant[];
};

/** createRequestContext 입력. locations 없이 온 locationId는 신뢰하지 않는다. */
export type RequestContextSource = {
  userId?: string | null;
  organizationId?: string | null;
  role?: string | null;
  locationId?: string | null;
  staffId?: string | null;
  extraGrants?: readonly AuthorizationGrant[] | null;
  locations?: readonly { id: string; organizationId: string }[] | null;
  scopeType?: AuthScopeType;
  customerId?: string | null;
  resourceId?: string | null;
  scopeId?: string | null;
};

export type DomainCommand<TInput = unknown> = {
  name: string;
  input: TInput;
  permission?: Permission | string;
  scopeType?: AuthScopeType;
  idempotency?: {
    key: string;
    operation: string;
    requestHash: string;
  };
};

export type CommandSideEffects = {
  audit?: Omit<WriteAuditLogInput, 'organizationId' | 'locationId'> & {
    organizationId?: string;
    locationId?: string | null;
  };
  outbox?: Omit<EnqueueOutboxInput, 'organizationId'> & {
    organizationId?: string;
  };
};

export type AtomicWork<TResult> = {
  mutate: () => Promise<TResult>;
  effects?: CommandSideEffects;
};

export type CommandRuntime<TInput> = {
  context: RequestContext;
  input: TInput;
  /** mutation + audit/outbox를 한 단위로 실행하는 확장점 */
  runAtomic: <TResult>(work: AtomicWork<TResult>) => Promise<TResult>;
};

export type CommandHandler<TInput, TResult> = {
  name: string;
  permission?: Permission | string;
  authorize?: (context: RequestContext, input: TInput) => boolean;
  execute: (runtime: CommandRuntime<TInput>) => Promise<TResult>;
};

export type CommandExecutorErrorCode =
  | 'unauthorized'
  | 'idempotency_mismatch'
  | 'idempotency_in_progress'
  | 'transaction_required'
  | 'handler_mismatch';

export class CommandExecutorError extends Error {
  readonly code: CommandExecutorErrorCode;

  constructor(code: CommandExecutorErrorCode, message: string) {
    super(message);
    this.name = 'CommandExecutorError';
    this.code = code;
  }
}
