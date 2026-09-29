/** 서버/저장소가 돌려준 단일 항목으로 목록을 갱신 (전체 재조회 대신) */
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((row) => row.id === item.id);
  if (index < 0) return [item, ...list];
  const next = list.slice();
  next[index] = item;
  return next;
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((row) => row.id !== id);
}

export function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return upsertById(list, item);
}
