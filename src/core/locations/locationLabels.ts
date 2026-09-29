import type { Location } from './types';

export const LOCATION_SCOPE_LABELS = {
  all: '전체',
  unspecified: '지점 미지정',
  change: '지점 변경',
} as const;

/** 현재 보고 있는 지점. 없으면 조직 전체 범위. */
export function formatLocationScopeLabel(
  currentLocation: Location | null,
  locationCount: number
): string {
  if (currentLocation?.name) return currentLocation.name;
  if (locationCount > 0) return LOCATION_SCOPE_LABELS.all;
  return LOCATION_SCOPE_LABELS.unspecified;
}
