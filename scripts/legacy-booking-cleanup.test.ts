/**
 * 2026-09-28 레거시 예약 앱(oneslot/shop) public 객체 제거 정적 검증 (DB 접속 없음)
 * - 20260928200000: 행 있음/모양 불일치/auth 트리거 참조 시 중단 → DROP ... IF EXISTS (CASCADE 금지)
 * - set_updated_at / rls_auto_enable / btree_gist / storage 는 건드리지 않는다
 * - 남은 public 테이블에서 anon/authenticated TRUNCATE/TRIGGER/REFERENCES 회수
 * - 이후 마이그레이션이 이 객체를 public 에 다시 만들지 않고, 클라이언트 코드가 이 객체를 쓰지 않는다
 * 기능 검증(로컬 Postgres): supabase/tests/legacy_booking_cleanup.sql
 * 실행: npm run test:legacy-booking-cleanup
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const stripComments = (s: string) => s.replace(/--[^\n]*/g, "");
const MIGRATION = "20260928200000_drop_legacy_booking_public_objects.sql";
// FK 참조 순서 (자식 → 부모)
const TABLES = [
  "booking_change_requests",
  "bookings",
  "blocked_times",
  "services",
  "customer_profiles",
  "profiles",
] as const;
const FUNCTIONS = [
  "public.check_booking_overlap()",
  "public.prevent_direct_booking_schedule_change()",
  "public.get_booking_slots(uuid, date, bigint)",
  "public.create_booking_change_request(bigint, date, time without time zone, time without time zone, bigint, text)",
  "public.respond_booking_change_request(bigint, text, text)",
  "public.is_booking_customer(bigint, uuid)",
  "public.is_booking_owner(bigint, uuid)",
] as const;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1) 마이그레이션 내용
const migDir = "supabase/migrations";
const migrations = readdirSync(join(root, migDir))
  .filter((f) => f.endsWith(".sql"))
  .sort();
assert.ok(migrations.includes(MIGRATION), `${MIGRATION} missing`);
const idx = migrations.indexOf(MIGRATION);
assert.ok(
  idx > 0 && migrations[idx - 1] >= "20260928190000",
  "must come after 20260928190000 (#87)"
);

const code = stripComments(read(`${migDir}/${MIGRATION}`));
assert.doesNotMatch(code, /\bCASCADE\b/i, "no CASCADE");
let last = -1;
for (const t of TABLES) {
  const pos = code.indexOf(`DROP TABLE IF EXISTS public.${t};`);
  assert.ok(pos > 0, `drop public.${t} with IF EXISTS`);
  assert.ok(pos > last, `public.${t} dropped in FK-safe order`);
  last = pos;
}
for (const f of FUNCTIONS) {
  assert.match(
    code,
    new RegExp(`DROP FUNCTION IF EXISTS ${esc(f)};`),
    `drop ${f}`
  );
}
assert.doesNotMatch(
  code,
  /DROP TABLE (?!IF EXISTS)/i,
  "every DROP TABLE uses IF EXISTS"
);
assert.doesNotMatch(
  code,
  /DROP FUNCTION (?!IF EXISTS)/i,
  "every DROP FUNCTION uses IF EXISTS"
);

// 가드: 행 있음 / profiles 모양 / auth 트리거 — 모두 첫 DROP 보다 먼저
const firstDrop = code.indexOf("DROP TABLE");
const guards = [
  /SELECT EXISTS \(SELECT 1 FROM %s\)/,
  /RAISE EXCEPTION 'legacy booking table % is not empty/,
  /attname = 'slug'/,
  /attname = 'business_name'/,
  /RAISE EXCEPTION 'public\.profiles does not look like the legacy booking-app table/,
  /n\.nspname = 'auth' AND NOT tg\.tgisinternal/,
  /RAISE EXCEPTION 'auth trigger % on %/,
];
for (const g of guards) {
  const m = g.exec(code);
  assert.ok(m, `guard missing: ${g}`);
  assert.ok(m.index < firstDrop, `guard runs before DROP: ${g}`);
}

// 남겨야 하는 것
assert.doesNotMatch(
  code,
  /DROP FUNCTION[^;]*set_updated_at/i,
  "keep public.set_updated_at()"
);
assert.doesNotMatch(
  code,
  /DROP FUNCTION[^;]*rls_auto_enable/i,
  "keep public.rls_auto_enable()"
);
assert.doesNotMatch(
  code,
  /DROP EXTENSION/i,
  "keep btree_gist (core.room_reservations)"
);
assert.doesNotMatch(
  code,
  /\bstorage\./i,
  "storage is out of scope (owned by supabase_storage_admin)"
);
assert.doesNotMatch(
  code,
  /\bauth\.users\b|\bcore\.|\bpiano\.|\bbath\./i,
  "does not touch auth/core/piano/bath objects"
);

// 남은 public 테이블 권한 회수
assert.match(
  code,
  /REVOKE TRUNCATE, TRIGGER, REFERENCES ON %s FROM anon, authenticated/,
  "revoke TRUNCATE/TRIGGER/REFERENCES on remaining public tables"
);
assert.match(
  code,
  /relnamespace = 'public'::regnamespace/,
  "revoke loop limited to public"
);
assert.match(
  code,
  /deptype = 'e'/,
  "revoke loop skips extension-owned objects"
);

// 2) 다른 마이그레이션이 public 레거시 예약 객체를 다시 만들거나 anon 에 열지 않음
const tableAlt = TABLES.join("|");
const fnAlt = [
  "check_booking_overlap",
  "prevent_direct_booking_schedule_change",
  "get_booking_slots",
  "create_booking_change_request",
  "respond_booking_change_request",
  "is_booking_customer",
  "is_booking_owner",
].join("|");
for (const f of migrations) {
  if (f === MIGRATION) continue;
  const s = stripComments(read(`${migDir}/${f}`));
  assert.doesNotMatch(
    s,
    new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.(${tableAlt})\\b`, "i"),
    `${f} creates a legacy booking table in public`
  );
  assert.doesNotMatch(
    s,
    new RegExp(`CREATE (OR REPLACE )?FUNCTION public\\.(${fnAlt})\\b`, "i"),
    `${f} creates a legacy booking function in public`
  );
  assert.doesNotMatch(
    s,
    new RegExp(
      `ON (TABLE )?public\\.(${tableAlt})\\b[^;]*TO[^;]*\\banon\\b`,
      "i"
    ),
    `${f} grants a legacy booking table to anon`
  );
  assert.doesNotMatch(
    s,
    new RegExp(
      `GRANT[^;]*FUNCTION public\\.(${fnAlt})\\b[^;]*TO[^;]*\\b(anon|authenticated)\\b`,
      "i"
    ),
    `${f} grants a legacy booking function to clients`
  );
}

// 3) 클라이언트 코드가 레거시 예약 객체를 쓰지 않음
function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}
const files = ["src", "supabase/functions", "scripts", "e2e"].flatMap((d) =>
  walk(join(root, d))
);
const self = relative(root, fileURLToPath(import.meta.url));
for (const p of files) {
  const rel = relative(root, p);
  if (rel === self) continue;
  const s = readFileSync(p, "utf8");
  assert.doesNotMatch(
    s,
    /\.from\(\s*['"`](blocked_times|customer_profiles|booking_change_requests)['"`]/,
    `${rel}: legacy booking-only table`
  );
  assert.doesNotMatch(
    s,
    new RegExp(`\\.rpc\\(\\s*['"\`](${fnAlt})['"\`]`),
    `${rel}: legacy booking RPC`
  );
  assert.doesNotMatch(
    s,
    new RegExp(`/rest/v1/(${tableAlt})\\b`),
    `${rel}: REST path to legacy table`
  );
  assert.doesNotMatch(
    s,
    new RegExp(`/rest/v1/rpc/(${fnAlt})\\b`),
    `${rel}: REST path to legacy RPC`
  );
  assert.doesNotMatch(
    s,
    /['"`]shop-assets['"`]/,
    `${rel}: legacy storage bucket`
  );
}

// 기본 클라이언트는 core 스키마 (같은 이름의 profiles/services/bookings 는 core/bath 쪽)
assert.match(
  read("src/lib/supabase/client.ts"),
  /schema:\s*'core'/,
  "default client schema must be core"
);
assert.match(
  read("src/lib/supabase/bathClient.ts"),
  /schema\('bath'\)/,
  "bath client uses bath schema"
);

console.log(
  `legacy-booking-cleanup: ok (${files.length} client files scanned, ${migrations.length} migrations)`
);
