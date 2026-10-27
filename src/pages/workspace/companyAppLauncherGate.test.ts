/**
 * 기업 런처 타일 게이트 검증.
 * 실행: npx tsx src/pages/workspace/companyAppLauncherGate.test.ts
 */
import assert from 'node:assert/strict';
import { INDUSTRY_PRESETS } from '@/app/presets/presetRegistry';
import { resolveEnabledCaps, tileAllowed } from './CompanyAppLauncherDashboard';

// personal_plant_ops (EP_apps) 프리셋이 완전 제거되었음을 검증
assert.equal(INDUSTRY_PRESETS.personal_plant_ops, undefined, 'personal_plant_ops 프리셋은 제거되어야 함');

const enterprise = INDUSTRY_PRESETS.general_enterprise;
assert.ok(enterprise, 'general_enterprise 프리셋이 등록되어 있어야 함');

const enabled = resolveEnabledCaps(
  'general_enterprise',
  [],
  [],
  []
);

assert.ok(enabled.includes('approval_workflow'));
assert.ok(enabled.includes('mbo'));
assert.ok(enabled.includes('task_pipeline'));
assert.ok(enabled.includes('workplace_policy'));
assert.ok(enabled.includes('feedbacks'));
assert.ok(enabled.includes('billing_invoicing'));

assert.equal(tileAllowed({ requiredAnyCapability: ['vehicle_shuttle'] } as never, enabled), false);
assert.equal(tileAllowed({ requiredAnyCapability: ['approval_workflow'] } as never, enabled), true);
assert.equal(tileAllowed({ requiredAnyCapability: ['booking', 'seat_room'] } as never, enabled), true);

const rndEnabled = resolveEnabledCaps(
  'rnd_lab_management',
  [],
  [],
  []
);
assert.ok(rndEnabled.includes('research_project'));
assert.ok(rndEnabled.includes('sop_risk_assessment'));
assert.equal(
  tileAllowed({ requiredAnyCapability: ['research_project'] } as never, rndEnabled, false),
  false,
  'R&D tile blocked without portal access'
);
assert.equal(
  tileAllowed({ requiredAnyCapability: ['research_project'] } as never, rndEnabled, true),
  true,
  'R&D tile allowed with portal access'
);

assert.equal(enterprise.readinessLevel, 'basic_ui');

console.log('companyAppLauncherGate.test.ts: ok');
