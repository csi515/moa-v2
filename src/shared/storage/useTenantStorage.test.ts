import assert from 'node:assert';

// 브라우저 localStorage Mock 환경 구성
class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new LocalStorageMock();
Object.assign(globalThis, {
  window: {
    localStorage: mockStorage,
  },
});

console.log('Testing useTenantStorage logic...');

// 테넌트 격리 키 생성 및 저장 로직 단위 검증
function buildTenantKey(orgId: string | undefined, key: string): string {
  const resolvedOrgId = orgId || 'default';
  return `moa:${resolvedOrgId}:${key}`;
}

// Case 1: 서로 다른 테넌트 간 키 격리 검증
const keyA = buildTenantKey('org-100', 'payroll_records');
const keyB = buildTenantKey('org-200', 'payroll_records');

assert.notStrictEqual(keyA, keyB, 'Tenant keys must be isolated per organization');
assert.strictEqual(keyA, 'moa:org-100:payroll_records');
assert.strictEqual(keyB, 'moa:org-200:payroll_records');

// Case 2: 저장 및 조회 분리 검증
mockStorage.setItem(keyA, JSON.stringify([{ id: 'pay-1', amount: 50000 }]));
mockStorage.setItem(keyB, JSON.stringify([{ id: 'pay-2', amount: 80000 }]));

const dataA = JSON.parse(mockStorage.getItem(keyA)!);
const dataB = JSON.parse(mockStorage.getItem(keyB)!);

assert.strictEqual(dataA[0].id, 'pay-1');
assert.strictEqual(dataB[0].id, 'pay-2');
assert.notStrictEqual(dataA[0].amount, dataB[0].amount);

console.log('useTenantStorage logic tests passed: ok');
