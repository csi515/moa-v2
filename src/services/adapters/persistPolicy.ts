/**
 * persist 게이트 — stale snapshot / RPC mirror 충돌 방지용 순수 규칙.
 * Adapter는 이 결과만 보고 persist·diff-delete를 허용한다.
 */

export type PersistGateState = {
  hydrated: boolean;
  offlineHydrated: boolean;
};

/** 원격 hydrate가 끝난 뒤에만 persist. offline snapshot으로는 upsert/diff-delete 금지 */
export function canPersistRemote(state: PersistGateState): boolean {
  return state.hydrated && !state.offlineHydrated;
}

export function nextPersistEpoch(current: number | undefined): number {
  return (current ?? 0) + 1;
}

/** persist 시작 시점 epoch와 현재 epoch가 다르면 스냅샷은 폐기 */
export function isPersistEpochCurrent(
  startedEpoch: number,
  currentEpoch: number | undefined
): boolean {
  return startedEpoch === (currentEpoch ?? 0);
}

/**
 * snapshot diff-delete 허용 여부.
 * cache.has(key)만으로는 목록이 완전하다고 보지 않는다.
 * 완전 hydrate + 명시적 allow 가 있을 때만 true.
 */
export function canDiffDeleteSnapshot(state: {
  cachePresent: boolean;
  snapshotComplete: boolean;
}): boolean {
  return state.cachePresent && state.snapshotComplete;
}
