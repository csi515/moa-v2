import assert from 'node:assert/strict';
import {
  createExperimentNote,
  signNoteAsAuthor,
  witnessNote,
  verifyNoteIntegrity,
  type ExperimentNote,
} from './electronicLabNotebookEngine';

function run() {
  console.log('[test:electronic-lab-notebook-engine] running...');

  // 1. 연구노트 생성 및 기본 상태
  const note = createExperimentNote({
    organizationId: 'org-test-lab',
    projectId: 'proj-battery',
    projectName: '차세대 리튬메탈 배터리 전해액 개발',
    experimentNumber: 'EXP-2026-0042',
    title: '불소계 첨가제 비율별 쿨롱 효율 측정',
    objective: '첨가제 농도(1~5wt%)에 따른 초기 쿨롱 효율 개선 검증',
    protocol: '1. 아르곤 글로브박스에서 코인셀 제작\n2. 0.1C 충방전 3회 실시',
    results: '3wt% 첨가 시 초기 쿨롱 효율 94.2% 달성',
    conclusion: '3wt% 최적 조건 도출, 다음 단계 수명 평가 예정',
    authorId: 'user-phd-kim',
    authorName: '김박사',
  });

  assert.equal(note.status, 'draft');
  assert.equal(note.authorSignedAt, null);
  assert.equal(note.witnessSignedAt, null);
  assert.equal(note.version, 1);

  // 2. 다른 사람의 작성자 서명 시도 차단
  const hackSign = signNoteAsAuthor(note, 'user-intruder', '해커');
  assert.ok(hackSign.error?.includes('본인만'));
  assert.equal(hackSign.note.status, 'draft');

  // 3. 작성자 본인 서명 (draft -> submitted)
  const signed = signNoteAsAuthor(note, 'user-phd-kim', '김박사');
  assert.equal(signed.error, undefined);
  assert.equal(signed.note.status, 'submitted');
  assert.ok(signed.note.authorSignedAt);
  assert.ok(signed.note.integrityHash.startsWith('eln_'));

  // 4. 서명 후 무결성 검증 (정상 통과)
  const check1 = verifyNoteIntegrity(signed.note);
  assert.equal(check1.isValid, true);
  assert.equal(check1.expectedHash, signed.note.integrityHash);

  // 5. 작성자 본인의 셀프 목격(Self-witness) 차단
  const selfWitness = witnessNote(signed.note, 'user-phd-kim', '김박사');
  assert.ok(selfWitness.error?.includes('본인'));
  assert.equal(selfWitness.note.status, 'submitted');

  // 6. 제3자 동료 연구원/PI의 목격 서명 (submitted -> witnessed)
  const witnessed = witnessNote(
    signed.note,
    'user-pi-prof',
    '이교수',
    '글로브박스 산소 농도 0.1ppm 이하 조건 및 데이터 차트 직접 확인 완료'
  );
  assert.equal(witnessed.error, undefined);
  assert.equal(witnessed.note.status, 'witnessed');
  assert.equal(witnessed.note.witnessName, '이교수');
  assert.ok(witnessed.note.witnessSignedAt);

  // 7. 위변조 탐지 (누군가 결과를 몰래 94.2%에서 99.9%로 조작한 경우)
  const tamperedNote: ExperimentNote = {
    ...witnessed.note,
    results: '3wt% 첨가 시 초기 쿨롱 효율 99.9% 달성 (조작됨)',
  };
  const tamperedCheck = verifyNoteIntegrity(tamperedNote);
  assert.equal(tamperedCheck.isValid, false);
  assert.notEqual(tamperedCheck.expectedHash, tamperedCheck.actualHash);

  console.log('[test:electronic-lab-notebook-engine] ok');
}

run();
