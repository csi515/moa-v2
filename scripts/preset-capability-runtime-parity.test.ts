/**
 * Preset·Capability·업종 런타임 구성 일관성 및 패리티 검증 테스트
 * 실행: npx tsx scripts/preset-capability-runtime-parity.test.ts
 */

import assert from 'node:assert/strict';
import {
  INDUSTRY_PRESETS,
  PRESET_ALIASES,
  CAPABILITY_BUNDLES,
  getIndustryPreset,
  listIndustryPresets,
} from '../src/app/presets/presetRegistry';
import {
  assemblePreset,
  assembleAdHocCapabilities,
  assembleCapabilities,
  PresetAssemblyError,
} from '../src/app/presets/presetAssembler';
import {
  TAB_REQUIRED_CAPABILITIES,
  isTabAllowedForCapabilities,
} from '../src/app/industry/GenericIndustryShell';
import {
  getIndustryCapabilities,
  INDUSTRY_CAPABILITY_MAP,
} from '../src/app/industry/industryCapabilityMap';
import { provisionIndustryResources } from '../src/app/industry/resourceProvisioner';
import { MODULE_INDUSTRY_IDS } from '../src/core/industry/catalog';
import type { MoaI18nProvider } from '../src/providers/i18nProvider';

const mockI18n: MoaI18nProvider = {
  translate: (key: string, options?: any, defaultMessage?: string) =>
    typeof options === 'string' ? options : defaultMessage ?? key,
  changeLocale: async () => {},
  getLocale: () => 'ko',
  setIndustry: () => {},
  getCurrentDictionary: () => ({} as any),
};

function run(): void {
  console.log('=== [1] Preset Registry & Aliases Coverage ===');
  const presets = listIndustryPresets();
  assert.equal(presets.length, 44, `프리셋 총 개수는 정확히 44개여야 합니다. 현재: ${presets.length}`);

  for (const preset of presets) {
    assert.ok(preset.id, '프리셋 ID 누락');
    assert.ok(preset.name, `${preset.id}: 프리셋 명칭 누락`);
    assert.ok(Array.isArray(preset.capabilities), `${preset.id}: capabilities 배열 누락`);
    assert.ok(preset.capabilities.length > 0, `${preset.id}: 최소 1개 이상의 capability가 선언되어야 함`);

    // getIndustryPreset으로 직접 조회 검증
    const resolved = getIndustryPreset(preset.id);
    assert.ok(resolved, `${preset.id}: getIndustryPreset 조회 실패`);
    assert.equal(resolved?.id, preset.id);
  }

  // 13개 별칭(Alias) 전수 검증
  const aliasKeys = Object.keys(PRESET_ALIASES);
  assert.equal(aliasKeys.length, 13, `프리셋 별칭은 13개여야 합니다. 현재: ${aliasKeys.length}`);

  for (const [alias, targetPresetId] of Object.entries(PRESET_ALIASES)) {
    assert.ok(INDUSTRY_PRESETS[targetPresetId], `별칭 [${alias}]의 대상 프리셋 [${targetPresetId}]가 미존재`);
    const resolvedByAlias = getIndustryPreset(alias);
    assert.ok(resolvedByAlias, `별칭 [${alias}] 조회 실패`);
    assert.equal(resolvedByAlias?.id, targetPresetId);
  }

  // 미등록 프리셋 안전성
  assert.equal(getIndustryPreset('non_existent_preset'), undefined);
  console.log('  -> 44개 프리셋 및 13개 별칭 정상 매핑 확인 완료');

  console.log('=== [2] Preset Assembly Integrity (전수 조립 검증) ===');
  for (const preset of presets) {
    const assembled = assemblePreset(preset.id);

    assert.equal(assembled.preset.id, preset.id);
    assert.deepEqual(assembled.capabilities, preset.capabilities);
    assert.equal(
      assembled.setupSchemas.length,
      preset.capabilities.length,
      `${preset.id}: setupSchemas 개수 불일치`
    );
    assert.ok(
      assembled.resources.length >= preset.capabilities.length,
      `${preset.id}: Refine 리소스 개수 부족`
    );
    assert.ok(assembled.allFields.length > 0, `${preset.id}: 필드 목록 누락`);

    // 필드 중복 여부 확인
    const fieldIds = new Set<string>();
    for (const field of assembled.allFields) {
      assert.ok(!fieldIds.has(field.id), `${preset.id}: 중복 필드 ID [${field.id}] 발견`);
      fieldIds.add(field.id);
    }
  }
  console.log('  -> 44개 프리셋 전수 조립 및 리소스/필드 무결성 검증 완료');

  console.log('=== [3] Preset Assembly Hardening (Fail-Closed vs Graceful Optional) ===');
  // 3-1. 필수 Capability 누락 시 명시적 예외 발생 검증
  const testPresetWithMissingRequired = {
    id: 'test_preset',
    name: '테스트 프리셋',
    capabilities: ['seat_room', 'non_existent_required_cap' as any],
    requiredCapabilities: ['non_existent_required_cap' as any],
    optionalCapabilities: [],
  };
  assert.throws(
    () => {
      assembleCapabilities(testPresetWithMissingRequired, CAPABILITY_BUNDLES);
    },
    (err: any) => {
      assert.ok(err instanceof PresetAssemblyError);
      assert.equal(err.presetId, 'test_preset');
      assert.equal(err.capabilityId, 'non_existent_required_cap');
      assert.equal(err.isRequired, true);
      return true;
    },
    '필수 Capability가 누락되었을 때 PresetAssemblyError가 발생해야 합니다'
  );

  // 3-2. 선택 Capability 누락 시 안전한 부분 조립 및 건너뜀 검증
  const testPresetWithMissingOptional = {
    id: 'test_graceful',
    name: '선택 누락 테스트',
    capabilities: ['seat_room', 'non_existent_optional_cap' as any],
    requiredCapabilities: ['seat_room' as any],
    optionalCapabilities: ['non_existent_optional_cap' as any],
  };
  const gracefulResult = assembleCapabilities(testPresetWithMissingOptional, CAPABILITY_BUNDLES);
  assert.equal(gracefulResult.preset.id, 'test_graceful');
  assert.deepEqual(gracefulResult.capabilities, ['seat_room', 'non_existent_optional_cap']);
  assert.deepEqual(gracefulResult.skippedOptionalCapabilities, ['non_existent_optional_cap']);
  assert.equal(gracefulResult.setupSchemas.length, 1);
  assert.ok(gracefulResult.resources.some((r) => r.name === 'seat_rooms'));
  console.log('  -> 필수 실패 Fail-Closed 및 선택 실패 Graceful Partial 조립 방어 확인 완료');

  console.log('=== [4] GenericIndustryShell Route & Capability Guarding ===');
  // 4-1. 탭별 요구 Capability 매핑 검증
  assert.deepEqual(TAB_REQUIRED_CAPABILITIES.bookings, ['booking', 'seat_room']);
  assert.deepEqual(TAB_REQUIRED_CAPABILITIES.attendance, ['attendance']);
  assert.deepEqual(TAB_REQUIRED_CAPABILITIES.passes, ['passes']);
  assert.deepEqual(TAB_REQUIRED_CAPABILITIES.lockers, ['locker']);
  assert.ok(TAB_REQUIRED_CAPABILITIES.finance.includes('billing_invoicing'));
  assert.ok(TAB_REQUIRED_CAPABILITIES.tuition.includes('ledger_simple'));

  // 4-2. 사물함(lockers) 가드 검증: locker 미보유 시 URL 직접 접근 거부
  assert.equal(isTabAllowedForCapabilities('lockers', ['booking', 'attendance']), false);
  assert.equal(isTabAllowedForCapabilities('lockers', ['locker']), true);

  // 4-3. 예약(bookings) 가드 검증: booking 또는 seat_room 중 하나라도 있으면 허용
  assert.equal(isTabAllowedForCapabilities('bookings', ['attendance', 'locker']), false);
  assert.equal(isTabAllowedForCapabilities('bookings', ['booking']), true);
  assert.equal(isTabAllowedForCapabilities('bookings', ['seat_room']), true);

  // 4-4. 출결(attendance) 가드 검증
  assert.equal(isTabAllowedForCapabilities('attendance', ['seat_room']), false);
  assert.equal(isTabAllowedForCapabilities('attendance', ['attendance']), true);

  // 4-5. 수납(finance) 가드 검증
  assert.equal(isTabAllowedForCapabilities('finance', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('finance', ['ledger_simple']), true);
  assert.equal(isTabAllowedForCapabilities('finance', ['credit_wallet']), true);

  // 4-6. 신규 12종 확장 Capability 라우트 가드 검증
  assert.equal(isTabAllowedForCapabilities('seat-rooms', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('seat-rooms', ['seat_room']), true);
  assert.equal(isTabAllowedForCapabilities('seat-rooms', ['booking']), true);

  assert.equal(isTabAllowedForCapabilities('rentals', ['booking']), false);
  assert.equal(isTabAllowedForCapabilities('rentals', ['rental_equipment']), true);

  assert.equal(isTabAllowedForCapabilities('shifts', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('shifts', ['shift_schedule']), true);

  assert.equal(isTabAllowedForCapabilities('billing-invoices', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('billing-invoices', ['billing_invoicing']), true);
  assert.equal(isTabAllowedForCapabilities('billing-invoices', ['billing']), true);

  assert.equal(isTabAllowedForCapabilities('consultations', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('consultations', ['consultation_crm']), true);

  assert.equal(isTabAllowedForCapabilities('inventory', ['attendance']), false);
  assert.equal(isTabAllowedForCapabilities('inventory', ['inventory']), true);

  // 4-7. 공통 탭(dashboard, students, settings, account): 제약 없이 항상 허용
  assert.equal(isTabAllowedForCapabilities('dashboard', []), true);
  assert.equal(isTabAllowedForCapabilities('students', []), true);
  assert.equal(isTabAllowedForCapabilities('settings', []), true);
  assert.equal(isTabAllowedForCapabilities('account', []), true);
  console.log('  -> URL 직접 접근 가드 및 비활성 기능 차단 로직 검증 완료');

  console.log('=== [5] Industry Capability Map Runtime Resolution ===');
  // 5-1. 7대 전용 모듈 업종 매핑 검증
  assert.equal(MODULE_INDUSTRY_IDS.length, 7);
  for (const modId of MODULE_INDUSTRY_IDS) {
    const caps = getIndustryCapabilities(modId);
    assert.ok(caps, `${modId}: capabilities 조회 결과 없음`);
    assert.ok(Object.keys(caps).length > 0, `${modId}: capabilities가 비어있음`);
  }
  assert.equal(getIndustryCapabilities('piano').attendance, true);
  assert.equal(getIndustryCapabilities('piano').billing, true);
  assert.equal(getIndustryCapabilities('pilates').booking, true);
  assert.equal(getIndustryCapabilities('retail').commerce, true);

  // 5-2. 일반 프리셋 업종 런타임 해석 검증 (이전에는 빈 객체 {}를 반환하던 문제 해결 검증)
  const studyCafeCaps = getIndustryCapabilities('study_cafe');
  assert.equal(studyCafeCaps.booking, true, 'study_cafe는 공간/좌석 예약 활성화');
  assert.equal(studyCafeCaps.locker, true, 'study_cafe는 락커 활성화');

  const lockerStorageCaps = getIndustryCapabilities('locker_storage');
  assert.equal(lockerStorageCaps.locker, true, 'locker_storage는 락커 활성화');

  const generalAcademyCaps = getIndustryCapabilities('general_academy');
  assert.equal(generalAcademyCaps.roster, true);
  assert.equal(generalAcademyCaps.attendance, true);
  assert.equal(generalAcademyCaps.billing, true);

  const yogaCaps = getIndustryCapabilities('yoga_studio');
  assert.equal(yogaCaps.booking, true);
  console.log('  -> 전용 모듈 및 일반 프리셋 업종의 런타임 Capability 해석 검증 완료');

  console.log('=== [6] Resource Provisioner Parity ===');
  // 6-1. 전용 모듈 리소스 프로비저닝 검증
  const pianoRes = provisionIndustryResources({ industry: 'piano', i18n: mockI18n });
  assert.ok(pianoRes.some((r) => r.name === 'dashboard'));
  assert.ok(pianoRes.some((r) => r.name === 'customers'));
  assert.ok(pianoRes.some((r) => r.name === 'schedules'));
  assert.ok(pianoRes.some((r) => r.name === 'tuition_invoices'));

  // 6-2. 일반 프리셋 리소스 프로비저닝 검증
  const studyCafeRes = provisionIndustryResources({ industry: 'study_cafe', i18n: mockI18n });
  assert.ok(studyCafeRes.some((r) => r.name === 'dashboard'));
  assert.ok(studyCafeRes.some((r) => r.name === 'customers'));
  assert.ok(studyCafeRes.some((r) => r.name === 'lockers'), 'study_cafe에 lockers 리소스가 포함되어야 함');
  assert.ok(studyCafeRes.some((r) => r.name === 'passes'), 'study_cafe에 passes 리소스가 포함되어야 함');

  const saunaRes = provisionIndustryResources({ industry: 'sauna_jjimjilbang', i18n: mockI18n });
  assert.ok(saunaRes.some((r) => r.name === 'credit_wallets'), 'sauna_jjimjilbang에 credit_wallets 리소스가 포함되어야 함');

  const lockerRes = provisionIndustryResources({ industry: 'locker_storage', i18n: mockI18n });
  assert.ok(lockerRes.some((r) => r.name === 'lockers'), 'locker_storage에 lockers 리소스가 포함되어야 함');

  console.log('  -> Refine 리소스 동적 프로비저닝 일관성 검증 완료');

  console.log('=== [7] Industry Implementation Tiers Integrity ===');
  // 44개 프리셋이 4대 구현 티어 중 하나로 정확하게 분류되는지 확인
  // Tier 1: 7대 전용 특화 모듈 (Dedicated Modules)
  const TIER1_MODULES = new Set([
    'piano',
    'pilates',
    'gym_fitness',
    'daycare',
    'skin_clinic',
    'retail',
    'sauna_jjimjilbang',
  ]);
  // Tier 2: 확장형 공통 셸 + 활성 Capability 뷰 (Generic Shell + Active CRUD/Views)
  const TIER2_GENERIC_ACTIVE = new Set([
    'general_academy',
    'language_academy',
    'art_academy',
    'taekwondo_academy',
    'dance_academy',
    'coding_academy',
    'exam_tutoring',
    'yoga_studio',
    'pt_fitness',
    'indoor_golf',
    'swim_school',
    'climbing_activity',
    'boxing_mma',
    'hair_salon',
    'barber_shop',
    'nail_salon',
    'massage_spa',
    'study_cafe',
    'shared_office',
    'space_rental',
    'locker_storage',
  ]);
  // Tier 3: 도메인 엔진 및 스키마 구현 완료, UI 화면 연기 / 대시보드 안전 폴백
  const TIER3_DOMAIN_SCHEMA_DEFERRED = new Set([
    'tattoo_studio',
    'photo_studio',
    'pet_grooming',
    'guesthouse',
    'small_hotel',
    'auto_repair',
    'self_carwash',
    'cleaning_service',
    'pet_hotel',
    'equipment_rental',
    'craft_repair',
    'apparel_store',
  ]);
  // Tier 4: 카탈로그 & 커머스/외식 메타데이터 프리셋
  const TIER4_COMMERCE_CATALOG = new Set([
    'convenience_store',
    'pet_supplies',
    'cafe',
    'restaurant',
  ]);

  for (const preset of presets) {
    const isTier1 = TIER1_MODULES.has(preset.id as any);
    const isTier2 = TIER2_GENERIC_ACTIVE.has(preset.id);
    const isTier3 = TIER3_DOMAIN_SCHEMA_DEFERRED.has(preset.id);
    const isTier4 = TIER4_COMMERCE_CATALOG.has(preset.id);

    const matches = [isTier1, isTier2, isTier3, isTier4].filter(Boolean).length;
    assert.equal(
      matches,
      1,
      `${preset.id}: 4대 구현 티어 중 정확히 1개에만 매핑되어야 합니다 (현재 매핑 수: ${matches})`
    );
  }

  console.log('  -> 44개 프리셋 4대 티어 단일 분류 및 검증 완료');
  console.log('\n[PASS] preset-capability-runtime-parity.test.ts: 모든 검증 성공');
}

run();
