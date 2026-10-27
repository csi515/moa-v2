import assert from 'node:assert/strict';
import {
  checkCertificationExpiry,
  isStaffQualifiedForClass,
  type StaffSkillItem,
} from './skillsMatrixEngine';

function run() {
  const now = new Date('2026-10-18T00:00:00Z');

  // 1. 만료일 없는 평생 자격
  assert.equal(checkCertificationExpiry(undefined, now).status, 'ACTIVE');

  // 2. 만료 임박 D-30 (60일 기준)
  const warnRes = checkCertificationExpiry('2026-11-15', now, 60);
  assert.equal(warnRes.status, 'EXPIRING_SOON');
  assert.ok(warnRes.daysRemaining !== null && warnRes.daysRemaining <= 60);

  // 3. 이미 만료된 자격증
  const expRes = checkCertificationExpiry('2026-09-01', now, 60);
  assert.equal(expRes.status, 'EXPIRED');

  // 4. 스킬 적격성 판정
  const skills: StaffSkillItem[] = [
    { skill_name: '재활 필라테스', proficiency_level: 4 },
    { skill_name: '키즈 발레', proficiency_level: 2 },
  ];
  assert.equal(isStaffQualifiedForClass(skills, '재활 필라테스', 3), true);
  assert.equal(isStaffQualifiedForClass(skills, '키즈 발레', 3), false); // 레벨 2 < 3
  assert.equal(isStaffQualifiedForClass(skills, '기구 필라테스', 3), false); // 미보유

  console.log('skillsMatrixEngine.test.ts: ok');
}

run();
