/**
 * SignOutCoordinator 통합 로그아웃 조건부 보호 및 컨텍스트 정리 테스트.
 *
 * 검증 시나리오:
 * 1. 온라인 + pending 없음 → 즉시 logout (confirm prompt 없이 즉시 완료)
 * 2. 온라인 + pending 없음 + organization context 존재 → context 정상 정리
 * 3. offline + pending mutation 존재 → 보호 동작 (prompt 표시, logout 보류)
 * 4. pending mutation sync 성공 → 정상 logout
 * 5. pending mutation sync 실패 → 데이터 유실 없이 처리 (pending store 보존)
 * 6. 사용자가 logout 취소 → 현재 session 유지
 * 7. 강제 logout → 명확한 데이터 유실 가능성 처리 후 logout (force / discardUnsynced)
 * 8. logout 후 다시 login → 이전 organization/business context가 잘못 남지 않는지 확인
 *
 * 실행: npx tsx src/core/auth/services/signOutCoordinator.test.ts
 */
import assert from 'node:assert/strict';
import {
  completeSignOut,
  hasPendingOfflineMutations,
  registerCompletionListener,
  registerPromptListener,
  requestSignOut,
  setTestAuthSignOutHandler,
  SIGN_OUT_COPY,
} from './signOutCoordinator';
import { getStorageAdapter } from '@/services/adapters';
import { setOrganizationId } from '@/services/adapters/storageContext';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import { markPendingUpsert, confirmServerCommit } from '@/services/adapters/pendingMutations';
import * as orgService from '@/core/organizations/services/organizationService';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

function installMemoryLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
  return store;
}

async function runTests() {
  const store = installMemoryLocalStorage();
  let currentPrompt: ConfirmDialogOptions | null = null;
  let completionCount = 0;
  let supabaseSignOutCount = 0;

  // 테스트 환경에서 Supabase Auth signOut 모킹
  setTestAuthSignOutHandler(async () => {
    supabaseSignOutCount += 1;
  });

  registerPromptListener((prompt) => {
    currentPrompt = prompt;
  });

  registerCompletionListener(() => {
    completionCount += 1;
  });

  try {
    // --------------------------------------------------------------------------
    // 시나리오 1: 온라인 + pending 없음 → 즉시 logout (prompt 없이 즉시 signed_out)
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      supabaseSignOutCount = 0;
      setOrganizationId('org-clean');

      assert.equal(hasPendingOfflineMutations(), false);

      const result = await requestSignOut();
      assert.equal(result, 'signed_out');
      assert.equal(currentPrompt, null, 'pending이 없을 때는 다이얼로그를 띄우지 않아야 함');
      assert.equal(completionCount, 1, '완료 리스너가 호출되어야 함');
      assert.equal(supabaseSignOutCount, 1, 'Supabase signOut이 호출되어야 함');
      console.log('✓ 시나리오 1 통과: 온라인 + pending 없음 → 즉시 logout');
    }

    // --------------------------------------------------------------------------
    // 시나리오 2: 온라인 + pending 없음 + organization context 존재 → context 정상 정리
    // --------------------------------------------------------------------------
    {
      store.clear();
      setOrganizationId('org-test-2');
      store.set('moa_current_organization_id', 'org-test-2');
      store.set(`${STORAGE_KEYS.STUDENTS}_org-test-2`, '[{"id":"stu-2"}]');
      store.set(`${STORAGE_KEYS.INVOICES}_org-test-2`, '[{"id":"inv-2"}]');
      store.set('moa.pwa.installed', '1'); // device-only 키

      assert.equal(orgService.getStoredOrganizationId(), 'org-test-2');

      const result = await requestSignOut();
      assert.equal(result, 'signed_out');

      // 테넌트 및 비즈니스 데이터가 정리되었는지 확인
      assert.equal(store.has(`${STORAGE_KEYS.STUDENTS}_org-test-2`), false);
      assert.equal(store.has(`${STORAGE_KEYS.INVOICES}_org-test-2`), false);
      assert.equal(orgService.getStoredOrganizationId(), null);
      // device-only 키는 보존되어야 함
      assert.equal(store.get('moa.pwa.installed'), '1');
      console.log('✓ 시나리오 2 통과: context 정상 정리 (조직, 캐시 정리 및 device-only 보존)');
    }

    // --------------------------------------------------------------------------
    // 시나리오 3: offline + pending mutation 존재 → 보호 동작 (다이얼로그 표시, blocked)
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      supabaseSignOutCount = 0;
      setOrganizationId('org-offline-3');

      // pending mutation 주입
      const pending = markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-offline');
      assert.ok(pending);
      assert.equal(hasPendingOfflineMutations(), true);

      const result = await requestSignOut();
      assert.equal(result, 'blocked', 'pending mutation이 남아있으므로 차단되어야 함');
      assert.ok(currentPrompt != null, '저장되지 않은 변경사항 다이얼로그가 표시되어야 함');
      assert.equal(currentPrompt?.title, SIGN_OUT_COPY.unsyncedTitle);
      assert.equal(completionCount, 0, '차단 상태에서는 completeSignOut이 실행되지 않아야 함');
      assert.equal(supabaseSignOutCount, 0, 'Supabase signOut이 호출되지 않아야 함');
      console.log('✓ 시나리오 3 통과: offline + pending mutation 존재 → 보호 동작');
    }

    // --------------------------------------------------------------------------
    // 시나리오 4: pending mutation sync 성공 → 정상 logout
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      setOrganizationId('org-sync-4');

      const pending = markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-sync-ok');
      assert.ok(pending);
      assert.equal(hasPendingOfflineMutations(), true);

      // 어댑터의 flushSyncOutbox가 성공적으로 pending mutation을 서버에 커밋하는 상황 모의
      const adapter = getStorageAdapter();
      const origFlush = adapter.flushSyncOutbox;
      adapter.flushSyncOutbox = async () => {
        confirmServerCommit(STORAGE_KEYS.STUDENTS, pending.revision);
      };

      try {
        const result = await requestSignOut();
        assert.equal(result, 'signed_out', 'flush 성공 후 즉시 로그아웃 완료되어야 함');
        assert.equal(hasPendingOfflineMutations(), false, 'pending mutation이 해소되어야 함');
        assert.equal(currentPrompt, null, '다이얼로그가 닫혀야 함');
        assert.equal(completionCount, 1, '완료 리스너가 호출되어야 함');
        console.log('✓ 시나리오 4 통과: pending mutation sync 성공 → 정상 logout');
      } finally {
        adapter.flushSyncOutbox = origFlush;
      }
    }

    // --------------------------------------------------------------------------
    // 시나리오 5: pending mutation sync 실패 → 데이터 유실 없이 처리
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      setOrganizationId('org-sync-fail-5');
      store.set(`${STORAGE_KEYS.STUDENTS}_org-sync-fail-5`, '[{"id":"stu-keep"}]');

      const pending = markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-keep');
      assert.ok(pending);

      const adapter = getStorageAdapter();
      const origFlush = adapter.flushSyncOutbox;
      adapter.flushSyncOutbox = async () => {
        throw new Error('Network Connection Refused');
      };

      try {
        const result = await requestSignOut();
        assert.equal(result, 'blocked');
        assert.equal(hasPendingOfflineMutations(), true, 'pending mutation이 보존되어야 함');
        assert.equal(
          store.has(`${STORAGE_KEYS.STUDENTS}_org-sync-fail-5`),
          true,
          '비즈니스 캐시가 삭제되지 않고 온전히 유지되어야 함'
        );
        console.log('✓ 시나리오 5 통과: pending mutation sync 실패 → 데이터 유실 없이 처리');
      } finally {
        adapter.flushSyncOutbox = origFlush;
      }
    }

    // --------------------------------------------------------------------------
    // 시나리오 6: 사용자가 logout 취소 → 현재 session 유지
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      setOrganizationId('org-cancel-6');

      markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-cancel');
      await requestSignOut();
      assert.ok(currentPrompt != null);

      // 사용자가 취소 클릭 (ConfirmDialog onDismiss 호출)
      if (currentPrompt?.onCancel) {
        currentPrompt.onCancel();
      }
      // dismissPrompt 시뮬레이션
      currentPrompt = null;

      assert.equal(hasPendingOfflineMutations(), true, 'pending mutation 그대로 유지');
      assert.equal(completionCount, 0, '로그아웃 완료되지 않고 세션 유지');
      console.log('✓ 시나리오 6 통과: 사용자가 logout 취소 → 현재 session 유지');
    }

    // --------------------------------------------------------------------------
    // 시나리오 7: 강제 logout → 명확한 데이터 유실 처리 후 logout
    // --------------------------------------------------------------------------
    {
      store.clear();
      currentPrompt = null;
      completionCount = 0;
      setOrganizationId('org-force-7');
      store.set(`${STORAGE_KEYS.STUDENTS}_org-force-7`, '[{"id":"stu-force"}]');

      markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-force');
      assert.equal(hasPendingOfflineMutations(), true);

      // force: true 옵션으로 강제 로그아웃
      const result = await requestSignOut({ force: true });
      assert.equal(result, 'signed_out');
      assert.equal(completionCount, 1);
      assert.equal(
        store.has(`${STORAGE_KEYS.STUDENTS}_org-force-7`),
        false,
        '강제 로그아웃 시 비즈니스 캐시 정리됨'
      );
      console.log('✓ 시나리오 7 통과: 강제 logout → 비즈니스 캐시 정리 후 정상 완료');
    }

    // --------------------------------------------------------------------------
    // 시나리오 8: logout 후 다시 login → 이전 organization/business context가 남지 않음
    // --------------------------------------------------------------------------
    {
      store.clear();
      setOrganizationId('org-user-A');
      store.set('moa_current_organization_id', 'org-user-A');
      store.set(`${STORAGE_KEYS.STUDENTS}_org-user-A`, '[{"id":"stu-A"}]');
      store.set(STORAGE_KEYS.ACTIVE_USER, JSON.stringify({ id: 'user-A', name: 'User A' }));

      await completeSignOut();

      // 로그아웃 후 확인: user-A의 orgId, 학생 캐시가 없어야 함
      assert.equal(orgService.getStoredOrganizationId(), null);
      assert.equal(store.has(`${STORAGE_KEYS.STUDENTS}_org-user-A`), false);

      // 이제 새로운 사용자 B가 로그인하는 시뮬레이션
      setOrganizationId('org-user-B');
      store.set('moa_current_organization_id', 'org-user-B');
      assert.equal(orgService.getStoredOrganizationId(), 'org-user-B');
      assert.equal(store.has(`${STORAGE_KEYS.STUDENTS}_org-user-A`), false, '이전 유저 A의 캐시가 침범하지 않음');
      console.log('✓ 시나리오 8 통과: logout 후 다시 login → 이전 컨텍스트 누수 없음');
    }

    setOrganizationId(null);
    console.log('\n========================================');
    console.log('All 8 sign-out test scenarios passed OK!');
    console.log('========================================');
  } finally {
    setTestAuthSignOutHandler(null);
  }
}

void runTests();
