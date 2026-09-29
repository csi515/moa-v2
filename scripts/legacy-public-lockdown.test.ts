/**
 * 2026-09-28 레거시 public 테이블(students/attendances/fees) 제거 정적 검증 (DB 접속 없음)
 * - 20260928190000: 비어 있지 않으면 중단하는 가드 + DROP TABLE IF EXISTS (CASCADE 금지)
 * - 어떤 마이그레이션도 이 테이블을 public 스키마에 다시 만들거나 anon 에 열지 않는다
 * - 앱/Edge Function/scripts/e2e 가 public 스키마 클라이언트나 REST 경로로 이 테이블을 쓰지 않는다
 * 기능 검증(로컬 Postgres): supabase/tests/legacy_public_lockdown.sql
 * 실행: npm run test:legacy-public-lockdown
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');
const LEGACY = ['students', 'attendances', 'fees'] as const;
const MIGRATION = '20260928190000_lockdown_legacy_public_tables.sql';

// 1) 마이그레이션 내용
const migDir = 'supabase/migrations';
const migrations = readdirSync(join(root, migDir)).filter((f) => f.endsWith('.sql')).sort();
assert.ok(migrations.includes(MIGRATION), `${MIGRATION} missing`);
const idx = migrations.indexOf(MIGRATION);
assert.ok(idx > 0 && migrations[idx - 1] >= '20260928180000', 'must come after 20260928180000');

const code = stripComments(read(`${migDir}/${MIGRATION}`));
for (const t of LEGACY) {
  assert.match(code, new RegExp(`DROP TABLE IF EXISTS public\\.${t};`), `drop public.${t}`);
}
assert.doesNotMatch(code, /\bCASCADE\b/i, 'no CASCADE');
assert.match(code, /SELECT EXISTS \(SELECT 1 FROM %s\)/, 'non-empty guard');
assert.match(code, /RAISE EXCEPTION 'legacy table % is not empty/, 'guard raises');
const guardPos = code.indexOf('RAISE EXCEPTION');
const firstDrop = code.indexOf('DROP TABLE');
assert.ok(guardPos > 0 && guardPos < firstDrop, 'guard runs before DROP');
assert.doesNotMatch(code, /DROP FUNCTION/i, 'public.set_updated_at() must be kept');

// 2) 다른 마이그레이션이 public 레거시 테이블을 다시 만들거나 anon 에 열지 않음
const legacyAlt = LEGACY.join('|');
for (const f of migrations) {
  if (f === MIGRATION) continue;
  const s = stripComments(read(`${migDir}/${f}`));
  assert.doesNotMatch(
    s,
    new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.(${legacyAlt})\\b`, 'i'),
    `${f} recreates a legacy public table`,
  );
  assert.doesNotMatch(
    s,
    new RegExp(`ON (TABLE )?public\\.(${legacyAlt})\\b[^;]*TO[^;]*\\banon\\b`, 'i'),
    `${f} grants a legacy public table to anon`,
  );
}

// 3) 클라이언트 코드가 public 스키마로 레거시 테이블을 쓰지 않음
function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}
const files = ['src', 'supabase/functions', 'scripts', 'e2e'].flatMap((d) => walk(join(root, d)));
const self = relative(root, fileURLToPath(import.meta.url));
for (const p of files) {
  const rel = relative(root, p);
  if (rel === self) continue;
  const s = readFileSync(p, 'utf8');
  assert.doesNotMatch(s, /\.schema\(\s*['"`]public['"`]\s*\)/, `${rel}: public schema client`);
  assert.doesNotMatch(s, /schema:\s*['"`]public['"`]/, `${rel}: public schema client option`);
  assert.doesNotMatch(s, new RegExp(`/rest/v1/(${legacyAlt})\\b`), `${rel}: REST path to legacy table`);
}

console.log(`legacy-public-lockdown: ok (${files.length} client files scanned, ${migrations.length} migrations)`);
