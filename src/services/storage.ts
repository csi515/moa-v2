import { assembledStorage } from './storage/domainFacades';

/**
 * Legacy compatibility facade. 신규 domain SoT가 아니다.
 * 구현은 capability/settings/care 싱글톤에 있고, 이 객체는 같은 인스턴스를 재export한다.
 *
 * 신규 코드:
 * - Capability → `@/capabilities/<id>/infrastructure/*Storage`
 * - settings → `@/services/storage/settingsStorage`
 * - Daycare care → `@/industries/daycare/care/careStorage`
 * - 교차 업무 → application/service가 각 facade를 조합
 *
 * 금지: 이 파일에 domain method 추가, 새 Capability/Industry가 여기 import.
 * 계약: `docs/STORAGE_SERVICE_MIGRATION.md`
 *
 * Daycare care slice는 industries/daycare/care/bindCareStorage 가 연결한다.
 */
export const StorageService = assembledStorage;
