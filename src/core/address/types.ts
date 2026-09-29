/** Juso 검색 결과 → 조직 주소 구조화 필드 */
export interface AddressSearchResult {
  roadAddress: string;
  fullAddress: string;
  jibun: string | null;
  postal: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  buildingName?: string | null;
}

/** 조직에 저장·편집하는 주소 값 */
export interface OrganizationAddressValue {
  roadAddress: string;
  addressDetail: string;
  postal: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  jibun: string | null;
}

export const EMPTY_ORGANIZATION_ADDRESS: OrganizationAddressValue = {
  roadAddress: '',
  addressDetail: '',
  postal: null,
  sido: null,
  sigungu: null,
  dong: null,
  jibun: null,
};
