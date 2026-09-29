/**
 * Catalog + runner 계약. P20-1 && 체인 집합·순서를 고정한다.
 * npm run test:business-invariants:catalog
 */
import assert from 'node:assert/strict';
import {
  BUSINESS_INVARIANT_RUNNER,
  BUSINESS_INVARIANT_TESTS,
  catalogScriptsInOrder,
  collectCatalogIntegrityErrors,
  inventoryCandidates,
  inventoryGaps,
  loadPackageScripts,
  missingCatalogTargets,
  selectBusinessInvariantTests,
  validateBusinessInvariantCatalog,
} from './businessInvariantTests.mjs';

/** P20-1 package.json && 체인. 항목 삭제·순서 변경 금지. */
const P20_1_BUSINESS_INVARIANT_CHAIN = [
  'test:session-pass-booking-rules',
  'test:session-pass-org-integrity',
  'test:booking-pass-atomic',
  'test:booking-pass-atomic-contract',
  'test:parent-booking-cancel',
  'test:booking-write-path',
  'test:industry-sync-registry',
  'test:industry-catalog',
  'test:industry-normalize',
  'test:industry-manifest',
  'test:industry-contract',
  'test:capability-navigation',
  'test:org-context-resolve',
  'test:org-selection',
  'test:persist-policy',
  'test:persist-schedules',
  'test:attendance-pass-atomic',
  'test:attendance-class-key',
  'test:attendance-features',
  'test:pin-check-in',
  'test:pin-notify-copy',
  'test:absence-notify',
  'test:makeup-schedule-atomic',
  'test:pending-mutations',
  'test:finance',
  'test:create-sale-atomic',
  'test:create-sale-return-atomic',
  'test:stock-movement-atomic',
  'test:sale-return-points',
  'test:point-atomic',
  'test:sale-redeem-consistency',
  'test:point-balance-invariant',
  'test:multi-role-helpers',
  'test:rls-membership-policy',
  'test:permissions-invariant',
  'test:org-access-invariant',
  'test:resource-reservation',
  'test:capacity',
  'test:waitlist',
  'test:operations',
  'test:location',
  'test:authorization',
  'test:location-aware',
  'test:domain-roles',
  'test:audit',
  'test:idempotency',
  'test:outbox',
  'test:metadata-promotion',
  'test:platform-subscription',
  'test:request-context',
  'test:command-executor',
  'test:architecture',
  'test:capability-contract',
  'test:capability-public-api',
  'test:persistence-policy',
  'test:reservation-machine',
  'check:db-types',
];

const scripts = loadPackageScripts();
const errors = collectCatalogIntegrityErrors(scripts);
assert.deepEqual(errors, [], errors.join('\n'));
assert.deepEqual(validateBusinessInvariantCatalog(scripts), []);

const catalog = catalogScriptsInOrder();
const runnerRows = selectBusinessInvariantTests();
const runnerScripts = runnerRows.map((row) => row.script);

assert.deepEqual(catalog, P20_1_BUSINESS_INVARIANT_CHAIN);
assert.deepEqual(runnerScripts, P20_1_BUSINESS_INVARIANT_CHAIN);
assert.equal(BUSINESS_INVARIANT_TESTS.length, P20_1_BUSINESS_INVARIANT_CHAIN.length);
assert.equal(new Set(catalog).size, catalog.length);
assert.equal(scripts['test:business-invariants'], BUSINESS_INVARIANT_RUNNER);
assert.equal(String(scripts['test:business-invariants']).includes('&&'), false);

const missingTargets = missingCatalogTargets(scripts);
assert.deepEqual(missingTargets, [], missingTargets.join('\n'));

const unclassified = inventoryGaps(scripts);
assert.deepEqual(
  unclassified,
  [],
  `classify these scripts in catalog, INVENTORY_OUT_OF_SCOPE, or INVENTORY_CANDIDATES:\n${unclassified.join('\n')}`
);

assert.ok(inventoryCandidates().length > 0);

const financeChildrenInCatalog = catalog.filter((name) =>
  [
    'test:invoice-dedupe',
    'test:monthly-tuition-status',
    'test:tuition-payment-atomic',
  ].includes(name)
);
assert.deepEqual(financeChildrenInCatalog, [], 'do not expand test:finance children in BI catalog');

assert.ok(catalog.includes('test:finance'));
assert.equal(catalog.includes('test:commerce-unit'), false);

const financeOnly = selectBusinessInvariantTests({ group: 'finance' }).map((row) => row.script);
assert.deepEqual(financeOnly, ['test:finance']);

const commerceUnitOverlap = [
  'test:create-sale-atomic',
  'test:create-sale-return-atomic',
  'test:point-atomic',
  'test:sale-redeem-consistency',
  'test:stock-movement-atomic',
  'test:multi-role-helpers',
];
for (const name of commerceUnitOverlap) {
  assert.ok(catalog.includes(name), `${name} stays in BI (commerce-unit overlap is CI-only, not catalog expansion)`);
}

console.log(
  `businessInvariantTests.test.mjs: ok (${catalog.length} scripts match P20-1 chain, ${inventoryCandidates().length} candidates)`
);
