/**
 * 업종 대분류 (교육·학원, 운동·피트니스 등).
 * 신규 저장: settings.industryCategory 에 이 id를 넣는다.
 * 레거시 행은 업종 ID(piano) 또는 한글 자유텍스트일 수 있다. 라우팅에는 쓰지 않는다.
 */
export type IndustryCategory =
  | 'education'
  | 'fitness'
  | 'beauty'
  | 'wellness'
  | 'childcare'
  | 'consulting'
  | 'healthcare'
  | 'lesson'
  | 'studio'
  | 'pet'
  | 'automotive'
  | 'property'
  | 'professional'
  | 'event'
  | 'travel'
  | 'food'
  | 'other';

export interface IndustryCategoryOption {
  id: IndustryCategory;
  label: string;
  description: string;
}

export const INDUSTRY_CATEGORY_OPTIONS: IndustryCategoryOption[] = [
  { id: 'education', label: '교육·학원', description: '학원·예체능·체육 교육' },
  { id: 'fitness', label: '운동·피트니스', description: '헬스·필라테스·요가 등' },
  { id: 'beauty', label: '뷰티', description: '헤어·네일·피부 등' },
  { id: 'wellness', label: '마사지·웰니스', description: '마사지·스파·웰니스' },
  { id: 'childcare', label: '키즈·돌봄', description: '어린이집·돌봄·키즈' },
  { id: 'consulting', label: '상담·코칭', description: '상담·코칭·컨설팅' },
  { id: 'healthcare', label: '의료·건강', description: '클리닉·재활 등 (예약·고객 관리)' },
  { id: 'lesson', label: '레슨·개인교육', description: '개인/소그룹 레슨' },
  { id: 'studio', label: '공방·스튜디오', description: '공방·촬영·연습실' },
  { id: 'pet', label: '반려동물', description: '미용·호텔·훈련' },
  { id: 'automotive', label: '자동차', description: '정비·세차·운전' },
  { id: 'property', label: '부동산·주거', description: '부동산·인테리어·청소' },
  { id: 'professional', label: '전문 서비스', description: '세무·법무·IT 등' },
  { id: 'event', label: '웨딩·행사', description: '웨딩·파티·연회' },
  { id: 'travel', label: '여행·숙박', description: '호텔·펜션·여행' },
  { id: 'food', label: '음식·외식', description: '식당·카페·베이커리' },
  { id: 'other', label: '기타', description: '기타 서비스' },
];

export function getIndustryCategoryLabel(category: IndustryCategory): string {
  return INDUSTRY_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? category;
}
