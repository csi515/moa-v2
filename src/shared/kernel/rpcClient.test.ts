import assert from 'node:assert';
import { callRpc } from './rpcClient';

async function runTests() {
  // Test 1: 정상 호출
  let calledFn = '';
  let calledArgs: unknown = null;
  const mockClient = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      calledFn = fn;
      calledArgs = args;
      return { data: { success: true }, error: null };
    },
  };

  const res1 = await callRpc<{ success: boolean }>(mockClient, 'test_fn', { param1: 'val' });
  assert.strictEqual(calledFn, 'test_fn');
  assert.deepStrictEqual(calledArgs, { param1: 'val' });
  assert.deepStrictEqual(res1.data, { success: true });
  assert.strictEqual(res1.error, null);

  // Test 2: RPC 에러 핸들링
  const failingClient = {
    rpc: async () => ({
      data: null,
      error: { message: 'Database error', code: '42P01' },
    }),
  };

  const res2 = await callRpc(failingClient, 'failing_fn');
  assert.strictEqual(res2.data, null);
  assert.strictEqual(res2.error?.message, 'Database error');

  // Test 3: 유효하지 않은 클라이언트
  const res3 = await callRpc(null, 'any_fn');
  assert.strictEqual(res3.data, null);
  assert.ok(res3.error?.message.includes('Invalid RPC client'));

  console.log('rpcClient.test.ts: all tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
