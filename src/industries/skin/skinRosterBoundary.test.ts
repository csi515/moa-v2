/**
 * 피부 회원·직원 화면은 필라테스 업종 패키지를 거치지 않는다.
 * 실행: npx tsx src/industries/skin/skinRosterBoundary.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pilatesImport = /@\/industries\/pilates|industries\/pilates/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  assert.equal(pilatesImport.test(text), false, `${file} still imports pilates`);
}

const members = readFileSync(join(root, 'components/members/MemberListView.tsx'), 'utf8');
assert.match(
  members,
  /export \{ StudentListView as MemberListView \} from '@\/capabilities\/roster'/
);

const staff = readFileSync(join(root, 'components/instructors/InstructorListView.tsx'), 'utf8');
assert.match(
  staff,
  /export \{ TeacherManagementView as InstructorListView \} from '@\/core\/staff\/components\/TeacherManagementView'/
);

const app = readFileSync(join(root, 'SkinAppContent.tsx'), 'utf8');
assert.match(app, /from '\.\/components\/members\/MemberListView'/);
assert.match(app, /from '\.\/components\/instructors\/InstructorListView'/);
assert.match(app, /membersView=\{MemberListView\}/);
assert.match(app, /staffView=\{InstructorListView\}/);

const pilatesMembers = readFileSync(
  join(root, '../pilates/components/members/MemberListView.tsx'),
  'utf8'
);
const pilatesStaff = readFileSync(
  join(root, '../pilates/components/instructors/InstructorListView.tsx'),
  'utf8'
);
assert.match(
  pilatesMembers,
  /export \{ StudentListView as MemberListView \} from '@\/capabilities\/roster'/
);
assert.match(
  pilatesStaff,
  /export \{ TeacherManagementView as InstructorListView \} from '@\/core\/staff\/components\/TeacherManagementView'/
);

console.log('skinRosterBoundary.test.ts ok');
