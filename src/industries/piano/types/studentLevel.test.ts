import assert from 'node:assert/strict';
import { isPianoStudentLevel, PIANO_STUDENT_LEVELS } from './studentLevel';
import { isDaycareAgeClass } from '@/industries/daycare/types/ageClass';
import { isGymClassLevel } from '@/industries/gym/types/classLevel';

assert.equal(PIANO_STUDENT_LEVELS.includes('바이엘 상'), true);
assert.equal(isPianoStudentLevel('바이엘 상'), true);
assert.equal(isPianoStudentLevel('0세반'), false);
assert.equal(isDaycareAgeClass('0세반'), true);
assert.equal(isDaycareAgeClass('바이엘 상'), false);
assert.equal(isGymClassLevel('초급'), true);
assert.equal(isGymClassLevel('방과후'), false);
console.log('studentLevel.test.ts: ok');
