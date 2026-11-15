import assert from 'node:assert/strict';
import {
  validateResearchMembers,
  validateResearchPeriod,
  validateBudget,
  validateGateSequence,
  canDecideGate,
  createResearchProject,
  decideGate,
  recordBudgetSpend,
  formatDeliverableTitle,
  parseDeliverableType,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  getCurrentGate,
  getLeadName,
  getCoLeadNames,
  canDirectDecideGate,
  markGateSubmittedForApproval,
  type ResearchGate,
  type ResearchMember,
} from './researchProjectEngine';

function run() {
  console.log('[test:research-project-engine] running...');

  // 1. 기간 / 멤버 / 예산 검증
  {
    assert.equal(validateResearchPeriod('2026-01-01', '2026-06-30').isValid, true);
    assert.equal(validateResearchPeriod('2026-06-30', '2026-01-01').isValid, false);

    const membersOk: ResearchMember[] = [
      { memberId: 'u1', memberName: '김수석', role: 'lead' },
      { memberId: 'u2', memberName: '이선임', role: 'co_lead' },
    ];
    assert.equal(validateResearchMembers(membersOk).isValid, true);
    assert.equal(validateResearchMembers([]).isValid, false);
    assert.equal(
      validateResearchMembers([
        { memberId: 'u1', memberName: 'A', role: 'lead' },
        { memberId: 'u2', memberName: 'B', role: 'lead' },
      ]).isValid,
      false
    );

    assert.equal(validateBudget({ planned: 1000, spent: 200 }).isValid, true);
    assert.equal(validateBudget({ planned: 1000, spent: 1200 }).isValid, false);
  }

  // 2. 게이트 연속성 / 선행 승인
  {
    const gates: ResearchGate[] = [
      { id: 'g1', gateOrder: 1, title: '1차', status: 'pending' },
      { id: 'g2', gateOrder: 2, title: '2차', status: 'pending' },
      { id: 'g3', gateOrder: 3, title: '3차', status: 'pending' },
    ];
    assert.equal(validateGateSequence(gates).isValid, true);
    assert.equal(
      validateGateSequence([
        { id: 'g1', gateOrder: 1, title: '1차', status: 'pending' },
        { id: 'g3', gateOrder: 3, title: '3차', status: 'pending' },
      ]).isValid,
      false
    );

    assert.equal(canDecideGate(gates, 1).allowed, true);
    assert.equal(canDecideGate(gates, 2).allowed, false);
    assert.ok(canDecideGate(gates, 2).reason?.includes('1차'));
  }

  // 3. 과제 생성
  {
    const created = createResearchProject({
      organizationId: 'org-1',
      title: '친환경 촉매 파일럿',
      summary: '파일럿 스케일업 및 수율 검증',
      startDate: '2026-01-15',
      endDate: '2026-09-30',
      budgetPlanned: 50_000_000,
      members: [
        { memberId: 'u1', memberName: '김수석', role: 'lead' },
        { memberId: 'u2', memberName: '이선임', role: 'co_lead' },
        { memberId: 'u3', memberName: '박연구원', role: 'member' },
      ],
      deliverables: [
        { title: '중간 실험보고서', dueDate: '2026-04-30' },
        { title: '파일럿 운전 데이터', dueDate: '2026-08-31' },
      ],
      gateTitles: ['1차 기획', '2차 중간', '3차 완료'],
    });
    assert.ok(created.project);
    const p = created.project!;
    assert.equal(p.status, 'active');
    assert.equal(p.gates.length, 3);
    assert.equal(getLeadName(p), '김수석');
    assert.deepEqual(getCoLeadNames(p), ['이선임']);
    assert.equal(p.deliverables.length, 2);
    assert.equal(getCurrentGate(p.gates)?.gateOrder, 1);
  }

  // 4. 게이트 승인 순서 및 완료 전이
  {
    const created = createResearchProject({
      organizationId: 'org-1',
      title: '게이트 시퀀스 검증 과제',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      budgetPlanned: 10_000_000,
      members: [{ memberId: 'u1', memberName: '김수석', role: 'lead' }],
      gateTitles: ['1차', '2차'],
    });
    const base = created.project!;

    const fail2 = decideGate(base, 2, {
      status: 'approved',
      decidedByName: '연구소장',
    });
    assert.ok(fail2.error?.includes('1차'));

    const step1 = decideGate(base, 1, {
      status: 'approved',
      decidedByName: '연구소장',
      decisionNote: '기획 통과',
    });
    assert.equal(step1.error, undefined);
    assert.equal(step1.project.status, 'gate_review');
    assert.equal(getCurrentGate(step1.project.gates)?.gateOrder, 2);

    const step2 = decideGate(step1.project, 2, {
      status: 'approved',
      decidedByName: '연구소장',
    });
    assert.equal(step2.project.status, 'completed');
    assert.equal(step2.project.progressRate, 100);
  }

  // 5. 예산 집행
  {
    const created = createResearchProject({
      organizationId: 'org-1',
      title: '예산 검증',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      budgetPlanned: 1_000_000,
      members: [{ memberId: 'u1', memberName: '김수석', role: 'lead' }],
    });
    const ok = recordBudgetSpend(created.project!, 300_000);
    assert.equal(ok.error, undefined);
    assert.equal(ok.project.budget.spent, 300_000);

    const over = recordBudgetSpend(ok.project, 800_000);
    assert.ok(over.error?.includes('초과'));
  }

  // 6. 결재 상신 전환
  {
    const created = createResearchProject({
      organizationId: 'org-1',
      title: '결재 연동',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      budgetPlanned: 1_000_000,
      members: [{ memberId: 'u1', memberName: '김', role: 'lead' }],
      gateTitles: ['1차'],
    });
    const gate = created.project!.gates[0];
    assert.equal(canDirectDecideGate(gate), true);
    const marked = markGateSubmittedForApproval(created.project!, gate.id, 'approval-uuid');
    assert.equal(marked.project?.gates[0].status, 'in_approval');
    assert.equal(canDirectDecideGate(marked.project!.gates[0]), false);
  }


  // 7. 학술/연구 산출물 유형 포맷팅 및 파싱 (대학 연구실 대응)
  {
    assert.equal(formatDeliverableTitle('paper', 'SCI 저널 투고 논문'), '[학술논문] SCI 저널 투고 논문');
    assert.equal(formatDeliverableTitle('thesis', '[논문] 석사학위 디펜스 논문'), '[학위논문] 석사학위 디펜스 논문');
    assert.equal(formatDeliverableTitle('conference', 'KIISE 학회 구두발표 초록'), '[학회발표] KIISE 학회 구두발표 초록');
    assert.equal(formatDeliverableTitle('patent', 'AI 특허 출원서'), '[특허] AI 특허 출원서');

    const parsedPaper = parseDeliverableType('[학술논문] 강화학습 기반 공정제어');
    assert.equal(parsedPaper.type, 'paper');
    assert.equal(parsedPaper.cleanTitle, '강화학습 기반 공정제어');

    const parsedThesis = parseDeliverableType('[학위논문] 박사학위 최종 논문');
    assert.equal(parsedThesis.type, 'thesis');
    assert.equal(parsedThesis.cleanTitle, '박사학위 최종 논문');

    const parsedRaw = parseDeliverableType('기타 일반 보고서');
    assert.equal(parsedRaw.type, 'other');
    assert.equal(parsedRaw.cleanTitle, '기타 일반 보고서');

    assert.ok(MEMBER_ROLE_LABELS.lead.includes('PI'));
    assert.ok(MEMBER_ROLE_LABELS.co_lead.includes('랩장'));
    assert.ok(MEMBER_ROLE_LABELS.member.includes('연구원'));
  }
  console.log('[test:research-project-engine] ok');
}

run();
