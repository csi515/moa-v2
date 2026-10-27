import assert from 'node:assert/strict';
import {
  type WorkplacePolicy,
  type PolicyAcknowledgement,
  checkPendingMandatoryPolicies,
  calculatePolicyComplianceRate,
  isPolicyAcknowledged,
  getNextPolicyVersion,
  identifyNonCompliantStaffAlerts,
} from './policyEngine';

async function runTests() {
  console.log('Running workplace policyEngine unit tests...');

  const mockPolicies: WorkplacePolicy[] = [
    {
      id: 'pol-1',
      organizationId: 'org-1',
      title: '고객 응대 및 서비스 복무 수칙',
      category: 'service_code',
      content: '고객에게 항상 친절하게 응대하고 지정 유니폼을 착용합니다.',
      version: 1,
      isMandatory: true,
      effectiveDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'pol-2',
      organizationId: 'org-1',
      title: '매장 화재 및 비상 안전 대피 수칙',
      category: 'safety_rule',
      content: '비상구 앞 적치물 금지 및 소화기 위치를 숙지합니다.',
      version: 2, // v2 개정본
      isMandatory: true,
      effectiveDate: '2026-06-01',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'pol-3',
      organizationId: 'org-1',
      title: '직원 휴게실 자율 이용 에티켓 (권장)',
      category: 'dormitory_rule',
      content: '취식 후 깨끗이 정리합니다.',
      version: 1,
      isMandatory: false, // 비필수 권장사항
      effectiveDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  // 1. 신규 입사자 (서약 이력 0건)
  const newStaffId = 'staff-newbie';
  const newStaffAcks: PolicyAcknowledgement[] = [];

  const newStaffResult = checkPendingMandatoryPolicies(newStaffId, mockPolicies, newStaffAcks);
  assert.equal(newStaffResult.hasPendingMandatory, true);
  assert.equal(newStaffResult.totalMandatoryCount, 2);
  assert.equal(newStaffResult.acknowledgedCount, 0);
  assert.equal(newStaffResult.pendingPolicies.length, 2);
  assert.equal(newStaffResult.pendingPolicies[0].id, 'pol-1');
  assert.equal(newStaffResult.pendingPolicies[1].id, 'pol-2');

  // 2. 사규 1건 서약 완료
  const partialAcks: PolicyAcknowledgement[] = [
    {
      id: 'ack-1',
      organizationId: 'org-1',
      policyId: 'pol-1',
      policyVersion: 1,
      staffId: newStaffId,
      acknowledgedAt: '2026-10-16T10:00:00Z',
      signatureDataUrl: 'data:image/svg+xml;utf8,<svg>sig</svg>',
    },
  ];

  const partialResult = checkPendingMandatoryPolicies(newStaffId, mockPolicies, partialAcks);
  assert.equal(partialResult.hasPendingMandatory, true);
  assert.equal(partialResult.acknowledgedCount, 1);
  assert.equal(partialResult.pendingPolicies.length, 1);
  assert.equal(partialResult.pendingPolicies[0].id, 'pol-2');

  // 3. 개정 사규 재서약 감지 시나리오: pol-2의 v1에만 서약한 기존 직원
  const seniorStaffId = 'staff-senior';
  const seniorAcks: PolicyAcknowledgement[] = [
    {
      id: 'ack-2',
      organizationId: 'org-1',
      policyId: 'pol-1',
      policyVersion: 1,
      staffId: seniorStaffId,
      acknowledgedAt: '2026-01-02T10:00:00Z',
      signatureDataUrl: 'data:image/svg+xml;utf8,<svg>senior-sig-1</svg>',
    },
    {
      id: 'ack-3',
      organizationId: 'org-1',
      policyId: 'pol-2',
      policyVersion: 1, // 구버전 v1 서약
      staffId: seniorStaffId,
      acknowledgedAt: '2026-01-02T10:00:00Z',
      signatureDataUrl: 'data:image/svg+xml;utf8,<svg>senior-sig-2</svg>',
    },
  ];

  // pol-2는 현재 version이 2이므로, 구버전 v1 서약자는 v2 미서약 상태로 감지되어야 함!
  const seniorResult = checkPendingMandatoryPolicies(seniorStaffId, mockPolicies, seniorAcks);
  assert.equal(seniorResult.hasPendingMandatory, true, 'Senior must re-acknowledge revised policy v2');
  assert.equal(seniorResult.acknowledgedCount, 1);
  assert.equal(seniorResult.pendingPolicies.length, 1);
  assert.equal(seniorResult.pendingPolicies[0].id, 'pol-2');
  assert.equal(seniorResult.pendingPolicies[0].version, 2);

  // 4. 전 매장 준수율 계산 (Compliance Rate)
  const staffList = [newStaffId, seniorStaffId];
  // newStaff: pol-1 완료(1), pol-2 미완료(0) -> 1/2
  // seniorStaff: pol-1 완료(1), pol-2 v1(0) -> 1/2
  // 총 필수 서약 4건 중 2건 완료 -> 50%
  const allAcks = [...partialAcks, ...seniorAcks];
  const rateResult = calculatePolicyComplianceRate(staffList, mockPolicies, allAcks);

  assert.equal(rateResult.totalRequired, 4);
  assert.equal(rateResult.completedCount, 2);
  assert.equal(rateResult.complianceRatePercent, 50);
  assert.deepEqual(rateResult.nonCompliantStaffIds, [newStaffId, seniorStaffId]);

  // senior가 v2에 서약하면 준수율 상승
  const updatedAcks: PolicyAcknowledgement[] = [
    ...allAcks,
    {
      id: 'ack-4',
      organizationId: 'org-1',
      policyId: 'pol-2',
      policyVersion: 2,
      staffId: seniorStaffId,
      acknowledgedAt: '2026-10-16T12:00:00Z',
      signatureDataUrl: 'data:image/svg+xml;utf8,<svg>senior-sig-v2</svg>',
    },
  ];

  const updatedRateResult = calculatePolicyComplianceRate(staffList, mockPolicies, updatedAcks);
  assert.equal(updatedRateResult.completedCount, 3);
  assert.equal(updatedRateResult.complianceRatePercent, 75);
  assert.deepEqual(updatedRateResult.nonCompliantStaffIds, [newStaffId]);

  // 5. getNextPolicyVersion
  assert.equal(getNextPolicyVersion(1), 2);
  assert.equal(getNextPolicyVersion(2), 3);

  // 6. [인사/준법] 취업규칙 및 NDA 미서약 독촉 알림 대상 산출 검증
  const hrPolicies: WorkplacePolicy[] = [
    {
      id: 'pol-hr-1',
      organizationId: 'org-1',
      title: '사업장 표준 취업규칙',
      category: 'employment_terms',
      content: '근로시간 및 휴게, 복무 규정',
      version: 1,
      isMandatory: true,
      effectiveDate: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'pol-hr-2',
      organizationId: 'org-1',
      title: '영업비밀 및 지식재산권 비밀유지서약서(NDA)',
      category: 'nda_confidentiality',
      content: '기밀 누설 금지 및 퇴직 후 경업 금지',
      version: 1,
      isMandatory: true,
      effectiveDate: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const hrAcks: PolicyAcknowledgement[] = [
    {
      id: 'ack-hr-1',
      organizationId: 'org-1',
      policyId: 'pol-hr-1',
      policyVersion: 1,
      staffId: 'staff-signed',
      acknowledgedAt: '2026-01-02T09:00:00Z',
      signatureDataUrl: 'data:mock',
    },
  ];

  const alerts = identifyNonCompliantStaffAlerts(hrPolicies, hrAcks, ['staff-signed', 'staff-uncompleted']);
  assert.equal(alerts.length, 2);

  // staff-signed는 NDA 1건 미서약 -> urgency: 'high'
  const signedStaffAlert = alerts.find((a) => a.staffId === 'staff-signed');
  assert.ok(signedStaffAlert);
  assert.equal(signedStaffAlert.missingPolicyIds.length, 1);
  assert.equal(signedStaffAlert.missingPolicyIds[0], 'pol-hr-2');
  assert.equal(signedStaffAlert.urgency, 'high');

  // staff-uncompleted는 2건 모두 미서약 -> urgency: 'high'
  const uncompletedAlert = alerts.find((a) => a.staffId === 'staff-uncompleted');
  assert.ok(uncompletedAlert);
  assert.equal(uncompletedAlert.missingPolicyIds.length, 2);
  assert.equal(uncompletedAlert.urgency, 'high');

  console.log('workplace policyEngine tests passed successfully!');
}

void runTests();
