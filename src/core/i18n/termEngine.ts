/**
 * 매장 맞춤 도메인 용어(Custom Terminology) 사전 순수 도메인 엔진 (Pure Functions)
 *
 * 목적:
 *  - 업종 프리셋 기본 용어 및 사업주 맞춤 설정에 따라 화면 레이블 실시간 치환
 *  - 예: 피아노학원은 '원생/연습실/수강권/레슨', 골프/헬스는 '회원/타석/회원권/PT', 미용실은 '고객/시술대/선불권/시술'
 */

export const STANDARD_TERM_KEYS = [
  'term.customer',
  'term.space',
  'term.pass',
  'term.instructor',
  'term.lesson',
  'term.tenant',
  'term.owner',
  'term.staff',
  'term.billing',
] as const;

export type StandardTermKey = (typeof STANDARD_TERM_KEYS)[number];

export type ShortTermKey =
  | 'customer'
  | 'space'
  | 'pass'
  | 'instructor'
  | 'lesson'
  | 'tenant'
  | 'owner'
  | 'staff'
  | 'billing';

export const DEFAULT_TERMS: Record<StandardTermKey, string> = {
  'term.customer': '고객',
  'term.space': '공간',
  'term.pass': '이용권',
  'term.instructor': '강사',
  'term.lesson': '수업',
  'term.tenant': '사업장',
  'term.owner': '대표',
  'term.staff': '직원',
  'term.billing': '청구',
};

export const PRESET_DEFAULT_TERMS: Record<string, Partial<Record<StandardTermKey, string>>> = {
    "piano": {
      "term.customer": "원생",
      "term.space": "연습실",
      "term.pass": "수강권",
      "term.instructor": "선생님",
      "term.lesson": "피아노레슨"
    },
    "general_academy": {
      "term.customer": "원생",
      "term.space": "강의실",
      "term.pass": "수강권",
      "term.instructor": "선생님/강사",
      "term.lesson": "수업"
    },
    "language_academy": {
      "term.customer": "수강생",
      "term.space": "실습실/랩실",
      "term.pass": "수강권",
      "term.instructor": "강사/원어민강사",
      "term.lesson": "회화수업"
    },
    "art_academy": {
      "term.customer": "원생",
      "term.space": "실기실",
      "term.pass": "회차수강권",
      "term.instructor": "선생님/작가",
      "term.lesson": "실기수업"
    },
    "taekwondo_academy": {
      "term.customer": "수련생/관원",
      "term.space": "수련실/도장",
      "term.pass": "월수련권",
      "term.instructor": "관장/사범",
      "term.lesson": "수련"
    },
    "taekwondo": {
      "term.customer": "수련생/관원",
      "term.space": "수련실/도장",
      "term.pass": "월수련권",
      "term.instructor": "관장/사범",
      "term.lesson": "수련"
    },
    "dance_academy": {
      "term.customer": "수강생",
      "term.space": "연습홀",
      "term.pass": "쿠폰/수강권",
      "term.instructor": "강사/안무가",
      "term.lesson": "댄스레슨"
    },
    "coding_academy": {
      "term.customer": "수강생",
      "term.space": "PC실습실",
      "term.pass": "코스수강권",
      "term.instructor": "멘토/강사",
      "term.lesson": "실습수업"
    },
    "exam_tutoring": {
      "term.customer": "학생",
      "term.space": "상담지도실",
      "term.pass": "수강권",
      "term.instructor": "선생님/멘토",
      "term.lesson": "개별지도"
    },
    "culture_center": {
      "term.customer": "회원/수강생",
      "term.space": "강의실/실습실",
      "term.pass": "학기수강권",
      "term.instructor": "강사",
      "term.lesson": "강좌"
    },
    "pilates": {
      "term.customer": "회원",
      "term.space": "기구룸/개인실",
      "term.pass": "회원권/회차권",
      "term.instructor": "강사",
      "term.lesson": "필라테스레슨"
    },
    "yoga_studio": {
      "term.customer": "회원/요기",
      "term.space": "요가룸",
      "term.pass": "수련권/기간권",
      "term.instructor": "선생님/지도자",
      "term.lesson": "요가수련"
    },
    "gym_fitness": {
      "term.customer": "회원",
      "term.space": "운동존/머신존",
      "term.pass": "헬스이용권",
      "term.instructor": "트레이너",
      "term.lesson": "PT"
    },
    "gym": {
      "term.customer": "회원",
      "term.space": "운동존/머신존",
      "term.pass": "헬스이용권",
      "term.instructor": "트레이너",
      "term.lesson": "PT"
    },
    "pt_fitness": {
      "term.customer": "회원",
      "term.space": "PT존/세션룸",
      "term.pass": "PT세션권",
      "term.instructor": "트레이너/코치",
      "term.lesson": "1:1 PT"
    },
    "indoor_golf": {
      "term.customer": "회원",
      "term.space": "타석/룸",
      "term.pass": "타석이용권",
      "term.instructor": "레슨프로",
      "term.lesson": "골프레슨"
    },
    "swim_school": {
      "term.customer": "회원/원생",
      "term.space": "수영레인",
      "term.pass": "수영강습권",
      "term.instructor": "코치/강사",
      "term.lesson": "수영강습"
    },
    "climbing_activity": {
      "term.customer": "클라이머/회원",
      "term.space": "볼더링월/지구력존",
      "term.pass": "암장패스",
      "term.instructor": "강사/세터",
      "term.lesson": "강습세션"
    },
    "climbing_gym": {
      "term.customer": "클라이머/회원",
      "term.space": "볼더링월/지구력존",
      "term.pass": "암장패스",
      "term.instructor": "강사/세터",
      "term.lesson": "강습세션"
    },
    "boxing_mma": {
      "term.customer": "관원/회원",
      "term.space": "링/샌드백존",
      "term.pass": "체육관등록권",
      "term.instructor": "관장/코치",
      "term.lesson": "미트트레이닝"
    },
    "hair_salon": {
      "term.customer": "고객",
      "term.space": "시술체어",
      "term.pass": "시술권/정액권",
      "term.instructor": "헤어디자이너",
      "term.lesson": "헤어시술"
    },
    "barber_shop": {
      "term.customer": "고객",
      "term.space": "바버체어",
      "term.pass": "회원권",
      "term.instructor": "바버",
      "term.lesson": "바버링"
    },
    "nail_salon": {
      "term.customer": "고객",
      "term.space": "네일테이블/베드",
      "term.pass": "정액권/회차권",
      "term.instructor": "시술아티스트",
      "term.lesson": "네일아트"
    },
    "nail_eyelash": {
      "term.customer": "고객",
      "term.space": "네일테이블/베드",
      "term.pass": "정액권/회차권",
      "term.instructor": "시술아티스트",
      "term.lesson": "네일아트"
    },
    "skin_clinic": {
      "term.customer": "고객/회원",
      "term.space": "케어룸/스킨케어실",
      "term.pass": "관리회차권",
      "term.instructor": "에스테티션",
      "term.lesson": "스킨케어"
    },
    "skin_aesthetic": {
      "term.customer": "고객/회원",
      "term.space": "케어룸/스킨케어실",
      "term.pass": "관리회차권",
      "term.instructor": "에스테티션",
      "term.lesson": "스킨케어"
    },
    "massage_spa": {
      "term.customer": "고객",
      "term.space": "스파룸/베드",
      "term.pass": "테라피이용권",
      "term.instructor": "테라피스트",
      "term.lesson": "테라피세션"
    },
    "tattoo_studio": {
      "term.customer": "의뢰인/고객",
      "term.space": "작업부스",
      "term.pass": "예약권",
      "term.instructor": "타투이스트/아티스트",
      "term.lesson": "타투작업"
    },
    "photo_studio": {
      "term.customer": "고객/모델",
      "term.space": "스튜디오/호수",
      "term.pass": "촬영패키지권",
      "term.instructor": "포토그래퍼",
      "term.lesson": "촬영세션"
    },
    "pet_grooming": {
      "term.customer": "보호자/반려견",
      "term.space": "미용부스/드라이룸",
      "term.pass": "미용회차권",
      "term.instructor": "그루머/미용사",
      "term.lesson": "미용/스파"
    },
    "study_cafe": {
      "term.customer": "이용자/회원",
      "term.space": "좌석/스터디룸",
      "term.pass": "시간권/기간권",
      "term.instructor": "매니저",
      "term.lesson": "이용"
    },
    "shared_office": {
      "term.customer": "입주사/멤버",
      "term.space": "핫데스크/미팅룸",
      "term.pass": "멤버십패스",
      "term.instructor": "커뮤니티매니저",
      "term.lesson": "이용"
    },
    "space_rental": {
      "term.customer": "예약자/게스트",
      "term.space": "파티룸/홀",
      "term.pass": "대관권",
      "term.instructor": "호스트",
      "term.lesson": "대관"
    },
    "locker_storage": {
      "term.customer": "이용자/회원",
      "term.space": "창고유닛/락커",
      "term.pass": "보관권",
      "term.instructor": "관리자",
      "term.lesson": "보관"
    },
    "guesthouse": {
      "term.customer": "게스트/투숙객",
      "term.space": "도미토리/객실",
      "term.pass": "숙박예약권",
      "term.instructor": "호스트",
      "term.lesson": "숙박"
    },
    "small_hotel": {
      "term.customer": "투숙객/고객",
      "term.space": "객실",
      "term.pass": "숙박/대실권",
      "term.instructor": "프런트매니저",
      "term.lesson": "숙박"
    },
    "retail": {
      "term.customer": "고객",
      "term.space": "매대/카운터",
      "term.pass": "포인트카드",
      "term.instructor": "매장직원",
      "term.lesson": "구매"
    },
    "apparel_store": {
      "term.customer": "고객",
      "term.space": "피팅룸/매대",
      "term.pass": "적립멤버십",
      "term.instructor": "스타일리스트/직원",
      "term.lesson": "피팅/구매"
    },
    "convenience_store": {
      "term.customer": "손님",
      "term.space": "계산대",
      "term.pass": "스탬프쿠폰",
      "term.instructor": "스태프/점원",
      "term.lesson": "주문"
    },
    "pet_supplies": {
      "term.customer": "반려인/고객",
      "term.space": "진열존",
      "term.pass": "회원포인트",
      "term.instructor": "매장스태프",
      "term.lesson": "구매"
    },
    "cafe": {
      "term.customer": "손님/단골",
      "term.space": "테이블",
      "term.pass": "스탬프쿠폰",
      "term.instructor": "바리스타",
      "term.lesson": "주문"
    },
    "restaurant": {
      "term.customer": "손님",
      "term.space": "식탁/테이블",
      "term.pass": "식사권",
      "term.instructor": "서버/홀직원",
      "term.lesson": "식사"
    },
    "auto_repair": {
      "term.customer": "고객/차주",
      "term.space": "리프트 베이",
      "term.pass": "정기점검권",
      "term.instructor": "엔지니어/정비사",
      "term.lesson": "정비 작업"
    },
    "cleaning_service": {
      "term.customer": "고객/의뢰인",
      "term.space": "서비스현장",
      "term.pass": "정기청소권",
      "term.instructor": "방문클리너/매니저",
      "term.lesson": "홈클리닝"
    },
    "pet_hotel": {
      "term.customer": "보호자/반려동물",
      "term.space": "호텔룸/플레이존",
      "term.pass": "숙박권/등원권",
      "term.instructor": "케어매니저/훈련사",
      "term.lesson": "유치원수업"
    },
    "equipment_rental": {
      "term.customer": "대여자/고객",
      "term.space": "장비보관소",
      "term.pass": "렌탈이용권",
      "term.instructor": "장비관리자",
      "term.lesson": "렌탈"
    },
    "craft_repair": {
      "term.customer": "수강생/의뢰인",
      "term.space": "작업대/물레",
      "term.pass": "공방이용권",
      "term.instructor": "공방장/마스터",
      "term.lesson": "공방클래스"
    },
    "self_carwash": {
      "term.customer": "고객",
      "term.space": "세차 베이",
      "term.pass": "세차충전권",
      "term.instructor": "스태프/관리인",
      "term.lesson": "디테일링"
    },
    "daycare": {
      "term.customer": "원아/학부모",
      "term.space": "보육실(반)",
      "term.pass": "입학/원서",
      "term.instructor": "담임교사",
      "term.lesson": "일일활동"
    },
    "sauna_jjimjilbang": {
      "term.customer": "고객",
      "term.space": "사물함",
      "term.pass": "입장권/정기권",
      "term.instructor": "카운터/스태프",
      "term.lesson": "이용"
    },
    "sauna": {
      "term.customer": "고객",
      "term.space": "사물함",
      "term.pass": "입장권/정기권",
      "term.instructor": "카운터/스태프",
      "term.lesson": "이용"
    },
    "general_enterprise": {
      "term.customer": "고객사/임직원",
      "term.space": "회의실/집무실",
      "term.pass": "사원패스",
      "term.instructor": "담당자/팀원",
      "term.lesson": "업무"
    },
    "manufacturing_light": {
      "term.customer": "발주처/고객사",
      "term.space": "가공/조립라인",
      "term.pass": "작업지시서",
      "term.instructor": "작업자/반장",
      "term.lesson": "생산공정"
    },
    "procurement_distribution": {
      "term.customer": "매입/매출처",
      "term.space": "물류창고",
      "term.pass": "납품전표",
      "term.instructor": "물류/영업담당",
      "term.lesson": "입출고"
    },
    "iso_ims_enterprise": {
      "term.customer": "이해관계자/심사원",
      "term.space": "회의실/현장",
      "term.pass": "승인문서",
      "term.instructor": "품질/안전담당자",
      "term.lesson": "심사/감사"
    },
    "iso_human_capital": {
      "term.customer": "임직원",
      "term.space": "세미나실/회의실",
      "term.pass": "교육이수증",
      "term.instructor": "인사/HR담당자",
      "term.lesson": "교육/평가"
    },
    "rnd_lab_management": {
      "term.customer": "연구원/과제담당자",
      "term.space": "실험실/분석기기실",
      "term.pass": "연구과제/승인",
      "term.instructor": "책임연구원/관리자",
      "term.lesson": "실험/연구"
    },
    "orchid_nursery": {
      "term.customer": "애란인/고객",
      "term.space": "온실/배양대",
      "term.pass": "분양/보증서",
      "term.instructor": "재배관리사",
      "term.lesson": "분양상담"
    },
    "baby_food_coop": {
      "term.customer": "참여 가족 (아기)",
      "term.space": "모임 거점 (주방/공간)",
      "term.pass": "큐브 교환권 (품앗이 티켓)",
      "term.instructor": "모임장 (이번 달 방장)",
      "term.lesson": "공동 당번 (요리 조)",
      "term.tenant": "우리 품앗이 모임",
      "term.owner": "모임장 (이번 달 방장)",
      "term.staff": "공동 당번 (요리 조)",
      "term.billing": "재료비 1/N 정산"
    }
  };

/**
 * 단축 키('customer') 또는 전체 키('term.customer')를 표준 키 형태로 정규화합니다.
 */
export function normalizeTermKey(key: string): StandardTermKey | string {
  const trimmed = key.trim();
  if (trimmed.startsWith('term.')) return trimmed;
  const mapped = `term.${trimmed}` as StandardTermKey;
  if ((STANDARD_TERM_KEYS as readonly string[]).includes(mapped)) {
    return mapped;
  }
  return trimmed;
}

/**
 * 1. 단일 용어 키 해석 (우선순위: 사업주 커스텀 설정 > 프리셋 기본값 > 기본 공통값 > fallback)
 * 'customer' 또는 'term.customer' 형태 모두 지원.
 */
export function getResolvedTerm(
  rawKey: string,
  customTerms?: Record<string, string>,
  presetId?: string,
  fallback?: string
): string {
  const key = normalizeTermKey(rawKey);

  // 1. 사업주 커스텀 설정
  if (customTerms) {
    if (customTerms[rawKey]?.trim()) return customTerms[rawKey].trim();
    if (customTerms[key]?.trim()) return customTerms[key].trim();
  }

  // 2. 업종 프리셋 기본 용어
  if (presetId && PRESET_DEFAULT_TERMS[presetId]) {
    const presetVal = PRESET_DEFAULT_TERMS[presetId][key as StandardTermKey];
    if (presetVal?.trim()) {
      return presetVal.trim();
    }
  }

  // 3. 시스템 공통 기본 용어
  if (key in DEFAULT_TERMS) {
    return DEFAULT_TERMS[key as StandardTermKey];
  }

  // 4. Fallback 또는 key 자체
  return fallback ?? rawKey;
}

/**
 * 2. 텍스트 내 {term.xxx} 및 {xxx} 토큰 실시간 일괄 치환 (순수 함수)
 */
export function replaceTenantTerms(
  text: string,
  customTerms?: Record<string, string>,
  presetId?: string
): string {
  if (!text) return text;

  return text.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, tokenKey: string) => {
    const normalized = normalizeTermKey(tokenKey);
    if ((STANDARD_TERM_KEYS as readonly string[]).includes(normalized)) {
      return getResolvedTerm(normalized, customTerms, presetId);
    }
    return match;
  });
}
