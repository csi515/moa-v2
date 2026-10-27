/**
 * @deprecated Phase 1 리팩토링: Daycare care storage는 careStorage를 직접 import하여 사용합니다.
 * StorageService 전역 몽키패칭(Object.assign)을 제거하여 런타임 사이드이펙트 및 메모리 오염을 차단했습니다.
 */
export function bindDaycareCareStorage(): void {
  // no-op: StorageService 몽키패칭 완전 제거됨
}
