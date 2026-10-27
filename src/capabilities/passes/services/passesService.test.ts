import { strict as assert } from 'node:assert';
import { DEMO_PASSES, fetchPasses } from './passesService';

async function testFetchPassesDemo() {
  const result = await fetchPasses('demo');
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, DEMO_PASSES.length);
  assert.equal(result[0].id, 'pass-demo-1');
  assert.equal(result[0].customer_name, '김민준');
  console.log('testFetchPassesDemo: ok');
}

async function runAll() {
  await testFetchPassesDemo();
  console.log('passesService.test.ts: all ok');
}

void runAll();
