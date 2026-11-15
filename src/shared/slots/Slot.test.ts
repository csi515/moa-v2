import assert from 'node:assert';
import { slotRegistry, registerSlotExtension } from './slotRegistry';

console.log('Testing SlotRegistry...');
slotRegistry.clear();

// Test 1: 등록 및 정렬
const DummyA = () => null;
const DummyB = () => null;

registerSlotExtension({
  slotName: 'test:slot',
  id: 'ext-b',
  Component: DummyB,
  order: 20,
});

registerSlotExtension({
  slotName: 'test:slot',
  id: 'ext-a',
  Component: DummyA,
  order: 10,
});

const extensions = slotRegistry.getExtensions('test:slot');
assert.strictEqual(extensions.length, 2, 'Should have 2 extensions');
assert.strictEqual(extensions[0].id, 'ext-a', 'Order 10 should come first');
assert.strictEqual(extensions[1].id, 'ext-b', 'Order 20 should come second');

// Test 2: 조건부 렌더링
registerSlotExtension({
  slotName: 'test:predicate',
  id: 'active-only',
  Component: DummyA,
  predicate: (ctx: { status: string }) => ctx.status === 'active',
});

const activeList = slotRegistry.getExtensions('test:predicate', { status: 'active' });
assert.strictEqual(activeList.length, 1, 'Should include matching predicate');

const inactiveList = slotRegistry.getExtensions('test:predicate', { status: 'inactive' });
assert.strictEqual(inactiveList.length, 0, 'Should exclude non-matching predicate');

// Test 3: 등록 해제
const unregister = registerSlotExtension({
  slotName: 'test:unregister',
  id: 'ext-to-remove',
  Component: DummyA,
});
assert.strictEqual(slotRegistry.getExtensions('test:unregister').length, 1);
unregister();
assert.strictEqual(slotRegistry.getExtensions('test:unregister').length, 0);

console.log('SlotRegistry tests passed: ok');
