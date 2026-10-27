import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'supabase', 'migrations');
const files = readdirSync(root).filter((name) => name.endsWith('.sql'));
let failed = 0;

for (const name of files) {
  const sql = readFileSync(join(root, name), 'utf8');
  if (!sql.includes('moa-lint:strict')) continue;
  const tables = sql.match(/CREATE TABLE[\s\S]*?\);/gi) ?? [];
  if (tables.length === 0) {
    console.error(`${name}: strict migration has no CREATE TABLE`);
    failed += 1;
    continue;
  }
  for (const block of tables) {
    const hasTenant = /tenant_id|organization_id/.test(block) && /REFERENCES\s+core\.organizations/i.test(block);
    if (!hasTenant) {
      console.error(`${name}: CREATE TABLE is missing a tenant foreign key`);
      failed += 1;
    }
    if (/deleted_at/i.test(block) && !/WHERE\s+deleted_at\s+IS\s+NULL/i.test(sql)) {
      console.error(`${name}: active-row partial unique index is missing`);
      failed += 1;
    }
  }
  if (!/ENABLE ROW LEVEL SECURITY/i.test(sql)) {
    console.error(`${name}: ENABLE ROW LEVEL SECURITY is missing`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`lint-migrations: ${failed} violation(s)`);
  process.exit(1);
}
console.log(`lint-migrations: ok (${files.length} files scanned, strict rules on marked migrations)`);
