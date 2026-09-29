/**
 * Composition이 설치하는 capability 네비 필터.
 * Core는 탭↔capability 규칙을 모른다.
 */
type CapabilityNavFilter = <T extends string>(
  tabs: readonly T[],
  industry: string | null | undefined
) => T[];

let installed: CapabilityNavFilter | null = null;

export function installCapabilityNavFilter(filter: CapabilityNavFilter): void {
  installed = filter;
}

export function applyInstalledCapabilityNavFilter<T extends string>(
  tabs: readonly T[],
  industry: string | null | undefined
): T[] {
  return installed ? installed(tabs, industry) : [...tabs];
}
