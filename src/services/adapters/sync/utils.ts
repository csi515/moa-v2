const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function ensureUuid(id: string | undefined): string {
  if (id && isValidUuid(id)) return id;
  return crypto.randomUUID();
}

/** upsert/delete 동기화용 ID 집합 diff */
export function diffIds(existingIds: string[], currentIds: string[]): string[] {
  const current = new Set(currentIds);
  return existingIds.filter((id) => !current.has(id));
}

/**
 * 캐시 키가 없거나(미하이드레이트/클리어) 불완전할 때 원격 대량 DELETE 방지.
 * cachePresent=false → 삭제 후보 없음.
 * snapshotComplete가 false이면 stale 목록으로 원격 row를 지우지 않는다.
 */
export function safeDiffIds(
  existingIds: string[],
  currentIds: string[],
  options: { cachePresent: boolean; context: string; snapshotComplete?: boolean }
): string[] {
  if (!options.cachePresent || options.snapshotComplete === false) {
    console.error(
      `[sync] Refusing diff-delete (${options.context}): local cache missing or snapshot incomplete`
    );
    return [];
  }
  return diffIds(existingIds, currentIds);
}

/** hydrate fetch 중 하나라도 실패하면 불완전 캐시 기록 금지 */
export function assertHydrateNoErrors(
  errors: Record<string, unknown>,
  context: string
): void {
  const failed = Object.entries(errors)
    .filter(([, err]) => Boolean(err))
    .map(([key]) => key);
  if (failed.length === 0) return;
  throw new Error(`Incomplete hydrate (${context}): ${failed.join(', ')}`);
}
