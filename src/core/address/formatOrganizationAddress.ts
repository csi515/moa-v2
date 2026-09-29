import type { OrganizationAddressValue } from './types';

type AddressDisplayParts = Partial<OrganizationAddressValue> & {
  businessAddress?: string | null;
  address?: string | null;
};

/** 표시용 주소 문자열. 필드는 분리 저장하고 표시만 조합한다. */
export function formatOrganizationAddress(parts: AddressDisplayParts): string {
  const road = parts.roadAddress?.trim() || '';
  const detail = parts.addressDetail?.trim() || '';
  if (road) {
    return detail ? `${road} ${detail}` : road;
  }
  return (parts.businessAddress || parts.address || '').trim();
}

/** 생성 시 저장할 주소. '-' 등 placeholder는 빈 값으로 본다. */
export function normalizeCreateOrganizationAddress(
  parts?: AddressDisplayParts,
  fallback?: string
): string {
  const formatted =
    (parts && formatOrganizationAddress(parts)) || fallback?.trim() || '';
  if (!formatted || formatted === '-') return '';
  return formatted;
}
