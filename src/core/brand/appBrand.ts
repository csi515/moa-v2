import brand from '../../../brand.json';

/** 앱 표시 이름·슬로건 (스토어·런처·UI 공통) */
export const appBrand = {
  fullName:
    (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || brand.fullName,
  shortName:
    (import.meta.env.VITE_APP_SHORT_NAME as string | undefined)?.trim() || brand.shortName,
  /** MOA 약어 */
  acronym: brand.acronym,
  /** 브랜드 의미: 관리하고, 정리하고, 돕다 */
  acronymMeaning: brand.acronymMeaning,
  /** 외부 슬로건 */
  tagline: brand.tagline,
  description: brand.description,
  legalEntityDefault: brand.legalEntityDefault,
} as const;

export function appManifestName(): string {
  return `${appBrand.fullName} — ${appBrand.tagline}`;
}

export function appPageTitle(suffix?: string): string {
  return suffix ? `${appBrand.fullName} — ${suffix}` : appBrand.fullName;
}

/** 로그인·랜딩 등 외부 노출용 부제 (슬로건) */
export function appExternalSubtitle(): string {
  return appBrand.tagline;
}

/** 약어 의미 한 줄 (내부·소개용) */
export function appAcronymLine(): string {
  return `${appBrand.acronym} — ${appBrand.acronymMeaning}`;
}
