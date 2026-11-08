/**
 * Piano Student Song Wishlist & Genre Helpers (Re-export from Roster capability)
 *
 * 아키텍처 규칙: Capability(Roster)는 Industry(Piano)를 import할 수 없으므로,
 * 공통 위시리스트 헬퍼는 @/capabilities/roster/helpers/studentWishlistHelpers 에 위치하며
 * 피아노 업종 모듈에서는 이를 재수출하여 사용합니다.
 */

export * from '@/capabilities/roster/helpers/studentWishlistHelpers';
