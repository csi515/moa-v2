/**
 * 카탈로그에 없는 프리셋/업종 id → 공유 전용 모듈 id.
 * moduleId === industry id 불변식은 유지하고, 런타임만 모듈을 공유한다.
 */
export const SHARED_MODULE_BY_INDUSTRY: Readonly<Record<string, string>> = {
  apparel_store: 'retail',
  convenience_store: 'retail',
};

export function resolveSharedModuleId(
  industryType?: string | null
): string | null {
  const raw = industryType?.trim();
  if (!raw) return null;
  return SHARED_MODULE_BY_INDUSTRY[raw] ?? null;
}
