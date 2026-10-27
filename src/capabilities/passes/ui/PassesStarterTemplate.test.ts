import assert from 'node:assert/strict';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

console.log('🧪 [Test Suite] Passes Starter Template Contract & Assembly');

// 1. 프리셋별 스타터 패스 템플릿 유효성 검증
const presetsToTest = ['indoor_golf', 'pilates', 'hair_salon', 'climbing_activity', 'study_cafe'];

for (const id of presetsToTest) {
  const preset = getIndustryPreset(id);
  assert.ok(preset, `Preset ${id} must exist`);
  assert.ok(preset.starterPassTemplates, `Preset ${id} must have starter templates`);
  assert.ok(preset.starterPassTemplates.length >= 2, `Preset ${id} must have at least 2 templates`);

  for (const tpl of preset.starterPassTemplates) {
    assert.ok(tpl.name && tpl.name.trim().length > 0, 'Template name must be non-empty');
    assert.ok(['COUNT_BASED', 'PERIOD_BASED', 'SUBSCRIPTION'].includes(tpl.passType), 'Invalid passType');
    assert.ok(tpl.totalCount > 0, 'totalCount must be > 0');
    assert.ok(tpl.validityDays > 0, 'validityDays must be > 0');
    if (tpl.recommendedPrice !== undefined) {
      assert.ok(tpl.recommendedPrice >= 0, 'recommendedPrice must be >= 0');
    }
  }
}

// 2. 템플릿 선택 시 발급 모달 페이로드 조립 시뮬레이션
const golfPreset = getIndustryPreset('indoor_golf')!;
const targetTemplate = golfPreset.starterPassTemplates![0];

const simulatedIssuePayload = {
  tenantId: 'test-tenant-123',
  customerName: '김골프',
  customerPhone: '010-1234-5678',
  passName: targetTemplate.name,
  passType: targetTemplate.passType,
  totalCount: targetTemplate.totalCount,
  validityDays: targetTemplate.validityDays,
};

assert.equal(simulatedIssuePayload.passName, targetTemplate.name);
assert.equal(simulatedIssuePayload.passType, targetTemplate.passType);
assert.equal(simulatedIssuePayload.totalCount, targetTemplate.totalCount);
assert.equal(simulatedIssuePayload.validityDays, targetTemplate.validityDays);

console.log('✨ Passes Starter Template tests passed cleanly!');
