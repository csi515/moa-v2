import assert from 'node:assert';
import { toJsonValue, parseMetadata } from './jsonHelpers';

console.log('Testing jsonHelpers...');

// toJsonValue tests
assert.strictEqual(toJsonValue(undefined), null, 'toJsonValue(undefined) should be null');
assert.strictEqual(toJsonValue(123), 123, 'toJsonValue(number) should preserve number');
assert.strictEqual(toJsonValue('hello'), 'hello', 'toJsonValue(string) should preserve string');
assert.strictEqual(toJsonValue(true), true, 'toJsonValue(boolean) should preserve boolean');
assert.strictEqual(toJsonValue(null), null, 'toJsonValue(null) should preserve null');

const testObj = { key: 'value', count: 1 };
assert.deepStrictEqual(toJsonValue(testObj), testObj, 'toJsonValue(object) should preserve object');

const testArr = [1, 2, 3];
assert.deepStrictEqual(toJsonValue(testArr), testArr, 'toJsonValue(array) should preserve array');

// parseMetadata tests
interface SampleMetadata {
  title?: string;
  tags?: string[];
  count?: number;
}

const parsed = parseMetadata<SampleMetadata>({ title: 'Test', count: 5 });
assert.strictEqual(parsed.title, 'Test', 'parseMetadata should return fields');
assert.strictEqual(parsed.count, 5, 'parseMetadata should return numeric fields');

assert.deepStrictEqual(parseMetadata<SampleMetadata>(null), {}, 'parseMetadata(null) should return empty object');
assert.deepStrictEqual(parseMetadata<SampleMetadata>(undefined), {}, 'parseMetadata(undefined) should return empty object');
assert.deepStrictEqual(parseMetadata<SampleMetadata>('invalid'), {}, 'parseMetadata(string) should return empty object');
assert.deepStrictEqual(parseMetadata<SampleMetadata>([1, 2]), {}, 'parseMetadata(array) should return empty object');

const fallback: SampleMetadata = { title: 'Default' };
assert.deepStrictEqual(parseMetadata<SampleMetadata>(null, fallback), fallback, 'parseMetadata with fallback should return fallback');

console.log('jsonHelpers.test.ts: ok');
