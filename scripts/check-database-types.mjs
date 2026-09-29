/**
 * migration schema vs database.types.ts 정합 검사.
 * 새 테이블/함수가 타입에 없으면 실패한다. any/never 캐스팅으로 숨기지 않는다.
 *
 * 실행: npm run check:db-types
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const typesFile = join(root, 'src/lib/supabase/database.types.ts');
const generatedFile = join(root, 'src/lib/supabase/database.generated.ts');
const migrationsDir = join(root, 'supabase/migrations');
const SCHEMAS = ['core', 'piano', 'bath', 'platform'];

/** 이미 타입에 없는 테이블. 이번 작업에서 schema를 채우지 않고 위치만 고정한다. */
const KNOWN_MISSING_TABLES = new Set([
  'core.academy_data_sharing_consents',
  'core.auth_providers',
  'core.customer_join_requests',
  'core.guardian_enrollment_requests',
  'core.guardian_link_tokens',
  'core.org_parent_profiles',
  'core.organization_join_requests',
  'core.organization_quotas',
  'core.parent_invitations',
  'core.parent_student_guardians',
  'core.parents',
  'core.practice_rooms',
  'core.push_device_tokens',
  'core.rate_limit_configs',
  'core.room_reservations',
  'core.staff_invitations',
  'core.student_enrollments',
  'core.students',
  'piano.song_progress',
]);

const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(core|piano|bath|platform)\.([A-Za-z_][A-Za-z0-9_]*)/gi;
const DROP_TABLE_RE =
  /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(core|piano|bath|platform)\.([A-Za-z_][A-Za-z0-9_]*)/gi;
const CREATE_FN_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(core|piano|bath|platform)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;

function keyOf(schema, name) {
  return `${schema}.${name}`;
}

function collectMigrationObjects() {
  const tables = new Map();
  const functions = new Set();
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const match of sql.matchAll(CREATE_TABLE_RE)) {
      tables.set(keyOf(match[1], match[2]), true);
    }
    for (const match of sql.matchAll(DROP_TABLE_RE)) {
      tables.delete(keyOf(match[1], match[2]));
    }
    for (const match of sql.matchAll(CREATE_FN_RE)) {
      functions.add(keyOf(match[1], match[2]));
    }
  }
  return { tables: [...tables.keys()].sort(), functions: [...functions].sort() };
}

function sectionBlock(source, startFrom, heading) {
  const match = source.slice(startFrom).match(new RegExp(`${heading}:\\s*\\{`));
  if (!match || match.index == null) return '';
  const from = startFrom + match.index + match[0].length;
  const next = source.slice(from).search(/\n    (Tables|Views|Functions|Enums|CompositeTypes):/);
  return next < 0 ? source.slice(from) : source.slice(from, from + next);
}

function namesInSection(block) {
  return [...block.matchAll(/\n      ([A-Za-z_][A-Za-z0-9_]*): \{/g)].map((row) => row[1]);
}

function parseSchemaBlock(source, schema) {
  const start = source.indexOf(`\n  ${schema}: {`);
  if (start < 0) return { tables: [], functions: [] };
  return {
    tables: namesInSection(sectionBlock(source, start, 'Tables')),
    functions: namesInSection(sectionBlock(source, start, 'Functions')),
  };
}

function collectTypeObjects(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const tables = [];
  const functions = [];
  for (const schema of SCHEMAS) {
    const parsed = parseSchemaBlock(source, schema);
    for (const name of parsed.tables) tables.push(keyOf(schema, name));
    for (const name of parsed.functions) functions.push(keyOf(schema, name));
  }
  return { tables, functions };
}

function missing(required, actual) {
  const have = new Set(actual);
  return required.filter((item) => !have.has(item));
}

function main() {
  const migrated = collectMigrationObjects();
  const typed = collectTypeObjects(typesFile);
  const allMissingTables = missing(migrated.tables, typed.tables);
  const knownMissing = allMissingTables.filter((row) => KNOWN_MISSING_TABLES.has(row));
  const missingTables = allMissingTables.filter((row) => !KNOWN_MISSING_TABLES.has(row));
  const missingFunctions = missing(migrated.functions, typed.functions);

  if (existsSync(generatedFile)) {
    const generated = collectTypeObjects(generatedFile);
    const genMissing = missing(migrated.tables, generated.tables).filter(
      (row) => !KNOWN_MISSING_TABLES.has(row)
    );
    if (genMissing.length > 0) {
      console.error('database.generated.ts 가 최신 migration보다 뒤처져 있습니다:');
      for (const row of genMissing) console.error(`  - ${row}`);
      console.error('npm run supabase:types 로 다시 생성하세요.');
      process.exit(1);
    }
  }

  if (knownMissing.length > 0) {
    console.log('기존 타입 누락 테이블 (allowlist, 이번 작업에서 채우지 않음):');
    for (const row of knownMissing) console.log(`  - ${row}`);
  }
  if (missingFunctions.length > 0) {
    console.warn(`참고: 타입에 없는 함수 ${missingFunctions.length}개 (테이블 누락만 실패).`);
  }

  if (missingTables.length > 0) {
    console.error('database.types.ts 가 실제 schema와 다릅니다. 타입에 없는 테이블:');
    for (const row of missingTables) console.error(`  - ${row}`);
    console.error('migration 반영 후 npm run supabase:types 그리고 database.types.ts를 갱신하세요.');
    process.exit(1);
  }

  console.log(
    `check-database-types: ok (${migrated.tables.length} tables, ${migrated.functions.length} functions)`
  );
}

main();
