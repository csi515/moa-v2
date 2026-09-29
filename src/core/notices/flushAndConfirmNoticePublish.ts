import { getCoreClient } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { StorageService } from '@/services/storage';
import type { AppNotification } from '@/types';

/** 게시 실패 시 로컬을 이전 상태 또는 pending으로 되돌림 */
function rollbackNotice(
  saved: AppNotification,
  rollbackTo: AppNotification | 'pending'
): void {
  if (rollbackTo === 'pending') {
    StorageService.saveNotification({
      ...saved,
      status: 'pending',
      sentAt: undefined,
    });
    return;
  }
  StorageService.saveNotification(rollbackTo);
}

/**
 * 공지 로컬 저장 후 debounce persist를 flush하고 원격 행을 확인한다.
 * RLS/네트워크 거절 시 false + 로컬 롤백 (성공 토스트 오판 방지).
 */
export async function flushAndConfirmNoticePublish(
  saved: AppNotification,
  rollbackTo: AppNotification | 'pending' = 'pending'
): Promise<boolean> {
  const adapter = getStorageAdapter();
  const flushed = adapter.flushPersist
    ? await adapter.flushPersist([STORAGE_KEYS.NOTIFICATIONS])
    : true;

  if (!flushed) {
    rollbackNotice(saved, rollbackTo);
    return false;
  }

  const orgId = getOrganizationId();
  if (!orgId) {
    rollbackNotice(saved, rollbackTo);
    return false;
  }

  const { data, error } = await getCoreClient()
    .from('notifications')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('id', saved.id)
    .maybeSingle();

  if (error || !data || data.status !== 'sent') {
    rollbackNotice(saved, rollbackTo);
    return false;
  }

  return true;
}
