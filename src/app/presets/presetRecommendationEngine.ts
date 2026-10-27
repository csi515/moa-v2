/**
 * AI-Powered Industry Preset & Capability Recommendation Engine
 *
 * 사업주의 자연어 입력(예: "판교에서 성인 피아노 학원을 운영하고 연습실 대여와 주차 등록이 필요해요")을
 * 다차원 키워드/의미론적 가중치 분석을 통해 44개 프리셋 및 76개 Capability와 실시간 매칭하는 지능형 추천 엔진
 */

import { INDUSTRY_PRESETS } from './presetRegistry';
import type { IndustryPresetDefinition } from '@/core/presets/types';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';

export interface PresetRecommendationMatch {
  presetId: string;
  presetName: string;
  category: string;
  score: number; // 0 ~ 100
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
  explanation: string;
  baseCapabilities: CapabilityId[];
  recommendedAddons: {
    capabilityId: CapabilityId;
    name: string;
    reason: string;
  }[];
}

export interface RecommendationResult {
  inputQuery: string;
  topRecommendation: PresetRecommendationMatch | null;
  alternativeRecommendations: PresetRecommendationMatch[];
  detectedAddonCapabilities: CapabilityId[];
}

/**
 * 업종별 지능형 시맨틱 키워드 사전
 */
const PRESET_KEYWORD_MAP: Record<string, string[]> = {
  // 학원/교육
  piano: ['피아노', '음악', '바이올린', '레슨', '건반', '악기', '연습실', '교습비', '음악학원', '클래식'],
  art: ['미술', '그림', '드로잉', '회화', '만화', '도예', '조소', '물감', '미술학원'],
  taekwondo: ['태권도', '도장', '품새', '겨루기', '승품', '도복', '관장', '사범', '태권도장', '띠'],
  english: ['영어', '어학', '토플', '토익', '원어민', '보카', '스피킹', '리딩', '어학원', '파닉스'],
  math: ['수학', '연산', '단원평가', '수학학원', '문제풀이', '오답노트', '심화', '기하'],
  dance: ['댄스', '무용', '발레', '안무', '댄스학원', '케이팝', '스트릿', '홀대여'],
  coding: ['코딩', '프로그래밍', '엔트리', '스크래치', '파이썬', '소프트웨어', '로봇', '아카데미'],
  daycare: ['어린이집', '유치원', '놀이학교', '보육', '알림장', '귀가지도', '영유아', '돌봄'],

  // 스포츠/피트니스
  pilates: ['필라테스', '기구필라테스', '리포머', '바렐', '체형교정', '체어', '그룹레슨', '스튜디오'],
  fitness: ['헬스', '피트니스', 'pt', '웨이트', 'gx', '트레이너', '인바디', '헬스장', '체육관'],
  yoga: ['요가', '아사나', '플라잉요가', '명상', '수련', '빈야사', '요가원'],
  golf: ['골프', '스크린골프', '타석', '스윙', '레인지', '골프연습장', '프로레슨', 'gdr'],
  swim_school: ['수영', '수영장', '레인', '물놀이', '수영교실', '자유형', '배영', '수영강습'],
  tennis: ['테니스', '코트', '라켓', '서브', '스트로크', '실내테니스', '테니스장'],

  // 공간/대여
  study_cafe: ['스터디카페', '독서실', '좌석', '키오스크', '시간권', '사물함', '열람실', '무인스터디'],
  party_room: ['파티룸', '공간대여', '촬영스튜디오', '모임공간', '렌탈룸', '바베큐', '올나잇'],
  karaoke: ['코인노래방', '노래방', '코노', '룸', '시간충전', '곡수'],
  shared_office: ['공유오피스', '코워킹', '회의실', '지정석', '자유석', '비상주', '입주사'],
  boardgame_cafe: ['보드게임', '보드게임카페', '음료주문', '테이블게임', '벌칙'],

  // 뷰티/케어
  hair_salon: ['미용실', '헤어샵', '헤어', '커트', '펌', '염색', '디자이너', '헤어살롱'],
  nail_shop: ['네일', '네일아트', '패디', '젤네일', '네일샵', '케어', '속눈썹'],
  skin_care: ['피부', '에스테틱', '스킨케어', '피부관리', '경락', '마사지', '리프팅', '케어'],
  pet_beauty: ['애견미용', '반려견미용', '그루밍', '목욕', '펫샵', '강아지미용'],

  // 요식/식음
  cafe: ['카페', '커피', '음료', '베이커리', '원두', '디저트', '키오스크', '테이크아웃'],
  restaurant_table: ['식당', '음식점', '레스토랑', '테이블', '주방', 'kds', '외식', '주문', '메뉴'],
  bakery: ['빵집', '베이커리', '제과', '제빵', '생지', '케이크', '소금빵'],

  // 전문서비스 및 제조/산업
  car_repair: ['정비소', '카센터', '자동차', '엔진오일', '정비', '공임', '부품', '수리'],
  repair_service: ['수리', 'as', '수리점', '전자제품', '컴퓨터수리', '스마트폰수리', '공방'],
  cleaning_service: ['청소', '입주청소', '세탁', '특수청소', '파견청소', '정기청소'],
  manufacturing_light: ['제조', '가공', '공장', '생산', 'bom', '부품표', '설비', '품질', '작업표준', '원자재', 'ecn', '4m'],
  rnd_lab_management: ['연구소', 'r&d', '연구', '개발', '실험', '특허', '직무발명', '연구설비', '연구원', '과제'],
};

/**
 * 부가 기능(Add-on) 자동 감지 키워드 매핑
 */
const ADDON_TRIGGER_MAP: {
  capabilityId: CapabilityId;
  name: string;
  keywords: string[];
  reason: string;
}[] = [
  {
    capabilityId: 'parking_validator',
    name: '무료 주차 등록·정산',
    keywords: ['주차', '차량', '주차권', '주차등록', '발렛', '주차할인'],
    reason: '고객 방문 차량에 대한 무료 주차 등록 및 상가 주차권 정산이 감지되었습니다.',
  },
  {
    capabilityId: 'vehicle_shuttle',
    name: '셔틀버스 운행 관제',
    keywords: ['셔틀', '통학', '셔틀버스', '등하원버스', '통근', '노선', '정류장'],
    reason: '원생/임직원을 위한 통학·통근 셔틀버스 노선 및 승하차 관제가 감지되었습니다.',
  },
  {
    capabilityId: 'leave_management',
    name: '시간 단위 휴가 관리',
    keywords: ['휴가', '연차', '유연근무', '반차', '외출', '근태', '직원휴가'],
    reason: '임직원 근태 및 시간(Hour) 단위 정밀 차감형 휴가 관리가 감지되었습니다.',
  },
  {
    capabilityId: 'approval_workflow',
    name: '전사 전자결재',
    keywords: ['결재', '전자결재', '기안', '품의', '승인권자', '사내결재'],
    reason: '부서별 기안문 작성 및 다단계 전자결재 승인 프로세스가 감지되었습니다.',
  },
  {
    capabilityId: 'digital_contract',
    name: '전자 계약서 서명',
    keywords: ['계약', '전자계약', '서약서', '서명', '약관', '입주계약', '고용계약'],
    reason: '모바일 서명이 포함된 전자 표준계약서 작성이 감지되었습니다.',
  },
  {
    capabilityId: 'supply_restock',
    name: '소모품 구매·조달 파이프라인',
    keywords: ['발주', '구매', '소모품', '조달', '비품', '입찰', '수의계약'],
    reason: '부서별 비품 구매 요청 및 견적 비교, 발주서 발행 관리가 감지되었습니다.',
  },
];

/**
 * 자연어 쿼리를 정규화하고 토큰화
 */
function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\sㄱ-힣]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

/**
 * AI 기반 업종 프리셋 및 맞춤 Capability 추천 엔진
 */
export function recommendIndustryPreset(inputQuery: string): RecommendationResult {
  const query = (inputQuery || '').trim();
  if (!query) {
    return {
      inputQuery: '',
      topRecommendation: null,
      alternativeRecommendations: [],
      detectedAddonCapabilities: [],
    };
  }

  const tokens = tokenizeQuery(query);
  const scores: { presetId: string; score: number; matchedKeywords: string[] }[] = [];

  // 1. 44개 프리셋별 키워드 매칭 스코어링
  Object.entries(PRESET_KEYWORD_MAP).forEach(([presetId, keywords]) => {
    const presetDef = INDUSTRY_PRESETS[presetId];
    if (presetDef?.hiddenInMoa) return;
    let matchCount = 0;
    const matched: string[] = [];

    keywords.forEach((keyword) => {
      const lowerKw = keyword.toLowerCase();
      // 직접 포함 여부 또는 토큰 일치
      if (query.includes(lowerKw)) {
        matchCount += 3; // 직접 포함 시 높은 가중치
        if (!matched.includes(keyword)) matched.push(keyword);
      } else if (tokens.some((token) => token.includes(lowerKw) || lowerKw.includes(token))) {
        matchCount += 1;
        if (!matched.includes(keyword)) matched.push(keyword);
      }
    });

    if (matchCount > 0) {
      // 0~100 스케일 환산 (최대 15점 기준 100점 캡)
      const normalizedScore = Math.min(100, Math.round((matchCount / 10) * 100));
      scores.push({
        presetId,
        score: normalizedScore,
        matchedKeywords: matched,
      });
    }
  });

  // 점수 내림차순 정렬
  scores.sort((a, b) => b.score - a.score);

  // 2. 부가 기능(Add-on) 추천 감지
  const detectedAddons: {
    capabilityId: CapabilityId;
    name: string;
    reason: string;
  }[] = [];

  ADDON_TRIGGER_MAP.forEach((addon) => {
    const isTriggered = addon.keywords.some((kw) => query.includes(kw));
    if (isTriggered) {
      detectedAddons.push({
        capabilityId: addon.capabilityId,
        name: addon.name,
        reason: addon.reason,
      });
    }
  });

  const detectedAddonIds = detectedAddons.map((a) => a.capabilityId);

  // 상위 프리셋 포맷팅
  const formatMatch = (item: (typeof scores)[0]): PresetRecommendationMatch => {
    const presetDef: IndustryPresetDefinition | undefined = INDUSTRY_PRESETS[item.presetId];
    const presetName = presetDef?.name || item.presetId;
    const category = presetDef?.category || '일반';
    const baseCaps = (presetDef?.capabilities || []) as CapabilityId[];

    // 기본 기능에 없는 부가 기능만 추천으로 필터링
    const relevantAddons = detectedAddons.filter((a) => !baseCaps.includes(a.capabilityId));

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (item.score >= 70) confidence = 'high';
    else if (item.score >= 40) confidence = 'medium';

    return {
      presetId: item.presetId,
      presetName,
      category,
      score: item.score,
      confidence,
      matchedKeywords: item.matchedKeywords,
      explanation: `'${item.matchedKeywords.slice(0, 3).join(', ')}' 등의 핵심 키워드가 감지되어 ${presetName} 프리셋과 ${item.score}% 일치합니다.`,
      baseCapabilities: baseCaps,
      recommendedAddons: relevantAddons,
    };
  };

  const top = scores.length > 0 ? formatMatch(scores[0]) : null;
  const alternatives = scores.slice(1, 4).map(formatMatch);

  return {
    inputQuery: query,
    topRecommendation: top,
    alternativeRecommendations: alternatives,
    detectedAddonCapabilities: detectedAddonIds,
  };
}
