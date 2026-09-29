/**
 * Command Executor 파이프라인.
 * 실행: npm run test:command-executor
 */
import assert from 'node:assert/strict';
import { executeCommand, executeConfirmReservation } from './commandExecutor';
import { CONFIRM_RESERVATION_COMMAND, confirmReservationHandler } from './command';
import { createRequestContext } from './requestContext';
import { CommandExecutorError } from './types';
import type { CommandHandler, DomainCommand } from './types';

const admin = createRequestContext({
  userId: 'user-1',
  organizationId: 'org-a',
  role: 'admin',
  locations: [{ id: 'loc-a', organizationId: 'org-a' }],
});

const parent = createRequestContext({
  userId: 'user-2',
  organizationId: 'org-a',
  role: 'parent',
  locations: [{ id: 'loc-a', organizationId: 'org-a' }],
});

async function run() {
  const echo: CommandHandler<{ value: number }, number> = {
    name: 'demo.echo',
    authorize: () => true,
    execute: async ({ input }) => input.value + 1,
  };
  const command: DomainCommand<{ value: number }> = { name: 'demo.echo', input: { value: 1 } };

  assert.equal(await executeCommand(admin, command, echo), 2);

  await assert.rejects(
    () => executeCommand(admin, { name: 'other', input: { value: 1 } }, echo),
    (err: unknown) => err instanceof CommandExecutorError && err.code === 'handler_mismatch'
  );

  const store = new Map();
  const idemCommand: DomainCommand<{ value: number }> = {
    name: 'demo.echo',
    input: { value: 3 },
    idempotency: { key: 'k1', operation: 'reservation', requestHash: 'hash-a' },
  };

  const first = await executeCommand(admin, idemCommand, echo, { idempotencyStore: store });
  assert.equal(first, 4);
  const replay = await executeCommand(admin, idemCommand, echo, { idempotencyStore: store });
  assert.equal(replay, 4);

  await assert.rejects(
    () =>
      executeCommand(
        admin,
        { ...idemCommand, idempotency: { ...idemCommand.idempotency!, requestHash: 'other' } },
        echo,
        { idempotencyStore: store }
      ),
    (err: unknown) => err instanceof CommandExecutorError && err.code === 'idempotency_mismatch'
  );

  const denied: CommandHandler<{ value: number }, number> = {
    name: 'demo.echo',
    authorize: () => false,
    execute: async ({ input }) => input.value,
  };
  await assert.rejects(
    () => executeCommand(parent, command, denied),
    (err: unknown) => err instanceof CommandExecutorError && err.code === 'unauthorized'
  );

  const withEffects: CommandHandler<{ value: number }, number> = {
    name: 'demo.echo',
    authorize: () => true,
    execute: async ({ input, runAtomic }) =>
      runAtomic({
        mutate: async () => input.value,
        effects: {
          audit: { entityType: 'reservation', entityId: 'r1', action: 'updated' },
        },
      }),
  };
  await assert.rejects(
    () => executeCommand(admin, command, withEffects),
    (err: unknown) => err instanceof CommandExecutorError && err.code === 'transaction_required'
  );

  let audited = false;
  const txResult = await executeCommand(admin, command, withEffects, {
    transaction: async (work) => work(),
    writeAudit: async () => {
      audited = true;
      return 'audit-1';
    },
  });
  assert.equal(txResult, 1);
  assert.equal(audited, true);

  let confirmed = '';
  await executeConfirmReservation(admin, 'res-1', async (id) => {
    confirmed = id;
  });
  assert.equal(confirmed, 'res-1');

  await assert.rejects(
    () => executeConfirmReservation(parent, 'res-1', async () => undefined),
    (err: unknown) => err instanceof CommandExecutorError && err.code === 'unauthorized'
  );

  assert.equal(confirmReservationHandler(async () => undefined).name, CONFIRM_RESERVATION_COMMAND);
  console.log('commandExecutor.test.ts: ok');
}

void run();
