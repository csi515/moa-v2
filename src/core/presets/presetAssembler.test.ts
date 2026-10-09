/**
 * 프리셋 조립 엔진 및 8대 업종 프리셋 무결성 단위 테스트
 * 실행: npx tsx src/core/presets/presetAssembler.test.ts
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
import type { PresetCapabilityId } from './types';

function run() {
  const presets = listIndustryPresets();
  assert.equal(presets.length, 8, '8개 신규 업종 프리셋이 모두 등록되어야 합니다.');

  // 기대되는 8개 프리셋과 구성 capability 매핑
  const expectedPresets: Record<string, readonly PresetCapabilityId[]> = {
    study_cafe: ['seat_room', 'passes', 'locker', 'maintenance_checklist'],
    indoor_golf: ['passes', 'booking', 'locker', 'rental_equipment', 'ledger_simple'],
    pt_fitness: ['passes', 'booking', 'instructor_match', 'consultation_crm', 'locker'],
    hair_salon: ['booking', 'treatment_chart', 'shift_schedule', 'ledger_simple'],
    craft_repair: ['task_pipeline', 'inventory', 'booking', 'ledger_simple'],
    general_academy: ['attendance', 'billing_invoicing', 'consultation_crm', 'passes'],
    climbing_activity: ['passes', 'attendance', 'rental_equipment', 'safety_consent', 'locker'],
    self_carwash: ['credit_wallet', 'maintenance_checklist', 'inventory'],
  };

  for (const [presetId, expectedCaps] of Object.entries(expectedPresets)) {
    const assembled = assemblePreset(presetId);

    // 1. 프리셋 메타데이터 및 Capability 목록 검증
    assert.equal(assembled.preset.id, presetId);
    assert.deepEqual(assembled.capabilities, expectedCaps, `${presetId} capability 조합 불일치`);

    // 2. setupSchema 누락 없는 결합 검증
    assert.equal(
      assembled.setupSchemas.length,
      expectedCaps.length,
      `${presetId}: 구성된 capability 개수만큼 setupSchema가 병합되어야 함`
    );
    for (const capId of expectedCaps) {
      const foundSchema = assembled.setupSchemas.find((s) => s.capabilityId === capId);
      assert.ok(foundSchema, `${presetId}: capability [${capId}]의 setupSchema 누락`);
      assert.ok(foundSchema.fields.length > 0, `${presetId}: [${capId}] 필드가 비어있음`);
    }

    // 3. resources 누락 없는 결합 검증
    assert.ok(
      assembled.resources.length >= expectedCaps.length,
      `${presetId}: 구성된 capability 수 이상의 리소스가 병합되어야 함`
    );

    // 4. allFields 고유 필드 집합 검증
    assert.ok(assembled.allFields.length > 0);
    const seenIds = new Set<string>();
    for (const f of assembled.allFields) {
      assert.equal(seenIds.has(f.id), false, `중복 필드 키 발견: ${f.id}`);
      seenIds.add(f.id);
    }
  }

  // 5. ad-hoc 임의 조합 테스트
  const adHoc = assembleAdHocCapabilities(['seat_room', 'credit_wallet']);
  assert.equal(adHoc.setupSchemas.length, 2);
  assert.equal(adHoc.resources.length, 2);
  assert.ok(adHoc.resources.some((r) => r.name === 'seat_rooms'));
  assert.ok(adHoc.resources.some((r) => r.name === 'credit_wallets'));

  // 6. 존재하지 않는 프리셋 에러 방어
  assert.throws(() => {
    assemblePreset('unknown_preset_123');
  }, /미등록된 업종 프리셋 ID/);

  console.log('presetAssembler.test.ts: ok (8 industry presets verified)');
}

run();
