/**
 * 교재 마스터 local cache 커밋 — Core/DB 실패 시 local 롤백.
 * (localStorage는 cache이며, 운영 모드에서 remote 실패를 local 성공으로 숨기지 않음)
 */

/** remote 성공 전 local을 임시 반영하고, remote 실패 시 반드시 롤백 */
export async function commitLocalThenRemote<T>(params: {
  commitLocal: () => void;
  rollbackLocal: () => void;
  runRemote: () => Promise<T>;
}): Promise<T> {
  params.commitLocal();
  try {
    return await params.runRemote();
  } catch (err) {
    try {
      params.rollbackLocal();
    } catch (rbErr) {
      console.error('[textbookCatalog] local rollback 실패', rbErr);
    }
    throw err;
  }
}

/**
 * Core 연동 가능(운영) vs 불가(demo/onboarding) 경계.
 * isCoreAvailable=true 이면 local-only 재고/마스터 성공 경로를 쓰지 않는다.
 */
export function resolveTextbookCatalogMode(isCoreAvailable: boolean): 'core' | 'local_demo' {
  return isCoreAvailable ? 'core' : 'local_demo';
}
