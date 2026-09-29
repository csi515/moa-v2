import type { IndustryCategory } from './categories';

type DefinedIndustry<T extends string> = {
  id: T;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: T;
  selectable?: boolean;
};

export type DefineIndustryInput<T extends string> = {
  id: T;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: T;
  selectable?: boolean;
};

type DefinitionSeed = {
  id: string;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: string;
  selectable?: boolean;
};

/** 객체 형태 — 전용 모듈 업종. catalog metadata만 선언한다. */
export function defineIndustry<T extends string>(input: DefineIndustryInput<T>): DefinedIndustry<T>;
/** 위치 인자 — 카탈로그 전용(모듈 없는) 업종 */
export function defineIndustry<T extends string>(
  id: T,
  label: string,
  description: string,
  category: IndustryCategory,
  moduleId?: T
): DefinedIndustry<T>;
export function defineIndustry<T extends string>(
  idOrInput: T | DefineIndustryInput<T>,
  label?: string,
  description?: string,
  category?: IndustryCategory,
  moduleId?: T
): DefinedIndustry<T> {
  if (typeof idOrInput === 'object') {
    return {
      id: idOrInput.id,
      label: idOrInput.label,
      description: idOrInput.description,
      category: idOrInput.category,
      moduleId: idOrInput.moduleId,
      selectable: idOrInput.selectable === true,
    };
  }
  return {
    id: idOrInput,
    label: label ?? '',
    description: description ?? '',
    category: category as IndustryCategory,
    moduleId,
    selectable: false,
  };
}

/**
 * 단일 출처 업종 카탈로그.
 * INDUSTRY_IDS / INDUSTRY_DEFINITIONS / MODULE_INDUSTRY_IDS / PUBLIC_SELECTABLE은 여기서만 파생한다.
 * 교과(영어·수학·국어·과학·코딩)는 academy 하나로만 — 과목별 Type·coding_bootcamp 금지.
 *
 * runtime capability 조합은 `src/app/industry/industryCapabilityMap.ts`.
 *
 * 전용 모듈 업종 추가:
 * 1. 여기 DEFINITION_LIST에 defineIndustry({ id, moduleId, selectable }) + catalog metadata
 * 2. src/app/industry/industryCapabilityMap.ts 에 runtime composition
 * 3. src/industries/<dir>/plugin.ts + AppContent
 * 4. src/app/industry/industryModules.tsx 에 defineIndustryModule 한 줄
 * 5. (선택) plugin.syncCapabilities + `src/industries/<id>/sync/register*Sync.ts`
 * Core/Capability 구현 파일을 수정하지 않는다. 누락은 industryContract.test에서 실패한다.
 */
const DEFINITION_LIST = [
  defineIndustry({
    id: 'piano',
    label: '피아노학원',
    description: '원생·출결·수강료·교재 중심 운영',
    category: 'education',
    moduleId: 'piano',
    selectable: true,
  }),
  defineIndustry('academy', '학원 (교과·종합)', '영어·수학·국어·과학·코딩 등 교과/종합 학원', 'education'),
  defineIndustry('art_academy', '미술학원', '미술·드로잉·디자인 교육', 'education'),
  defineIndustry('music_academy', '음악학원', '피아노 외 기악·성악 등 (종합)', 'education'),
  defineIndustry('dance_academy', '무용·댄스학원', '발레·방송댄스 등', 'education'),
  defineIndustry('language_academy', '어학원', '회화·시험 대비 어학', 'education'),
  defineIndustry('taekwondo_academy', '태권도장', '태권도·무술 도장 (신규 가입용)', 'education'),
  defineIndustry('sports_academy', '스포츠 아카데미', '구기·육상 등 스포츠 교육', 'education'),
  defineIndustry('driver_license_school', '운전면허학원', '운전 교육·면허 학원', 'education'),

  defineIndustry({
    id: 'pilates',
    label: '필라테스학원',
    description: '회원·예약·수업 종류·강사 스케줄 중심 운영',
    category: 'fitness',
    moduleId: 'pilates',
    selectable: true,
  }),
  defineIndustry({
    id: 'gym',
    label: '체육관',
    description: '회원·수업반·차량 운행·출결·수강료 중심 운영',
    category: 'fitness',
    moduleId: 'gym',
    selectable: true,
  }),
  defineIndustry('yoga_studio', '요가 스튜디오', '요가·필라테스 외 바디워크', 'fitness'),
  defineIndustry('crossfit', '크로스핏', '크로스핏·기능성 트레이닝', 'fitness'),
  defineIndustry('climbing_gym', '클라이밍짐', '실내 클라이밍', 'fitness'),
  defineIndustry('swim_school', '수영장·수영교실', '수영 레슨·회원제', 'fitness'),
  defineIndustry('golf_lesson', '골프 레슨', '골프 연습장·레슨', 'fitness'),
  defineIndustry('personal_training', '퍼스널 트레이닝', 'PT·1:1 트레이닝', 'fitness'),

  defineIndustry('hair_salon', '헤어샵', '헤어 미용실', 'beauty'),
  defineIndustry('nail_salon', '네일샵', '네일·페디큐어', 'beauty'),
  defineIndustry({
    id: 'skin_clinic',
    label: '피부관리',
    description: '고객·시술·예약·관리권 중심 운영',
    category: 'beauty',
    moduleId: 'skin_clinic',
    selectable: true,
  }),
  defineIndustry('makeup_studio', '메이크업 스튜디오', '메이크업·브라이덜', 'beauty'),
  defineIndustry('barber_shop', '바버샵', '남성 전문 이발', 'beauty'),
  defineIndustry('lash_brow', '속눈썹·눈썹', '래쉬·브로우', 'beauty'),

  defineIndustry('massage_spa', '마사지·스파', '전신·스웨디시 등', 'wellness'),
  defineIndustry('thai_massage', '타이마사지', '타이·아로마', 'wellness'),
  defineIndustry('foot_reflexology', '발마사지', '족부·리플렉솔로지', 'wellness'),
  defineIndustry({
    id: 'sauna_jjimjilbang',
    label: '사우나·찜질방',
    description: '사우나·찜질',
    category: 'wellness',
    moduleId: 'sauna_jjimjilbang',
    selectable: true,
  }),

  defineIndustry({
    id: 'daycare',
    label: '어린이집',
    description: '원아·보호자·반·출결·보육료 중심 운영',
    category: 'childcare',
    moduleId: 'daycare',
    selectable: true,
  }),
  defineIndustry('kids_cafe', '키즈카페', '놀이·돌봄 키즈카페', 'childcare'),
  defineIndustry('after_school_care', '방과후·돌봄', '초등 돌봄·방과후', 'childcare'),
  defineIndustry('playgroup', '놀이학교·플레이그룹', '영유아 놀이 프로그램', 'childcare'),

  defineIndustry('life_coaching', '라이프 코칭', '라이프·커리어 코칭', 'consulting'),
  defineIndustry('career_consulting', '진로·취업 상담', '진로·취업 컨설팅', 'consulting'),
  defineIndustry('business_consulting', '경영 컨설팅', '사업·경영 자문', 'consulting'),
  defineIndustry('psychological_counseling', '심리상담', '심리·상담 센터', 'consulting'),

  defineIndustry('dental_clinic', '치과', '치과 클리닉 (예약·고객)', 'healthcare'),
  defineIndustry('oriental_medicine', '한의원', '한방 클리닉', 'healthcare'),
  defineIndustry('physical_therapy', '물리치료·재활', '재활·물리치료', 'healthcare'),
  defineIndustry('veterinary_clinic', '동물병원', '동물 진료', 'healthcare'),

  defineIndustry('private_tutoring', '과외·개인지도', '1:1·소수 과외', 'lesson'),
  defineIndustry('instrument_lesson', '악기 레슨', '개인 악기 레슨', 'lesson'),
  defineIndustry('voice_lesson', '보컬 레슨', '성악·보컬', 'lesson'),
  defineIndustry('cooking_class', '쿠킹 클래스', '요리·베이킹 클래스', 'lesson'),

  defineIndustry('photo_studio', '사진 스튜디오', '촬영·스튜디오', 'studio'),
  defineIndustry('craft_workshop', '공방', '수공예·체험 공방', 'studio'),
  defineIndustry('recording_studio', '녹음실', '녹음·믹싱', 'studio'),
  defineIndustry('rehearsal_room', '연습실', '밴드·댄스 연습실', 'studio'),

  defineIndustry('pet_grooming', '반려동물 미용', '펫 그루밍', 'pet'),
  defineIndustry('pet_hotel', '반려동물 호텔', '펫 호텔·데이케어', 'pet'),
  defineIndustry('dog_training', '반려견 훈련', '훈련·행동교정', 'pet'),

  defineIndustry('auto_repair', '자동차 정비', '정비·수리', 'automotive'),
  defineIndustry('car_wash', '세차장', '세차·디테일링', 'automotive'),
  defineIndustry('driving_school', '운전연수', '연수·장롱면허', 'automotive'),

  defineIndustry('real_estate', '부동산', '중개·컨설팅', 'property'),
  defineIndustry('interior_design', '인테리어', '인테리어·리모델링', 'property'),
  defineIndustry('cleaning_service', '청소·클리닝', '입주·사무실 청소', 'property'),

  defineIndustry('tax_accounting', '세무·회계', '세무·기장', 'professional'),
  defineIndustry('law_office', '법무·변호사', '법률 사무', 'professional'),
  defineIndustry('it_agency', 'IT·개발사', '개발·IT 서비스', 'professional'),
  defineIndustry('design_agency', '디자인 에이전시', '디자인·브랜딩', 'professional'),

  defineIndustry('wedding_planner', '웨딩플래너', '웨딩·스드메', 'event'),
  defineIndustry('party_event', '파티·행사', '이벤트·파티', 'event'),
  defineIndustry('funeral_service', '상조·장례', '상조·장례 서비스', 'event'),

  defineIndustry('hotel_pension', '호텔·펜션', '숙박업', 'travel'),
  defineIndustry('travel_agency', '여행사', '여행·투어', 'travel'),

  defineIndustry('restaurant', '음식점', '식당·외식', 'food'),
  defineIndustry('cafe', '카페', '카페·디저트', 'food'),
  defineIndustry('bakery', '베이커리', '빵집·베이커리', 'food'),

  defineIndustry({
    id: 'retail',
    label: '소매업',
    description: '상품·재고·판매·고객·포인트 중심 운영',
    category: 'other',
    moduleId: 'retail',
    selectable: true,
  }),

  defineIndustry('general_service', '기타 서비스', '목록에 없는 업종', 'other'),
] as const satisfies readonly DefinitionSeed[];

export type IndustryType = (typeof DEFINITION_LIST)[number]['id'];

/** DEFINITION_LIST에서 moduleId가 있는 항목만. 별도 배열을 유지하지 않는다. */
export type ModuleIndustryId = NonNullable<(typeof DEFINITION_LIST)[number]['moduleId']>;

export const MODULE_INDUSTRY_IDS: readonly ModuleIndustryId[] = DEFINITION_LIST.flatMap((d) =>
  d.moduleId ? [d.moduleId] : []
);

/** Core catalog metadata. runtime capability 조합은 포함하지 않는다. */
export type IndustryCatalogMetadata = {
  id: IndustryType;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: ModuleIndustryId;
  selectable: boolean;
};

export type IndustryDefinition = IndustryCatalogMetadata;

export const INDUSTRY_IDS: IndustryType[] = DEFINITION_LIST.map((d) => d.id);

/**
 * 신규 가입·사업장 생성 UI에 노출하는 업종.
 * DEFINITION_LIST.selectable 에서만 파생한다. 별도 배열을 유지하지 않는다.
 */
export const PUBLIC_SELECTABLE_INDUSTRY_IDS = DEFINITION_LIST.flatMap((d) =>
  d.selectable ? [d.id] : []
) as readonly IndustryType[];

export const INDUSTRY_DEFINITIONS = Object.fromEntries(
  DEFINITION_LIST.map((d) => [
    d.id,
    {
      id: d.id,
      label: d.label,
      description: d.description,
      category: d.category,
      moduleId: d.moduleId,
      selectable: d.selectable === true,
    } satisfies IndustryDefinition,
  ])
) as Record<IndustryType, IndustryDefinition>;

/** 구 값 → 현재 IndustryType 호환 별칭 */
export const INDUSTRY_ALIASES: Record<string, IndustryType> = {
  taekwondo: 'gym',
  preschool: 'daycare',
  kindergarten: 'daycare',
  sauna_jjimjbang: 'sauna_jjimjilbang',
};
