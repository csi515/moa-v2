/**
 * test:business-invariants 선언 카탈로그.
 * 실행은 scripts/run-business-invariant-tests.mjs.
 *
 *   npm run test:business-invariants
 *   npm run test:business-invariants -- --list
 *   npm run test:business-invariants -- --group finance
 *   npm run test:business-invariants:catalog
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const packageJsonPath = join(root, 'package.json');

/** @typedef {'scheduling'|'booking'|'industry'|'organization'|'persistence'|'attendance'|'finance'|'commerce'|'authorization'|'resources'|'platform'|'architecture'|'capability'|'other'} BusinessInvariantGroup */
/** @typedef {'unit'|'contract'|'invariant'|'static'|'integration'} BusinessInvariantKind */
/** @typedef {'always'|'suite'|'manual'} BusinessInvariantCi */

export const BUSINESS_INVARIANT_GROUPS = [
  'scheduling',
  'booking',
  'industry',
  'organization',
  'persistence',
  'attendance',
  'finance',
  'commerce',
  'authorization',
  'resources',
  'platform',
  'architecture',
  'capability',
  'other',
];

export const BUSINESS_INVARIANT_KINDS = ['unit', 'contract', 'invariant', 'static', 'integration'];
export const BUSINESS_INVARIANT_CIS = ['always', 'suite', 'manual'];

export const BUSINESS_INVARIANT_RUNNER = 'node scripts/run-business-invariant-tests.mjs';

/**
 * 현재 test:business-invariants && 체인과 1:1.
 * test:finance / test:commerce-unit 하위 스크립트를 여기 다시 펼치지 않는다.
 *
 * @type {Array<{
 *   script: string,
 *   group: BusinessInvariantGroup,
 *   kind: BusinessInvariantKind,
 *   ci: BusinessInvariantCi,
 *   order: number,
 *   note?: string
 * }>}
 */
export const BUSINESS_INVARIANT_TESTS = [
  { script: 'test:session-pass-booking-rules', group: 'scheduling', kind: 'unit', ci: 'suite', order: 1 },
  {
    script: 'test:session-pass-org-integrity',
    group: 'organization',
    kind: 'contract',
    ci: 'always',
    order: 2,
    note: 'migration SQL 계약. live DB는 test:session-pass-org-integrity-db',
  },
  { script: 'test:booking-pass-atomic', group: 'booking', kind: 'unit', ci: 'suite', order: 3 },
  { script: 'test:booking-pass-atomic-contract', group: 'booking', kind: 'contract', ci: 'always', order: 4 },
  { script: 'test:parent-booking-cancel', group: 'booking', kind: 'unit', ci: 'suite', order: 5 },
  { script: 'test:booking-write-path', group: 'booking', kind: 'unit', ci: 'suite', order: 6 },
  { script: 'test:industry-sync-registry', group: 'industry', kind: 'unit', ci: 'suite', order: 7 },
  { script: 'test:industry-catalog', group: 'industry', kind: 'contract', ci: 'suite', order: 8 },
  { script: 'test:industry-normalize', group: 'industry', kind: 'unit', ci: 'suite', order: 9 },
  { script: 'test:industry-manifest', group: 'industry', kind: 'contract', ci: 'suite', order: 10 },
  { script: 'test:industry-contract', group: 'industry', kind: 'contract', ci: 'suite', order: 11 },
  { script: 'test:capability-navigation', group: 'capability', kind: 'contract', ci: 'suite', order: 12 },
  { script: 'test:org-context-resolve', group: 'organization', kind: 'unit', ci: 'suite', order: 13 },
  { script: 'test:org-selection', group: 'organization', kind: 'unit', ci: 'suite', order: 14 },
  { script: 'test:persist-policy', group: 'persistence', kind: 'unit', ci: 'always', order: 15 },
  { script: 'test:persist-schedules', group: 'persistence', kind: 'unit', ci: 'always', order: 16 },
  { script: 'test:attendance-pass-atomic', group: 'attendance', kind: 'contract', ci: 'always', order: 17 },
  { script: 'test:attendance-class-key', group: 'attendance', kind: 'unit', ci: 'always', order: 18 },
  { script: 'test:attendance-features', group: 'attendance', kind: 'unit', ci: 'always', order: 19 },
  { script: 'test:pin-check-in', group: 'attendance', kind: 'unit', ci: 'suite', order: 20 },
  { script: 'test:pin-notify-copy', group: 'attendance', kind: 'unit', ci: 'suite', order: 21 },
  { script: 'test:absence-notify', group: 'attendance', kind: 'unit', ci: 'always', order: 22 },
  { script: 'test:makeup-schedule-atomic', group: 'scheduling', kind: 'contract', ci: 'always', order: 23 },
  { script: 'test:pending-mutations', group: 'persistence', kind: 'unit', ci: 'always', order: 24 },
  {
    script: 'test:finance',
    group: 'finance',
    kind: 'unit',
    ci: 'always',
    order: 25,
    note: 'nested runner scripts/run-finance-tests.mjs — 자식 스크립트를 이 카탈로그에 펼치지 않음',
  },
  { script: 'test:create-sale-atomic', group: 'commerce', kind: 'unit', ci: 'always', order: 26 },
  { script: 'test:create-sale-return-atomic', group: 'commerce', kind: 'unit', ci: 'always', order: 27 },
  { script: 'test:stock-movement-atomic', group: 'commerce', kind: 'unit', ci: 'always', order: 28 },
  { script: 'test:sale-return-points', group: 'commerce', kind: 'unit', ci: 'always', order: 29 },
  { script: 'test:point-atomic', group: 'commerce', kind: 'unit', ci: 'always', order: 30 },
  { script: 'test:sale-redeem-consistency', group: 'commerce', kind: 'unit', ci: 'always', order: 31 },
  { script: 'test:point-balance-invariant', group: 'commerce', kind: 'invariant', ci: 'suite', order: 32 },
  { script: 'test:multi-role-helpers', group: 'authorization', kind: 'unit', ci: 'always', order: 33 },
  { script: 'test:rls-membership-policy', group: 'authorization', kind: 'contract', ci: 'always', order: 34 },
  { script: 'test:permissions-invariant', group: 'authorization', kind: 'invariant', ci: 'always', order: 35 },
  { script: 'test:org-access-invariant', group: 'organization', kind: 'invariant', ci: 'always', order: 36 },
  { script: 'test:resource-reservation', group: 'resources', kind: 'unit', ci: 'suite', order: 37 },
  { script: 'test:capacity', group: 'scheduling', kind: 'unit', ci: 'suite', order: 38 },
  { script: 'test:waitlist', group: 'booking', kind: 'unit', ci: 'suite', order: 39 },
  { script: 'test:operations', group: 'platform', kind: 'unit', ci: 'suite', order: 40 },
  { script: 'test:location', group: 'platform', kind: 'unit', ci: 'suite', order: 41 },
  { script: 'test:authorization', group: 'authorization', kind: 'unit', ci: 'always', order: 42 },
  { script: 'test:location-aware', group: 'platform', kind: 'unit', ci: 'suite', order: 43 },
  { script: 'test:domain-roles', group: 'scheduling', kind: 'unit', ci: 'suite', order: 44 },
  { script: 'test:audit', group: 'platform', kind: 'unit', ci: 'suite', order: 45 },
  { script: 'test:idempotency', group: 'platform', kind: 'unit', ci: 'suite', order: 46 },
  { script: 'test:outbox', group: 'platform', kind: 'unit', ci: 'suite', order: 47 },
  { script: 'test:metadata-promotion', group: 'platform', kind: 'unit', ci: 'suite', order: 48 },
  { script: 'test:platform-subscription', group: 'platform', kind: 'unit', ci: 'suite', order: 49 },
  { script: 'test:request-context', group: 'platform', kind: 'unit', ci: 'suite', order: 50 },
  { script: 'test:command-executor', group: 'platform', kind: 'unit', ci: 'suite', order: 51 },
  { script: 'test:architecture', group: 'architecture', kind: 'static', ci: 'suite', order: 52 },
  { script: 'test:capability-contract', group: 'capability', kind: 'contract', ci: 'suite', order: 53 },
  { script: 'test:capability-public-api', group: 'capability', kind: 'contract', ci: 'suite', order: 54 },
  { script: 'test:persistence-policy', group: 'persistence', kind: 'unit', ci: 'suite', order: 55 },
  { script: 'test:reservation-machine', group: 'scheduling', kind: 'unit', ci: 'suite', order: 56 },
  { script: 'check:db-types', group: 'architecture', kind: 'static', ci: 'suite', order: 57 },
];

/** 메타/그룹 러너 — inventory 후보가 아님 */
export const INVENTORY_META_SCRIPTS = new Set([
  'test:business-invariants',
  'test:business-invariants:list',
  'test:business-invariants:catalog',
  'test:finance:list',
  'test:commerce-unit',
]);

/**
 * business-invariants에 넣지 않는 스크립트.
 * finance 자식은 test:finance가 이미 실행한다.
 */
export const INVENTORY_OUT_OF_SCOPE = {
  'test:e2e': 'Playwright E2E',
  'test:modal-focus': 'UI focus',
  'test:user-facing-error': 'shared UI error copy',
  'test:parent-home-copy': 'parent home industry copy',
  'test:roster-piano-copy': 'roster form industry copy',
  'test:enrollment-form-copy': 'roster enrollment form industry copy',
  'test:parent-more-menu': 'parent more menu industry copy',
  'test:foreground-coordinator': 'mobile/app lifecycle',
  'test:mobile-lifecycle': 'mobile lifecycle',
  'test:student-form-validation': 'form UI validation',
  'test:nav-utils': 'nav helper unit',
  'test:authorization-api': 'UI authorization adapter unit; authorization engine is covered by test:authorization',
  'test:storage-refresh': 'hook unit',
  'test:local-date': 'shared date util',
  'test:migration-syntax': 'lint/check:migration-syntax와 중복',
  'test:invoice-dedupe': 'test:finance 자식',
  'test:invoice-textbook-link': 'test:finance 자식',
  'test:invoice-model': 'test:finance 자식',
  'test:latest-tuition-payment': 'test:finance 자식',
  'test:invoice-payment-service': 'test:finance 자식',
  'test:monthly-tuition-status': 'test:finance 자식',
  'test:monthly-tuition-eligibility': 'test:finance 자식',
  'test:monthly-tuition-ensure': 'test:finance 자식',
  'test:record-combined-payment': 'test:finance 자식',
  'test:combined-payment-selection': 'test:finance 자식',
  'test:finance-payment-mirror': 'test:finance 자식',
  'test:tuition-payment-atomic': 'test:finance 자식',
  'test:combined-payment-atomic': 'test:finance 자식',
  'test:textbook-payment-atomic': 'test:finance 자식',
  'test:commerce-barrel': 'test:commerce-unit 전용. BI에는 개별 commerce atomic만',
  'test:commerce-revenue': 'test:commerce-unit 전용',
  'test:commerce-store-capability': 'test:commerce-unit 전용',
  'test:retail-revenue': 'test:commerce-unit 전용',
  'test:commerce-db-it': 'live DB integration',
  'test:textbook-sale-db-it': 'live DB integration',
  'test:booking-pass-atomic-db': 'live DB integration',
  'test:session-pass-org-integrity-db': 'live DB integration',
  'test:rls-audit': '별도 security CI',
  'test:rls-membership-escalation': '별도 security CI',
  'test:auth-hijack-audit': '별도 security CI',
  'test:timetable-placement': 'piano UI',
  'test:today-lesson-teacher': 'piano UI',
  'test:consultation-today': 'piano UI',
  'test:piano-expected-attendance': 'piano UI',
  'test:lesson-homework-sync': 'piano UI',
  'test:manual-attendance-class': 'academy UI',
  'test:skin-retail-migrate': 'skin industry migrate',
  'test:textbook-core-sale-link': 'piano commerce 연결',
  'test:textbook-sale-legacy': 'piano textbook',
  'test:textbook-sale-compensate': 'piano textbook',
  'test:textbook-sale-db-write': 'piano textbook',
  'test:textbook-catalog-persist': 'piano textbook',
  'test:bath-visit': 'bath industry',
  'test:bath-room': 'bath industry',
  'test:bath-service': 'bath industry',
  'test:bath-booking': 'bath industry',
  'test:pilates-booking-validate': 'pilates UI',
  'test:retail-staff-sale-perm': 'retail staff CI',
  'test:daycare-ops': 'daycare sync',
  'test:expense-categories': 'industry expense category plugin unit',
  'test:pin-checkin-side-effect': 'pin check-in side effect plugin flag unit',
};

/**
 * BI 후보이지만 이번 목록에 없는 스크립트.
 * 자동 편입하지 않는다. 새 스크립트는 catalog / out-of-scope / 여기 중 하나에 분류해야 한다.
 */
export const INVENTORY_CANDIDATES = {
  'test:types-ownership': 'P19 type ownership. architecture 후보',
  'test:industry-capability-map': 'industry contract 후보',
  'test:booking-query': 'booking unit 후보',
  'test:resource': 'resources capability. reservation과 별개',
  'test:availability': 'scheduling capability 후보',
  'test:customer-session': 'platform/session 후보',
  'test:hydrate-modules': 'persistence 후보',
  'test:clear-business-caches': 'persistence 후보',
  'test:sync-persist-helpers': 'persistence 후보',
  'test:create-organization-phone': 'organization 후보',
  'test:deeplink': 'platform. ci-cd에 있음',
  'test:bulk-import': 'students import. ci-cd에 있음',
  'test:rls-member-scope-harden': 'authorization. ci-cd에 있음',
  'test:parent-link-hotfix': 'authorization(parent/staff link). ci-cd static security에 있음',
  'test:staff-invite-token': 'authorization(staff invite token). ci-cd static security에 있음',
  'test:guardian-link-hardening': 'authorization(guardian link token/rate limit). ci-cd static security에 있음',
  'test:guardian-redeem-new-parent': 'authorization(guardian redeem new parent / re-point). ci-cd static security에 있음',
  'test:legacy-public-lockdown': 'authorization(legacy public tables drop / anon exposure). ci-cd static security에 있음',
  'test:legacy-booking-cleanup': 'authorization(legacy booking-app public objects drop / anon exposure). ci-cd static security에 있음',
  'test:grant-authenticated-payroll-join-requests': 'authorization(core payroll/join request table grants + hydrate table grant coverage). ci-cd static security에 있음',
  'test:security-boundary-harden': 'authorization(rls and rpc boundary hardening). ci-cd static security에 있음',
  'test:access-control': 'authorization(refine access control adapter integration). ci-cd static security에 있음',
  'test:student-crud': 'students(refine student crud data provider contract). ci-cd static integration에 있음',
  'test:logout-protection': 'auth(conditional logout protection with offline pending mutation guard). ci-cd static integration에 있음',
};

export function loadPackageScripts() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return pkg.scripts ?? {};
}

export function catalogScriptsInOrder(rows = BUSINESS_INVARIANT_TESTS) {
  return [...rows].sort((a, b) => a.order - b.order).map((row) => row.script);
}

/**
 * @param {{ group?: string, kind?: string, ci?: string }} [filters]
 */
export function selectBusinessInvariantTests(filters = {}) {
  const group = filters.group || '';
  const kind = filters.kind || '';
  const ci = filters.ci || '';
  return [...BUSINESS_INVARIANT_TESTS]
    .sort((a, b) => a.order - b.order)
    .filter((row) => {
      if (group && row.group !== group) return false;
      if (kind && row.kind !== kind) return false;
      if (ci && row.ci !== ci) return false;
      if (!ci && row.ci === 'manual') return false;
      return true;
    });
}

export function validateBusinessInvariantCatalog(scripts = loadPackageScripts()) {
  const errors = [];
  const seen = new Set();
  const orders = new Set();

  for (const row of BUSINESS_INVARIANT_TESTS) {
    if (seen.has(row.script)) errors.push(`duplicate script: ${row.script}`);
    seen.add(row.script);
    if (!BUSINESS_INVARIANT_GROUPS.includes(row.group)) {
      errors.push(`invalid group for ${row.script}: ${row.group}`);
    }
    if (!BUSINESS_INVARIANT_KINDS.includes(row.kind)) {
      errors.push(`invalid kind for ${row.script}: ${row.kind}`);
    }
    if (!BUSINESS_INVARIANT_CIS.includes(row.ci)) {
      errors.push(`invalid ci for ${row.script}: ${row.ci}`);
    }
    if (!Number.isInteger(row.order) || row.order < 1) {
      errors.push(`invalid order for ${row.script}: ${row.order}`);
    }
    if (orders.has(row.order)) errors.push(`duplicate order: ${row.order} (${row.script})`);
    orders.add(row.order);
    if (!scripts[row.script]) errors.push(`missing package script: ${row.script}`);
  }

  const runner = String(scripts['test:business-invariants'] || '').trim();
  if (runner !== BUSINESS_INVARIANT_RUNNER) {
    errors.push(`test:business-invariants must be "${BUSINESS_INVARIANT_RUNNER}", got: ${runner || '(missing)'}`);
  }

  return errors;
}

export function collectCatalogIntegrityErrors(scripts = loadPackageScripts()) {
  return [
    ...validateBusinessInvariantCatalog(scripts),
    ...missingCatalogTargets(scripts).map((row) => `missing target: ${row}`),
    ...inventoryGaps(scripts).map((name) => `unclassified test script: ${name}`),
  ];
}

function scriptTargetPath(command) {
  if (typeof command !== 'string') return null;
  const tsx = command.match(/\btsx\s+(\S+\.(?:test\.)?(?:ts|tsx|mjs|js))/);
  if (tsx) return tsx[1];
  const node = command.match(/\bnode(?:\s+\S+)*\s+(scripts\/\S+\.(?:mjs|js|ts))/);
  if (node) return node[1];
  return null;
}

export function missingCatalogTargets(scripts = loadPackageScripts()) {
  const missing = [];
  for (const row of BUSINESS_INVARIANT_TESTS) {
    const command = scripts[row.script];
    const target = scriptTargetPath(command);
    if (!target) continue;
    if (!existsSync(join(root, target))) missing.push(`${row.script} → ${target}`);
  }
  return missing;
}

export function inventoryGaps(scripts = loadPackageScripts()) {
  const catalog = new Set(BUSINESS_INVARIANT_TESTS.map((row) => row.script));
  const unclassified = [];
  for (const name of Object.keys(scripts).sort()) {
    if (!name.startsWith('test:') && name !== 'check:db-types') continue;
    if (catalog.has(name)) continue;
    if (INVENTORY_META_SCRIPTS.has(name)) continue;
    if (INVENTORY_OUT_OF_SCOPE[name]) continue;
    if (INVENTORY_CANDIDATES[name]) continue;
    unclassified.push(name);
  }
  return unclassified;
}

export function inventoryCandidates() {
  return Object.entries(INVENTORY_CANDIDATES).map(([script, note]) => ({ script, note }));
}

export function printBusinessInvariantCatalog() {
  const rows = [...BUSINESS_INVARIANT_TESTS].sort((a, b) => a.order - b.order);
  console.log(`Business invariant catalog (${rows.length} scripts, catalog order)\n`);
  let current = '';
  for (const row of rows) {
    if (row.group !== current) {
      current = row.group;
      console.log(`[${row.group}]`);
    }
    const note = row.note ? ` — ${row.note}` : '';
    console.log(
      `  ${String(row.order).padStart(2, ' ')} ${row.script.padEnd(38)} ${row.kind.padEnd(10)} ci=${row.ci}${note}`
    );
  }
  const candidates = inventoryCandidates();
  if (candidates.length > 0) {
    console.log('\nInventory candidates (not in suite, not auto-included)');
    for (const row of candidates) {
      console.log(`  ${row.script.padEnd(38)} ${row.note}`);
    }
  }
}

