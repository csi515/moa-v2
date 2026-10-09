/**
 * 40대 전방위 업종 프리셋 조립 엔진 무결성 단위 테스트
 * 실행: npx tsx src/app/presets/presetAssembler.test.ts
 */

import assert from 'node:assert/strict';
import {
  INDUSTRY_PRESETS,
  listIndustryPresets,
} from './presetRegistry';
import {
  assemblePreset,
  assembleAdHocCapabilities,
} from './presetAssembler';
import type { PresetCapabilityId } from '@/core/presets/types';

function run() {
  const presets = listIndustryPresets();
  assert.ok(presets.length >= 40, `최소 40개 업종 프리셋이 등록되어야 합니다. 현재: ${presets.length}`);

  // 40개 대표 업종 ID 목록 검증
  const REQUIRED_40_PRESET_IDS = [
    // Group 1: 학원·교육 (8종)
    'piano',
    'general_academy',
    'language_academy',
    'art_academy',
    'taekwondo_academy',
    'dance_academy',
    'coding_academy',
    'exam_tutoring',
    // Group 2: 체육·피트니스 (8종)
    'pilates',
    'yoga_studio',
    'gym_fitness',
    'pt_fitness',
    'indoor_golf',
    'swim_school',
    'climbing_activity',
    'boxing_mma',
    // Group 3: 뷰티·웰빙 (8종)
    'hair_salon',
    'barber_shop',
    'nail_salon',
    'skin_clinic',
    'massage_spa',
    'tattoo_studio',
    'photo_studio',
    'pet_grooming',
    // Group 4: 공간·대여·숙박 (6종)
    'study_cafe',
    'shared_office',
    'space_rental',
    'locker_storage',
    'guesthouse',
    'small_hotel',
    // Group 5: 도소매·외식 (6종)
    'retail',
    'apparel_store',
    'convenience_store',
    'pet_supplies',
    'cafe',
    'restaurant',
    // Group 6: 생활서비스·정비·특수 (4종)
    'auto_repair',
    'cleaning_service',
    'pet_hotel',
    'equipment_rental',
  ];

  for (const requiredId of REQUIRED_40_PRESET_IDS) {
    assert.ok(
      INDUSTRY_PRESETS[requiredId],
      `필수 40대 업종 프리셋 [${requiredId}]가 누락되었습니다.`
    );
  }

  // 모든 등록된 프리셋에 대해 조립 무결성 전수 검증
  for (const preset of presets) {
    const assembled = assemblePreset(preset.id);

    // 1. 프리셋 메타데이터 및 Capability 목록 검증
    assert.equal(assembled.preset.id, preset.id);
    assert.ok(assembled.capabilities.length > 0, `${preset.id}: Capability 목록이 비어있음`);
    assert.deepEqual(assembled.capabilities, preset.capabilities);

    // 2. setupSchema 누락 없는 결합 검증
    assert.equal(
      assembled.setupSchemas.length,
      preset.capabilities.length,
      `${preset.id}: 구성된 capability 개수만큼 setupSchema가 병합되어야 함`
    );
    for (const capId of preset.capabilities) {
      const foundSchema = assembled.setupSchemas.find((s) => s.capabilityId === capId);
      assert.ok(foundSchema, `${preset.id}: capability [${capId}]의 setupSchema 누락`);
      assert.ok(foundSchema.fields.length > 0, `${preset.id}: [${capId}] 필드가 비어있음`);
    }

    // 3. resources 누락 없는 결합 검증
    assert.ok(
      assembled.resources.length >= preset.capabilities.length,
      `${preset.id}: 구성된 capability 수 이상의 리소스가 병합되어야 함`
    );

    // 4. allFields 고유 필드 집합 검증
    assert.ok(assembled.allFields.length > 0);
    const seenIds = new Set<string>();
    for (const f of assembled.allFields) {
      assert.equal(seenIds.has(f.id), false, `중복 필드 키 발견: ${f.id}`);
      seenIds.add(f.id);
    }

    // 5. 완성도 수준(readinessLevel) 유효성 검증
    if (preset.readinessLevel) {
      assert.ok(
        ['configured', 'basic_ui', 'workflow', 'persisted', 'isolated', 'verified'].includes(
          preset.readinessLevel
        ),
        `${preset.id}: 유효하지 않은 readinessLevel ${preset.readinessLevel}`
      );
    }
  }

  // 6. ad-hoc 임의 조합 테스트
  const adHoc = assembleAdHocCapabilities(['seat_room', 'credit_wallet']);
  assert.equal(adHoc.setupSchemas.length, 2);
  assert.equal(adHoc.resources.length, 2);
  assert.ok(adHoc.resources.some((r) => r.name === 'seat_rooms'));
  assert.ok(adHoc.resources.some((r) => r.name === 'credit_wallets'));

  // 7. 존재하지 않는 프리셋 에러 방어
  assert.throws(() => {
    assemblePreset('unknown_preset_123');
  }, /미등록된 업종 프리셋 ID/);

  console.log(`presetAssembler.test.ts: ok (${presets.length} industry presets verified successfully)`);
}

run();
