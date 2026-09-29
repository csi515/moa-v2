/**
 * Finance 테스트 실행 카탈로그.
 *
 *   npm run test:finance           unit + contract
 *   npm run test:finance -- --list
 *   npm run test:finance -- --group payment
 *
 * kind:
 *   unit     — 순수 JS/TS, DB 없음
 *   contract — migration SQL 문자열 계약. live DB 없음
 *   db       — live Supabase. Finance 묶음에는 없음
 *
 * ci:
 *   always — quality + ci-cd 에서 자주 도는 핵심
 *   suite  — test:finance / business-invariants 에서 실행
 */
import { spawnSync } from 'node:child_process';

/** @typedef {'billing'|'invoice'|'payment'|'income'|'reconciliation'} FinanceGroup */
/** @typedef {'unit'|'contract'|'db'} FinanceKind */
/** @typedef {'always'|'suite'} FinanceCi */

/** @type {Array<{ script: string, group: FinanceGroup, kind: FinanceKind, ci: FinanceCi, note?: string }>} */
export const FINANCE_TESTS = [
  { script: 'test:monthly-tuition-status', group: 'billing', kind: 'unit', ci: 'suite' },
  { script: 'test:monthly-tuition-eligibility', group: 'billing', kind: 'unit', ci: 'suite' },
  { script: 'test:monthly-tuition-ensure', group: 'billing', kind: 'unit', ci: 'suite' },
  { script: 'test:invoice-dedupe', group: 'invoice', kind: 'unit', ci: 'always' },
  { script: 'test:invoice-textbook-link', group: 'invoice', kind: 'unit', ci: 'suite' },
  { script: 'test:invoice-model', group: 'invoice', kind: 'unit', ci: 'suite' },
  { script: 'test:latest-tuition-payment', group: 'invoice', kind: 'unit', ci: 'always' },
  {
    script: 'test:invoice-payment-service',
    group: 'invoice',
    kind: 'unit',
    ci: 'suite',
    note: 'income 연동(sourceId)도 이 파일에서 검증',
  },
  { script: 'test:tuition-payment-atomic', group: 'payment', kind: 'contract', ci: 'always' },
  { script: 'test:combined-payment-atomic', group: 'payment', kind: 'contract', ci: 'always' },
  { script: 'test:textbook-payment-atomic', group: 'payment', kind: 'contract', ci: 'always' },
  { script: 'test:record-combined-payment', group: 'payment', kind: 'unit', ci: 'always' },
  { script: 'test:combined-payment-selection', group: 'payment', kind: 'unit', ci: 'always' },
  { script: 'test:finance-payment-mirror', group: 'reconciliation', kind: 'unit', ci: 'always' },
];

const GROUP_ORDER = ['billing', 'invoice', 'payment', 'reconciliation'];

function parseArgs(argv) {
  const args = { list: false, group: '', kind: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--list') args.list = true;
    if (token === '--group') args.group = String(argv[i + 1] || '');
    if (token === '--kind') args.kind = String(argv[i + 1] || '');
  }
  return args;
}

function selectedTests(args) {
  return FINANCE_TESTS.filter((row) => {
    if (args.group && row.group !== args.group) return false;
    if (args.kind && row.kind !== args.kind) return false;
    return row.kind !== 'db';
  });
}

function printCatalog(rows) {
  console.log('Finance test catalog (no live DB in this suite)\n');
  for (const group of GROUP_ORDER) {
    const items = rows.filter((row) => row.group === group);
    if (items.length === 0) continue;
    console.log(`[${group}]`);
    for (const row of items) {
      const note = row.note ? ` — ${row.note}` : '';
      console.log(`  ${row.script.padEnd(36)} ${row.kind.padEnd(10)} ci=${row.ci}${note}`);
    }
    console.log('');
  }
  console.log('income: invoice-payment-service에 포함 (별도 파일 없음)');
  console.log('db:     없음. live는 test:textbook-sale-db-it / test:commerce-db-it');
}

function runScript(script) {
  const result = spawnSync('npm', ['run', script], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  return result.status === 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.group && !GROUP_ORDER.includes(args.group) && args.group !== 'income') {
    console.error(`unknown group: ${args.group}`);
    process.exit(1);
  }
  if (args.kind && !['unit', 'contract', 'db'].includes(args.kind)) {
    console.error(`unknown kind: ${args.kind}`);
    process.exit(1);
  }
  if (args.kind === 'db') {
    console.log('Finance live DB tests: none. Use npm run test:textbook-sale-db-it');
    process.exit(0);
  }

  const rows = selectedTests(args);
  if (args.list) {
    printCatalog(rows);
    process.exit(0);
  }
  if (rows.length === 0) {
    console.error('no finance tests matched');
    process.exit(1);
  }

  for (const group of GROUP_ORDER) {
    const items = rows.filter((row) => row.group === group);
    if (items.length === 0) continue;
    console.log(`\n== finance ${group} ==`);
    for (const row of items) {
      if (!runScript(row.script)) process.exit(1);
    }
  }
}

main();
