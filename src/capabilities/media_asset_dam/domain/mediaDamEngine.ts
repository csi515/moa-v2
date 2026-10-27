/**
 * 시설 홍보용 미디어 자산 및 초상권 동의 대장 도메인 엔진 (Pure Functions)
 */

export type MediaType = 'PHOTO' | 'VIDEO' | 'BANNER_DESIGN';
export type PortraitConsentStatus = 'CONSENT_OBTAINED' | 'ANONYMIZED_MOSAIC' | 'CONSENT_PENDING';

export interface MediaAssetRecord {
  id: string;
  tenant_id: string;
  title: string;
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  tags: string[]; // 예: ["피아노발표회", "2026봄", "원생합주"]
  subject_member_names?: string[]; // 사진에 등장하는 원생/고객 이름
  portrait_consent_status: PortraitConsentStatus;
  is_marketing_ready: boolean;
  uploaded_at: string;
}

export function isMarketingUsagePermitted(
  consentStatus: PortraitConsentStatus,
  enforceConsent = true
): boolean {
  if (!enforceConsent) return true;
  return consentStatus === 'CONSENT_OBTAINED' || consentStatus === 'ANONYMIZED_MOSAIC';
}

export function filterMediaByTags(
  assets: MediaAssetRecord[],
  searchTag: string
): MediaAssetRecord[] {
  if (!searchTag || searchTag.trim().length === 0) return assets;
  const tagLower = searchTag.toLowerCase().trim();
  return assets.filter((a) =>
    a.tags.some((t) => t.toLowerCase().includes(tagLower))
  );
}

export function validateMediaAssetInput(
  title: string,
  tags: string[]
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '미디어 자산 제목을 입력해 주세요.' };
  }
  if (!tags || tags.length === 0) {
    return { isValid: false, error: '검색 및 분류를 위해 최소 1개 이상의 태그를 입력해 주세요.' };
  }
  return { isValid: true };
}
