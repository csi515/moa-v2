import assert from 'node:assert/strict';
import {
  mapConsultationToStudentDraft,
  inferStudentLevelFromCourse,
} from './consultationStudentMapper';

function testLevelInference() {
  assert.equal(inferStudentLevelFromCourse('체르니 100번'), '중급');
  assert.equal(inferStudentLevelFromCourse('바이엘 2권'), '초급');
  assert.equal(inferStudentLevelFromCourse('예중 입시 준비'), '고급');
  assert.equal(inferStudentLevelFromCourse('피아노 처음 배워요'), '기초');
}

function testMapConsultationToStudentDraft() {
  const lead = {
    consultationId: 'lead-123',
    studentName: '김피아노',
    parentName: '김학부모',
    phone: '010-9876-5432',
    coursePreference: '바이엘 4권',
    notes: '손가락 힘이 좋고 악보를 잘 읽음. 화/목 15시 희망',
  };

  const draft = mapConsultationToStudentDraft(lead);

  assert.equal(draft.id, '');
  assert.equal(draft.name, '김피아노');
  assert.equal(draft.parentName, '김학부모');
  assert.equal(draft.parentPhone, '010-9876-5432');
  assert.equal(draft.level, '초급');
  assert.equal(draft.consultationId, 'lead-123');
  assert.match(draft.specialNotes, /상담 연동/);
  assert.match(draft.specialNotes, /바이엘 4권/);
  assert.match(draft.specialNotes, /손가락 힘이 좋고/);
}

testLevelInference();
testMapConsultationToStudentDraft();
console.log('consultationStudentMapper.test.ts: ok');
