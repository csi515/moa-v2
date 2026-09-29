/**
 * migration SQL을 실제 PostgreSQL parser(libpg_query WASM)로 검사한다.
 * 파일 문자열 존재 여부가 아니라 SQL / plpgsql 문법 오류를 실패로 본다.
 *
 * 실행: npm run check:migration-syntax
 * 최근 N개만: npm run check:migration-syntax -- --recent=20
 *
 * secrets / 원격 DB / supabase db reset 불필요.
 * 전체 파일 parse는 수 초 수준이라 매 CI에 넣는다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parsePlPgSQL } from '@libpg-query/parser';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const migrationsDir = join(root, 'supabase/migrations');
const fixturesDir = join(here, 'fixtures/migration-syntax');
const DEFAULT_RECENT = 20;

function parseArgs(argv) {
  const recentFlag = argv.find((arg) => arg.startsWith('--recent='));
  if (!recentFlag) return { all: true, recent: DEFAULT_RECENT };
  const recent = Number(recentFlag.slice('--recent='.length));
  return { all: false, recent: Number.isFinite(recent) && recent > 0 ? recent : DEFAULT_RECENT };
}

function extractPlpgsqlFunctions(sql) {
  const found = [];
  const startRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/gi;
  let match;
  while ((match = startRe.exec(sql))) {
    const start = match.index;
    const rest = sql.slice(start);
    const bodyOpen = /\bAS\s+(\$[a-zA-Z_]*\$)/i.exec(rest);
    const lang = /\bLANGUAGE\s+(plpgsql|sql|c)\b/i.exec(rest);
    if (!lang || lang[1].toLowerCase() !== 'plpgsql') continue;
    let end = lang.index + lang[0].length;
    if (bodyOpen) {
      const tag = bodyOpen[1];
      const bodyStart = bodyOpen.index + bodyOpen[0].length;
      const closeAt = rest.indexOf(tag, bodyStart);
      if (closeAt >= 0) {
        end = Math.max(end, closeAt + tag.length);
      }
    }
    const after = rest.slice(end);
    const semi = /^\s*;/.exec(after);
    if (semi) end += semi[0].length;
    found.push(rest.slice(0, end));
  }
  return found;
}

function formatParseError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const compact = message.replace(/\s+/g, ' ').trim();
  if (/mismatched|syntax error|Unexpected token/i.test(compact)) {
    return `syntax error (${compact})`;
  }
  return compact;
}

async function parseSqlFile(label, sql) {
  const errors = [];
  try {
    await parse(sql);
  } catch (err) {
    errors.push(`SQL: ${formatParseError(err)}`);
  }

  for (const fnSql of extractPlpgsqlFunctions(sql)) {
    try {
      await parsePlPgSQL(fnSql);
    } catch (err) {
      errors.push(`plpgsql: PostgreSQL parser rejected function body — ${formatParseError(err)}`);
    }
  }
  return errors.map((detail) => ({ file: label, detail }));
}

function listMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

async function runSelfTest() {
  const valid = readFileSync(join(fixturesDir, 'valid-plpgsql.sql'), 'utf8');
  const invalid = readFileSync(join(fixturesDir, 'invalid-extra-paren.sql'), 'utf8');

  const validErrors = await parseSqlFile('fixtures/valid-plpgsql.sql', valid);
  if (validErrors.length > 0) {
    throw new Error(
      `self-test 실패: 올바른 SQL을 오류로 처리함 — ${validErrors.map((e) => e.detail).join('; ')}`
    );
  }

  const invalidErrors = await parseSqlFile('fixtures/invalid-extra-paren.sql', invalid);
  if (invalidErrors.length === 0) {
    throw new Error(
      'self-test 실패: 닫는 괄호가 하나 더 있는 plpgsql를 통과시킴. parser 연동이 동작하지 않습니다.'
    );
  }
}

async function main() {
  const { all, recent } = parseArgs(process.argv.slice(2));
  await runSelfTest();

  const files = listMigrationFiles();
  const selected = all ? files : files.slice(-recent);
  const failures = [];

  for (const name of selected) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8');
    failures.push(...(await parseSqlFile(`supabase/migrations/${name}`, sql)));
  }

  if (failures.length > 0) {
    console.error('check-migration-syntax: PostgreSQL parser 오류');
    for (const row of failures) {
      console.error(`  ${row.file}`);
      console.error(`    ${row.detail}`);
    }
    process.exit(1);
  }

  console.log(
    `check-migration-syntax: ok (${selected.length}/${files.length} files` +
      `${all ? ', all' : `, recent ${selected.length}`}; plpgsql parser self-test pass)`
  );
}

main().catch((err) => {
  console.error('check-migration-syntax: FAIL');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
