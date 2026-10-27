import assert from 'node:assert/strict';
import {
  validateLeadStatusTransition,
  calculateFunnelMetrics,
  groupLeadsByStatus,
  buildConsultationFromLead,
  buildCustomerFromLead,
  canConvertLead,
  type TrialLead,
} from './trialFunnelEngine';

console.log('[test:trial-funnel] starting test suite...');

// 1. 상태 전이 검증
{
  // 정상: 신규 -> 상담예약
  const t1 = validateLeadStatusTransition('new_inquiry', 'consult_scheduled');
  assert.equal(t1.allowed, true);

  // 이탈 시 사유 누락 차단
  const t2 = validateLeadStatusTransition('new_inquiry', 'dropped', { drop_reason: '' });
  assert.equal(t2.allowed, false);
  assert.ok(t2.error?.includes('이탈 사유'));

  // 이탈 시 사유 제공 시 허용
  const t3 = validateLeadStatusTransition('new_inquiry', 'dropped', { drop_reason: '거리 멀음' });
  assert.equal(t3.allowed, true);

  // 체험 없이 신규에서 바로 등록 전환 차단
  const t4 = validateLeadStatusTransition('new_inquiry', 'converted', { converted_pass_id: 'pass-1' });
  assert.equal(t4.allowed, false);

  // 체험 완료 후 이용권 ID 누락 시 등록 전환 차단
  const t5 = validateLeadStatusTransition('trial_attended', 'converted');
  assert.equal(t5.allowed, false);

  // 체험 완료 후 이용권 ID 포함 시 등록 전환 성공
  const t6 = validateLeadStatusTransition('trial_attended', 'converted', { converted_pass_id: 'pass-123' });
  assert.equal(t6.allowed, true);
}
console.log('✓ 1. 리드 상태 전이 및 필수 필드 가드 검증 통과');

// 2. 퍼널 통계 계산 검증
{
  const mockLeads: TrialLead[] = [
    {
      id: 'l1',
      organization_id: 'org1',
      customer_name: '홍길동',
      phone: '01011112222',
      source: 'instagram',
      status: 'converted',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    {
      id: 'l2',
      organization_id: 'org1',
      customer_name: '김철수',
      phone: '01022223333',
      source: 'naver',
      status: 'converted',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    {
      id: 'l3',
      organization_id: 'org1',
      customer_name: '이영희',
      phone: '01033334444',
      source: 'referral',
      status: 'trial_attended',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    {
      id: 'l4',
      organization_id: 'org1',
      customer_name: '박민수',
      phone: '01044445555',
      source: 'walk_in',
      status: 'consult_scheduled',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    {
      id: 'l5',
      organization_id: 'org1',
      customer_name: '최동욱',
      phone: '01055556666',
      source: 'other',
      status: 'dropped',
      drop_reason: '시간표 불일치',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
  ];

  const metrics = calculateFunnelMetrics(mockLeads);
  assert.equal(metrics.totalLeads, 5);
  assert.equal(metrics.converted, 2);
  assert.equal(metrics.trialAttended, 1);
  assert.equal(metrics.consultScheduled, 1);
  assert.equal(metrics.dropped, 1);
  // 전체 전환율: 2/5 = 40%
  assert.equal(metrics.overallConversionRate, 40.0);
  // 체험 후 전환율: 2 / (1 + 2) = 66.7%
  assert.equal(metrics.trialToConvertRate, 66.7);

  const grouped = groupLeadsByStatus(mockLeads);
  assert.equal(grouped.converted.length, 2);
  assert.equal(grouped.trial_attended.length, 1);
  assert.equal(grouped.consult_scheduled.length, 1);
  assert.equal(grouped.dropped.length, 1);
}
console.log('✓ 2. 퍼널 전환율 지표 산출 및 그룹화 검증 통과');

// 3. 상담 CRM 및 고객 전환 브릿지 생성 검증
{
  const lead: TrialLead = {
    id: 'lead-999',
    organization_id: 'org1',
    customer_name: '이지은',
    phone: '01099998888',
    source: 'instagram',
    status: 'consult_scheduled',
    target_program: '고급 보컬 레슨',
    notes: '주말 오후 수업 희망',
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
  };

  const consultPayload = buildConsultationFromLead(lead, { consultationDate: '2026-10-20' });
  assert.equal(consultPayload.customer_id, 'lead-999');
  assert.equal(consultPayload.type, 'trial_inquiry');
  assert.equal(consultPayload.consultation_date, '2026-10-20');
  assert.match(consultPayload.content, /이지은/);
  assert.match(consultPayload.content, /고급 보컬 레슨/);

  const customerPayload = buildCustomerFromLead(lead);
  assert.equal(customerPayload.name, '이지은');
  assert.equal(customerPayload.phone, '01099998888');
  assert.equal(customerPayload.status, 'active');
  assert.equal(customerPayload.metadata.lead_id, 'lead-999');
  assert.match(customerPayload.memo, /리드 파이프라인 전환/);
}
console.log('✓ 3. 상담 CRM 및 고객 전환 브릿지 생성 검증 통과');

// 4. canConvertLead 검증
{
  assert.equal(canConvertLead('trial_attended'), true);
  assert.equal(canConvertLead('consult_scheduled'), true);
  assert.equal(canConvertLead('VISITED'), true);
  assert.equal(canConvertLead('CONSULTED'), true);
  assert.equal(canConvertLead('new_inquiry'), false);
  assert.equal(canConvertLead('APPLIED'), false);
  assert.equal(canConvertLead('converted'), false);
  assert.equal(canConvertLead('CONVERTED'), false);
  assert.equal(canConvertLead('dropped'), false);
  assert.equal(canConvertLead('LOST'), false);
}
console.log('✓ 4. canConvertLead 상태 판정 검증 통과');

console.log('[test:trial-funnel] ALL TESTS PASSED! (100%)');
