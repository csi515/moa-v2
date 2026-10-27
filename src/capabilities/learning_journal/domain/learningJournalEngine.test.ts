import assert from 'node:assert/strict';
import {
  validateJournalEntry,
  acknowledgeJournalByParent,
  calculateJournalStats,
  validateJournalComment,
  type LearningJournal,
} from './learningJournalEngine';

console.log('[test:learning-journal] starting test suite...');

// 1. 유효성 검사
{
  const invalid1 = validateJournalEntry({
    student_id: '',
    title: '테스트',
    content: '내용입니다.',
    lesson_date: '2026-07-01',
  });
  assert.equal(invalid1.valid, false);
  assert.ok(invalid1.error?.includes('원생'));

  const valid = validateJournalEntry({
    student_id: 'std-1',
    title: '체르니 100번 5번곡 연습',
    content: '오른손 스타카토와 왼손 아르페지오 밸런스를 집중 지도함.',
    lesson_date: '2026-07-01',
  });
  assert.equal(valid.valid, true);
}
console.log('✓ 1. 수업 일지 등록 유효성 검사 통과');

// 2. 학부모 확인 상태 머신
{
  const journal: LearningJournal = {
    id: 'j-1',
    organization_id: 'org-1',
    student_id: 'std-1',
    author_staff_id: 'staff-1',
    lesson_date: '2026-07-01',
    title: '기초 바이엘 20번',
    content: '양손 독립 연습 진행함.',
    media_urls: [],
    parent_acknowledgement: false,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
  };

  const ack = acknowledgeJournalByParent(journal, '2026-07-01T18:30:00Z');
  assert.equal(ack.parent_acknowledgement, true);
  assert.equal(ack.parent_viewed_at, '2026-07-01T18:30:00Z');
}
console.log('✓ 2. 학부모 안심 확인 상태머신 전이 통과');

// 3. 통계 집계 검증
{
  const list: LearningJournal[] = [
    {
      id: 'j1',
      organization_id: 'org-1',
      student_id: 's1',
      author_staff_id: 'st1',
      lesson_date: '2026-07-01',
      title: '일지 1',
      content: '내용',
      practice_homework: '매일 15분 연습',
      media_urls: [],
      parent_acknowledgement: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'j2',
      organization_id: 'org-1',
      student_id: 's2',
      author_staff_id: 'st1',
      lesson_date: '2026-07-02',
      title: '일지 2',
      content: '내용',
      media_urls: [],
      parent_acknowledgement: false,
      created_at: '',
      updated_at: '',
    },
  ];

  const stats = calculateJournalStats(list);
  assert.equal(stats.totalJournals, 2);
  assert.equal(stats.acknowledgedCount, 1);
  assert.equal(stats.acknowledgementRate, 50.0);
  assert.equal(stats.withHomeworkCount, 1);
}
console.log('✓ 3. 학부모 피드 확인율 통계 산출 통과');

// 4. 댓글 검증
{
  assert.equal(validateJournalComment('감사합니다 선생님!', '김민지 어머니').valid, true);
  assert.equal(validateJournalComment('', '김민지 어머니').valid, false);
}
console.log('✓ 4. 댓글 유효성 검사 통과');

console.log('[test:learning-journal] ALL TESTS PASSED! (100%)');
