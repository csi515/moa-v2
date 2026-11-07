import type { AddressSearchResult } from '../types';

export interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: 'R' | 'J';
  userSelectedType: 'R' | 'J';
  noSelected: 'Y' | 'N';
  userLanguageType: 'K' | 'E';
  roadAddress: string;
  roadAddressEnglish: string;
  jibunAddress: string;
  jibunAddressEnglish: string;
  autoRoadAddress: string;
  autoRoadAddressEnglish: string;
  autoJibunAddress: string;
  autoJibunAddressEnglish: string;
  buildingCode: string;
  buildingName: string;
  apartment: 'Y' | 'N';
  sido: string;
  sidoEnglish: string;
  sigungu: string;
  sigunguEnglish: string;
  sigunguCode: string;
  roadnameCode: string;
  bcode: string;
  bname: string;
  bnameEnglish: string;
  bname1: string;
  bname1English: string;
  bname2: string;
  bname2English: string;
  hname: string;
  query: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete?: (data: DaumPostcodeData) => void;
        onclose?: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void;
        onresize?: (size: { width: number; height: number }) => void;
        onsearch?: (data: { q: string; count: number }) => void;
        width?: string | number;
        height?: string | number;
        autoMapping?: boolean;
        animation?: boolean;
        focusInput?: boolean;
        focusContent?: boolean;
        theme?: Record<string, string>;
      }) => {
        open: (options?: {
          q?: string;
          left?: number;
          top?: number;
          popupTitle?: string;
          popupKey?: string;
          autoClose?: boolean;
        }) => void;
        embed: (
          element: HTMLElement,
          options?: { q?: string; autoClose?: boolean }
        ) => void;
      };
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

/**
 * 카카오 우편번호 서비스(daum.postcode) 스크립트를 동적으로 로드합니다.
 * API 키가 필요 없고 트래픽 제한이 없는 카카오 공식 무료 서비스입니다.
 */
export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경이 아닙니다.'));
  }

  if (window.daum && window.daum.Postcode) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('daum-postcode-script');
    if (existing) {
      if (window.daum && window.daum.Postcode) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => {
          scriptLoadingPromise = null;
          reject(new Error('카카오 주소 검색 스크립트를 불러오지 못했습니다.'));
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'daum-postcode-script';
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('카카오 주소 검색 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * 카카오 우편번호 콜백 데이터를 시스템 내부 AddressSearchResult 형태로 정규화합니다.
 */
export function mapDaumPostcodeToSearchResult(data: DaumPostcodeData): AddressSearchResult {
  const roadAddress = data.roadAddress || data.autoRoadAddress || data.address || '';
  const jibun = data.jibunAddress || data.autoJibunAddress || null;

  // 법정동/건물명 보조 표기 조합
  let extraAddr = '';
  if (data.bname && /[동|로|가]$/g.test(data.bname)) {
    extraAddr += data.bname;
  }
  if (data.buildingName) {
    extraAddr += extraAddr ? `, ${data.buildingName}` : data.buildingName;
  }

  const fullAddress = extraAddr ? `${roadAddress} (${extraAddr})` : roadAddress;

  return {
    roadAddress: roadAddress.trim(),
    fullAddress: fullAddress.trim(),
    jibun: jibun ? jibun.trim() : null,
    postal: data.zonecode ? data.zonecode.trim() : null,
    sido: data.sido ? data.sido.trim() : null,
    sigungu: data.sigungu ? data.sigungu.trim() : null,
    dong: data.bname ? data.bname.trim() : null,
    buildingName: data.buildingName ? data.buildingName.trim() : null,
  };
}
