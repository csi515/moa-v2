/**
 * storageRefreshMatch 단위 테스트
 * 실행: npm run test:storage-refresh
 */
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from '../services/adapters/storageKeys';
import { shouldRefreshForStorageChange } from './storageRefreshMatch';

const bookings = [
  STORAGE_KEYS.SCHEDULES,
  STORAGE_KEYS.SESSION_PASSES,
  STORAGE_KEYS.STUDENTS,
] as const;
const students = [
  STORAGE_KEYS.STUDENTS,
  STORAGE_KEYS.PARENTS,
  STORAGE_KEYS.PARENT_STUDENT_LINKS,
] as const;
const settings = [STORAGE_KEYS.SETTINGS, STORAGE_KEYS.TEACHERS] as const;

assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.STUDENTS, undefined), true);
assert.equal(shouldRefreshForStorageChange('*', bookings), true);
assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.SCHEDULES, bookings), true);
assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.STUDENTS, bookings), true);
assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.EXPENSES, bookings), false);
assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.SCHEDULES, students), false);
assert.equal(shouldRefreshForStorageChange(STORAGE_KEYS.ACTIVE_USER, settings), false);

console.log('storageRefreshMatch.test: ok');
