/**
 * P19-3: src/types/index.ts 는 compatibility barrel.
 * 실행: npm run test:types-ownership
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TYPES_BARREL_ALLOWED_LOCAL,
  typesBarrelHasStudentLevelUnion,
  typesBarrelLocalDefinitionNames,
} from '../../scripts/types-barrel-freeze.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const barrel = readFileSync(join(here, 'index.ts'), 'utf8');

function hasLocalInterface(name: string): boolean {
  return new RegExp(`^export\\s+interface\\s+${name}\\b`, 'm').test(barrel);
}

function hasReExport(name: string, ownerHint: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`export\\s+type\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}\\s+from\\s+['"][^'"]*${ownerHint}`).test(
      barrel
    ) ||
    new RegExp(`export\\s+type\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}\\s+from\\s+['"][^'"]+'`).test(barrel)
  );
}

assert.equal(hasLocalInterface('TuitionInvoice'), false, 'Billing type must not be defined in types/index.ts');
assert.equal(hasLocalInterface('AttendanceRecord'), false, 'Attendance type must not be defined in types/index.ts');
assert.equal(
  hasReExport('TuitionInvoice', 'billing'),
  true,
  'TuitionInvoice must re-export from billing owner'
);
assert.equal(
  hasReExport('AttendanceRecord', 'attendance'),
  true,
  'AttendanceRecord must re-export from attendance owner'
);

assert.equal(existsSync(join(root, 'src/core/schedules/types.ts')), true);
assert.match(
  readFileSync(join(root, 'src/core/schedules/types.ts'), 'utf8'),
  /export (type|interface) (CoreSchedule|Reservation)\b/
);
assert.equal(existsSync(join(root, 'src/industries/piano/types/studentLevel.ts')), true);
assert.match(
  readFileSync(join(root, 'src/industries/piano/types/studentLevel.ts'), 'utf8'),
  /export type PianoStudentLevel/
);
assert.equal(existsSync(join(root, 'src/industries/daycare/types/ageClass.ts')), true);
assert.match(
  readFileSync(join(root, 'src/industries/daycare/types/ageClass.ts'), 'utf8'),
  /export type DaycareAgeClass/
);

assert.equal(typesBarrelHasStudentLevelUnion(barrel), false);
assert.match(barrel, /export type StudentLevel = string/);

const localNames = typesBarrelLocalDefinitionNames(barrel);
const unknown = localNames.filter((name) => !TYPES_BARREL_ALLOWED_LOCAL.has(name));
assert.deepEqual(unknown, [], `unexpected local barrel defs: ${unknown.join(', ')}`);

assert.match(barrel, /Legacy compatibility barrel/);

const pianoLevelSrc = readFileSync(join(root, 'src/industries/piano/types/studentLevel.ts'), 'utf8');
assert.doesNotMatch(pianoLevelSrc, /DaycareAgeClass|GymClassLevel|0세반/);

console.log('typesOwnership.test.ts: ok');
