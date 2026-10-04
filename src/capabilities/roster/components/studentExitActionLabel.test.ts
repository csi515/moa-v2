/**
 * 학생 상세 종료·퇴원 동작 라벨
 * 실행: npx tsx src/capabilities/roster/components/studentExitActionLabel.test.ts
 */
import assert from 'node:assert/strict';
import { getStudentExitActionLabel } from './studentExitActionLabel';

assert.equal(getStudentExitActionLabel('piano'), '퇴원');
assert.equal(getStudentExitActionLabel('daycare'), '퇴원');
assert.equal(getStudentExitActionLabel('preschool'), '퇴원');
assert.equal(getStudentExitActionLabel('kindergarten'), '퇴원');

assert.equal(getStudentExitActionLabel('skin_clinic'), '종료');
assert.equal(getStudentExitActionLabel('pilates'), '종료');
assert.equal(getStudentExitActionLabel('gym'), '종료');
assert.equal(getStudentExitActionLabel('taekwondo'), '종료');
assert.equal(getStudentExitActionLabel('retail'), '종료');
assert.equal(getStudentExitActionLabel('sauna_jjimjilbang'), '종료');
assert.equal(getStudentExitActionLabel('sauna_jjimjbang'), '종료');
assert.equal(getStudentExitActionLabel('general_service'), '종료');
assert.equal(getStudentExitActionLabel('academy'), '종료');
assert.equal(getStudentExitActionLabel(null), '종료');
assert.equal(getStudentExitActionLabel(undefined), '종료');
assert.equal(getStudentExitActionLabel(''), '종료');
assert.equal(getStudentExitActionLabel('future_industry'), '종료');

console.log('studentExitActionLabel.test.ts ok');
