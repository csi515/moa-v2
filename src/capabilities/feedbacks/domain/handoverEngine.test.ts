/**
 * 현장 소통 및 교대 인수인계 순수 도메인 엔진 단위 테스트
 */

import assert from 'node:assert';
import {
  calculateChecklistProgress,
  canConfirmHandover,
  summarizeFeedbacks,
  countUnresolvedIncidents,
  transitionGrievanceStage,
  summarizeGrievanceMetrics,
  type HandoverNote,
  type FeedbackItem,
  type IncidentLog,
} from './handoverEngine';

console.log('[test:handover-engine] starting test suite...');

// 1. 체크리스트 진행률 계산 검증
{
  const emptyRes = calculateChecklistProgress([]);
  assert.strictEqual(emptyRes.percentage, 100);
  assert.strictEqual(emptyRes.isAllCompleted, true);

  const items = [
    { id: '1', label: '금고 시재 마감 확인', checked: true },
    { id: '2', label: '쓰레기통 비우기', checked: false },
    { id: '3', label: '출입문 도어락 잠금', checked: true },
  ];
  const res = calculateChecklistProgress(items);
  assert.strictEqual(res.total, 3);
  assert.strictEqual(res.completed, 2);
  assert.strictEqual(res.percentage, 67);
  assert.strictEqual(res.isAllCompleted, false);
}
console.log('✓ 1. 체크리스트 진행률 계산 검증 완료');

// 2. 인수인계 확인 가드 검증
{
  const baseNote: HandoverNote = {
    id: 'note-1',
    organization_id: 'org-1',
    shift_date: '2026-10-16',
    shift_type: 'morning',
    writer_staff_id: 'staff-writer',
    content: '오전 특이사항 없음',
    checklist_items: [
      { id: '1', label: '체크1', checked: true },
      { id: '2', label: '체크2', checked: true },
    ],
  };

  // 1) 작성자 본인의 셀프 확인 차단
  const selfRes = canConfirmHandover(baseNote, 'staff-writer');
  assert.strictEqual(selfRes.canConfirm, false);
  assert.ok(selfRes.reason?.includes('작성자 본인'));

  // 2) 체크리스트 미완료 상태 차단
  const incompleteNote: HandoverNote = {
    ...baseNote,
    checklist_items: [{ id: '1', label: '체크1', checked: false }],
  };
  const incRes = canConfirmHandover(incompleteNote, 'staff-next');
  assert.strictEqual(incRes.canConfirm, false);
  assert.ok(incRes.reason?.includes('체크리스트'));

  // 3) 정상 확인 성공
  const okRes = canConfirmHandover(baseNote, 'staff-next');
  assert.strictEqual(okRes.canConfirm, true);

  // 4) 이미 확인된 노트 중복 확인 차단
  const confirmedNote: HandoverNote = {
    ...baseNote,
    confirmed_by_next_shift_staff_id: 'staff-next',
    confirmed_at: '2026-10-16T12:00:00Z',
  };
  const dupRes = canConfirmHandover(confirmedNote, 'staff-third');
  assert.strictEqual(dupRes.canConfirm, false);
  assert.ok(dupRes.reason?.includes('이미'));
}
console.log('✓ 2. 인수인계 확인 가드 검증 완료');

// 3. VOC 및 건의함 집계 검증
{
  const feedbacks: FeedbackItem[] = [
    {
      id: 'fb-1',
      organization_id: 'org-1',
      author_type: 'customer',
      title: '에어컨이 너무 추워요',
      content: '온도 조절 부탁드립니다',
      status: 'open',
      is_internal_only: false,
      created_at: '2026-10-16T10:00:00Z',
    },
    {
      id: 'fb-2',
      organization_id: 'org-1',
      author_type: 'staff',
      title: '휴게실 정수기 필터 교체 제안',
      content: '정수기 필터 교체 주기 도래',
      status: 'in_progress',
      is_internal_only: true,
      created_at: '2026-10-16T11:00:00Z',
    },
    {
      id: 'fb-3',
      organization_id: 'org-1',
      author_type: 'customer',
      title: '선생님 친절해서 좋아요',
      content: '칭찬합니다',
      status: 'resolved',
      is_internal_only: false,
      created_at: '2026-10-15T15:00:00Z',
    },
  ];

  const summary = summarizeFeedbacks(feedbacks);
  assert.strictEqual(summary.total, 3);
  assert.strictEqual(summary.openCount, 1);
  assert.strictEqual(summary.inProgressCount, 1);
  assert.strictEqual(summary.resolvedCount, 1);
  assert.strictEqual(summary.customerVocCount, 2);
  assert.strictEqual(summary.staffIdeaCount, 1);
}
console.log('✓ 3. VOC 및 건의함 집계 검증 완료');

// 4. 안전사고 미해결 건수 및 중증도 집계 검증
{
  const incidents: IncidentLog[] = [
    {
      id: 'inc-1',
      organization_id: 'org-1',
      occurred_at: '2026-10-16T09:00:00Z',
      severity: 'critical',
      title: '계단 미끄러짐 찰과상',
      description: '물기 청소 중 미끄러짐',
      is_resolved: false,
    },
    {
      id: 'inc-2',
      organization_id: 'org-1',
      occurred_at: '2026-10-16T10:00:00Z',
      severity: 'minor',
      title: '연습실 문 손잡이 헐거움',
      description: '나사 조임 필요',
      is_resolved: false,
    },
    {
      id: 'inc-3',
      organization_id: 'org-1',
      occurred_at: '2026-10-15T09:00:00Z',
      severity: 'moderate',
      title: '정수기 누수',
      description: '밸브 잠금 조치 완료',
      is_resolved: true,
    },
  ];

  const incRes = countUnresolvedIncidents(incidents);
  assert.strictEqual(incRes.totalUnresolved, 2);
  assert.strictEqual(incRes.criticalCount, 1);
  assert.strictEqual(incRes.minorCount, 1);
  assert.strictEqual(incRes.moderateCount, 0); // moderate는 is_resolved=true이므로 제외
}
console.log('✓ 4. 안전사고 미해결 건수 집계 검증 완료');

// 5. [ISO 45003] 고충 처리 단계 전이 및 권한 검증
{
  const grievance: FeedbackItem = {
    id: 'grv-1',
    organization_id: 'org-1',
    author_type: 'staff',
    author_id: 'anonymous-reporter',
    title: '직무 스트레스 및 연장근로 과다 고충',
    content: '공정 일정 촉박으로 인한 휴게시간 미준수',
    status: 'open',
    is_internal_only: true,
    created_at: '2026-10-17T09:00:00Z',
    category: 'grievance_stress',
    is_anonymous: true,
    confidentiality_level: 'hr_committee_only',
    grievance_stage: 'received',
  };

  // 일반 직원은 전이 불가
  const staffFail = transitionGrievanceStage(grievance, 'investigating', {
    actorRole: 'staff',
  });
  assert.strictEqual(staffFail.success, false);
  assert.ok(staffFail.reason?.includes('인사담당자 또는 위원회 위원'));

  // HR 관리자가 조사 단계로 전이
  const hrSuccess = transitionGrievanceStage(grievance, 'investigating', {
    actorRole: 'hr_manager',
    note: '현장 관리자 면담 일정 수립',
  });
  assert.strictEqual(hrSuccess.success, true);
  assert.strictEqual(hrSuccess.item?.grievance_stage, 'investigating');
  assert.strictEqual(hrSuccess.item?.status, 'in_progress');
  assert.strictEqual(hrSuccess.item?.committee_notes?.length, 1);

  // 위원회 심의 거쳐 조치 완료로 전이
  const actionDone = transitionGrievanceStage(hrSuccess.item!, 'action_taken', {
    actorRole: 'committee_member',
    note: '휴게시간 보장 및 파트타임 충원 결정',
    actionSummary: '교대조 1명 추가 배치 및 휴게시간 강제 알람 도입',
  });
  assert.strictEqual(actionDone.success, true);
  assert.strictEqual(actionDone.item?.grievance_stage, 'action_taken');
  assert.strictEqual(actionDone.item?.status, 'resolved');
  assert.ok(actionDone.item?.action_taken_summary);

  console.log('✓ 5. [ISO 45003] 고충 처리 단계 전이 및 권한 가드 검증 완료');
}

// 6. [ISO 45003] 인사 고충 및 익명 상담 집계 통계 검증
{
  const items: FeedbackItem[] = [
    {
      id: 'f-1',
      organization_id: 'org-1',
      author_type: 'staff',
      title: '고충 1',
      content: '직장 내 괴롭힘',
      status: 'in_progress',
      is_internal_only: true,
      created_at: '2026-10-17',
      category: 'workplace_harassment',
      is_anonymous: true,
      confidentiality_level: 'hr_committee_only',
      grievance_stage: 'committee_review',
    },
    {
      id: 'f-2',
      organization_id: 'org-1',
      author_type: 'staff',
      title: '고충 2',
      content: '업무 스트레스',
      status: 'resolved',
      is_internal_only: true,
      created_at: '2026-10-16',
      category: 'grievance_stress',
      is_anonymous: false,
      confidentiality_level: 'internal',
      grievance_stage: 'closed',
    },
    {
      id: 'f-3',
      organization_id: 'org-1',
      author_type: 'customer',
      title: '일반 건의',
      content: '주차장 안내판',
      status: 'open',
      is_internal_only: false,
      created_at: '2026-10-15',
      category: 'general_voc',
    },
  ];

  const metrics = summarizeGrievanceMetrics(items);
  assert.strictEqual(metrics.totalGrievances, 2);
  assert.strictEqual(metrics.anonymousCount, 1);
  assert.strictEqual(metrics.hrConfidentialCount, 1);
  assert.strictEqual(metrics.workplaceHarassmentCount, 1);
  assert.strictEqual(metrics.openGrievances, 1);
  assert.strictEqual(metrics.closedGrievances, 1);

  console.log('✓ 6. [ISO 45003] 인사 고충 및 익명 통계 집계 검증 완료');
}

console.log('[test:handover-engine] ALL TESTS PASSED! (100%)');
