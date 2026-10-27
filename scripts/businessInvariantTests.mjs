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
  { script: 'test:stock-location-scope', group: 'commerce', kind: 'unit', ci: 'always', order: 29 },
  { script: 'test:sale-return-points', group: 'commerce', kind: 'unit', ci: 'always', order: 30 },
  { script: 'test:point-atomic', group: 'commerce', kind: 'unit', ci: 'always', order: 31 },
  { script: 'test:sale-redeem-consistency', group: 'commerce', kind: 'unit', ci: 'always', order: 32 },
  { script: 'test:point-balance-invariant', group: 'commerce', kind: 'invariant', ci: 'suite', order: 33 },
  { script: 'test:multi-role-helpers', group: 'authorization', kind: 'unit', ci: 'always', order: 34 },
  { script: 'test:rls-membership-policy', group: 'authorization', kind: 'contract', ci: 'always', order: 35 },
  { script: 'test:permissions-invariant', group: 'authorization', kind: 'invariant', ci: 'always', order: 36 },
  { script: 'test:org-access-invariant', group: 'organization', kind: 'invariant', ci: 'always', order: 37 },
  { script: 'test:resource-reservation', group: 'resources', kind: 'unit', ci: 'suite', order: 38 },
  { script: 'test:capacity', group: 'scheduling', kind: 'unit', ci: 'suite', order: 39 },
  { script: 'test:waitlist', group: 'booking', kind: 'unit', ci: 'suite', order: 40 },
  { script: 'test:operations', group: 'platform', kind: 'unit', ci: 'suite', order: 41 },
  { script: 'test:location', group: 'platform', kind: 'unit', ci: 'suite', order: 42 },
  { script: 'test:authorization', group: 'authorization', kind: 'unit', ci: 'always', order: 43 },
  { script: 'test:location-aware', group: 'platform', kind: 'unit', ci: 'suite', order: 44 },
  { script: 'test:domain-roles', group: 'scheduling', kind: 'unit', ci: 'suite', order: 45 },
  { script: 'test:audit', group: 'platform', kind: 'unit', ci: 'suite', order: 46 },
  { script: 'test:idempotency', group: 'platform', kind: 'unit', ci: 'suite', order: 47 },
  { script: 'test:outbox', group: 'platform', kind: 'unit', ci: 'suite', order: 48 },
  { script: 'test:metadata-promotion', group: 'platform', kind: 'unit', ci: 'suite', order: 49 },
  { script: 'test:platform-subscription', group: 'platform', kind: 'unit', ci: 'suite', order: 50 },
  { script: 'test:request-context', group: 'platform', kind: 'unit', ci: 'suite', order: 51 },
  { script: 'test:command-executor', group: 'platform', kind: 'unit', ci: 'suite', order: 52 },
  { script: 'test:architecture', group: 'architecture', kind: 'static', ci: 'suite', order: 53 },
  { script: 'test:capability-contract', group: 'capability', kind: 'contract', ci: 'suite', order: 54 },
  { script: 'test:capability-public-api', group: 'capability', kind: 'contract', ci: 'suite', order: 55 },
  { script: 'test:persistence-policy', group: 'persistence', kind: 'unit', ci: 'suite', order: 56 },
  { script: 'test:reservation-machine', group: 'scheduling', kind: 'unit', ci: 'suite', order: 57 },
  { script: 'check:db-types', group: 'architecture', kind: 'static', ci: 'suite', order: 58 },
  { script: 'test:preset-runtime-parity', group: 'industry', kind: 'contract', ci: 'suite', order: 59 },
  { script: 'test:research-project-engine', group: 'capability', kind: 'unit', ci: 'suite', order: 60 },
  { script: 'test:permission-catalog', group: 'authorization', kind: 'unit', ci: 'always', order: 61 },
  { script: 'test:volunteer-activity-engine', group: 'capability', kind: 'unit', ci: 'always', order: 62 },
  { script: 'test:meal-survey-engine', group: 'capability', kind: 'unit', ci: 'always', order: 63 },
  { script: 'test:permission-visibility', group: 'authorization', kind: 'unit', ci: 'always', order: 64 },
  { script: 'test:office-supply-request-engine', group: 'capability', kind: 'unit', ci: 'always', order: 65 },
  { script: 'test:sync-no-diff-delete', group: 'persistence', kind: 'unit', ci: 'always', order: 66 },
  { script: 'test:sync-persist-helpers', group: 'persistence', kind: 'unit', ci: 'always', order: 67 },
  { script: 'test:atomic-booking', group: 'booking', kind: 'contract', ci: 'always', order: 68 },
  { script: 'test:booking-logic', group: 'booking', kind: 'unit', ci: 'always', order: 69 },
  { script: 'test:book-schedule-slot', group: 'booking', kind: 'unit', ci: 'always', order: 70 },
  { script: 'test:jwt-revocation', group: 'authorization', kind: 'contract', ci: 'always', order: 71 },
  { script: 'test:roles-permissions', group: 'authorization', kind: 'unit', ci: 'always', order: 72 },
  { script: 'test:role-matrix', group: 'authorization', kind: 'invariant', ci: 'always', order: 73 },
  { script: 'test:tenant-query', group: 'platform', kind: 'unit', ci: 'always', order: 74 },
  { script: 'test:policy-engine', group: 'capability', kind: 'unit', ci: 'always', order: 75 },
  { script: 'test:app-routing', group: 'platform', kind: 'unit', ci: 'always', order: 76 },
  { script: 'test:industry-resolver', group: 'industry', kind: 'unit', ci: 'always', order: 77 },
  { script: 'test:driver-commute-empty-stops', group: 'resources', kind: 'unit', ci: 'always', order: 78 },
  { script: 'test:plugin-flag-defaults', group: 'industry', kind: 'unit', ci: 'always', order: 79 },
  { script: 'test:industry-id-comparisons', group: 'architecture', kind: 'static', ci: 'always', order: 80 },
  { script: 'test:industry-id-migration', group: 'industry', kind: 'unit', ci: 'always', order: 81 },
  { script: 'test:sop-step-document', group: 'capability', kind: 'unit', ci: 'always', order: 82 },
  { script: 'test:desktop-sop-risk-matrix', group: 'capability', kind: 'static', ci: 'always', order: 83 },
  { script: 'test:approval-line', group: 'capability', kind: 'unit', ci: 'always', order: 84 },
  { script: 'test:mbo-plan-approval', group: 'capability', kind: 'unit', ci: 'always', order: 85 },
  { script: 'test:ep-role-seed', group: 'organization', kind: 'unit', ci: 'always', order: 86 },
  { script: 'test:business-predicates', group: 'platform', kind: 'unit', ci: 'always', order: 87 },
  { script: 'test:db-sandbox-rls-invariants', group: 'authorization', kind: 'invariant', ci: 'always', order: 88 },
  { script: 'test:feature-flags', group: 'platform', kind: 'unit', ci: 'always', order: 89 },
];

/** 메타/그룹 러너 — inventory 후보가 아님 */
export const INVENTORY_META_SCRIPTS = new Set([
  'test:business-invariants',
  'test:business-invariants:list',
  'test:business-invariants:catalog',
  'test:finance:list',
  'test:commerce-unit',
  'check:all',
]);

/**
 * business-invariants에 넣지 않는 스크립트.
 * finance 자식은 test:finance가 이미 실행한다.
 */
export const INVENTORY_OUT_OF_SCOPE = {
  'test:e2e': 'Playwright E2E',
  'test:visual': 'Playwright visual regression',
  'test:modal-focus': 'UI focus',
  'test:user-facing-error': 'shared UI error copy',
  'test:parent-home-copy': 'parent home industry copy',
  'test:roster-piano-copy': 'roster form industry copy',
  'test:enrollment-form-copy': 'roster enrollment form industry copy',
  'test:roster-list-flags': 'roster list industry flags',
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
  'test:customer-attendance-makeup-flag': 'customer attendance makeup list plugin flag unit',
  'test:student-detail-pass-save': 'student detail attendance pass save plugin flag unit',
  'test:customer-practice-room-tab': 'customer portal practice room tab plugin flag unit',
  'test:customer-points-flag': 'customer portal points plugin flag unit',
  'test:public-landing-adult-first': 'public landing adult-first plugin flag unit',
  'test:adult-practice-guide-flag': 'adult student practice guide plugin flag unit',
  'test:staff-practice-guide': 'staff practice-rooms guide plugin flag unit',
  'test:attendance-summary-metric': 'attendance summary metric plugin unit',
  'test:payroll-expense-category': 'payroll expense category plugin unit',
  'test:finance-hub-nav': 'finance hub nav plugin unit',
  'test:linked-income-plugin': 'finance summary linked income plugin flag unit',
  'test:attendance-industry-copy': 'attendance industry copy plugin unit',
  'test:student-exit-label': 'student detail exit label plugin flag unit',
  'test:preset-assembler': 'preset assembler composition unit',
  'test:capability-packs-finance-isolation': 'capability pack grouping & finance isolation invariant',
  'test:ads-cloudflare': 'Cloudflare & AdSlot UI component unit',
  'test:atomic-booking': 'atomic schedule slot booking DB/RPC contract',
  'test:attendance-offline': 'attendance offline IndexedDB queue unit',
  'test:audit-export': 'audit export interceptor unit',
  'test:booking-logic': 'booking available time slot calculation unit',
  'test:jwt-revocation': 'JWT revocation token_version RLS contract',
  'test:login-form': 'mobile responsive social login form UI unit',
  'test:auth-storage': 'auth storage adapter & rememberMe session partitioning unit',
  'test:policy-engine': 'workplace policy pure domain engine & compliance unit',
  'test:operation-bundles': 'operation tool sets catalog & DAG transitive resolution unit',
  'test:switchboard-store': 'settings store & toolset toggle unit',
  'test:domain-event-bus': 'core in-app domain event bus unit & fault-boundary test',
  'test:capability-listener': 'capability decoupled event listeners integration test',
  'test:schema-form': 'dynamic schema form builder and all capability setup schema compatibility unit',
  'test:business-health': 'industry-specific business health diagnostic engine & action tips unit',
  'test:role-matrix': 'zero-config role template matrix & financial isolation invariant',
  'test:handover-engine': 'handover and feedbacks domain engine unit',
  'test:pass-holding': 'pass holding & family pool sharing domain engine unit',
  'test:trial-funnel': 'trial lead funnel and conversion domain engine unit',
  'test:learning-journal': 'learning journal and parent feed domain engine unit',
  'test:level-assessment': 'level assessment and mobile certificate generator domain engine unit',
  'test:space-turnaround': 'space turnaround buffer and cleaning checklist domain engine unit',
  'test:supply-restock': 'supply restock safety margin and purchase order domain engine unit',
  'test:makeup-lesson': 'absence makeup token issuance and open slot matching engine unit',
  'test:intake-assessment': 'intake assessment questionnaire and risk flag analyzer engine unit',
  'test:daily-care-report': 'daily care log and W3C SVG card generator engine unit',
  'test:substitute-dispatch': 'substitute teacher request and bid approval domain engine unit',
  'test:entry-pass-ticket': 'mobile entry pass ticket issuance and duplicate scan guard domain engine unit',
  'test:event-contest': 'event contest registration cue sheet and SVG award domain engine unit',
  'test:facility-incident': 'facility incident report and insurance claim domain engine unit',
  'test:nps-survey': 'mobile NPS survey collector and feedback analytics domain engine unit',
  'test:achievement-quest': 'achievement quest badge gamification and SVG award domain engine unit',
  'test:parking-validator': 'parking validator free parking registration and calculation domain engine unit',
  'test:emergency-alert': 'emergency alert broadcast and mobile ack tracking domain engine unit',
  'test:digital-guestbook': 'digital guestbook visitor registration and marketing consent domain engine unit',
  'test:human-capital-kpi': 'ISO 30414 human capital reporting KPI and metrics calculation domain engine unit',
  'test:mbo-engine': 'mbo objectives hierarchy approval workflow and evaluation domain engine unit',
  'test:mbo-plan-approval': 'mbo plan require_plan_approval gate and approval_workflow content unit',
  'test:ep-role-seed': 'EP zero-setup preset permission tokens to RolePermissionMap unit',
  'test:business-predicates': 'pure domain business predicates, edge-case unit & calculation invariants',
  'test:approval-engine': 'approval workflow sequential multi-step approval state machine unit',
  'test:approval-line': 'approval workflow chosen reviewer/approver line unit',
  'test:quality-inspection': 'quality inspection tolerance judgment and statistical process capability unit',
  'test:change-management': '4M engineering change order readiness evaluation and risk assessment unit',
  'test:webhook-gateway': 'external lead and MES webhook HMAC-SHA256 signature verification and ingestion unit',
  'test:safe-transfer': 'customer identity safe transfer RPC contract',
  'test:stamp-resizer': 'canvas stamp resizer util unit',
  'test:tenant-query': 'tenant query keys factory unit',
  'test:vite-preload': 'Vite preload error recovery handler unit',
  'test:session-pass-mappers': 'session pass & core.passes adapter mapper unit',
  'test:cross-cache-bridge': 'Refine QueryClient & StorageService cross-cache bridge unit',
  'test:book-schedule-slot': 'atomic schedule slot booking client & local mirror unit',
  'test:roles-permissions': 'tenant roles and permission matrix validation unit',
  'test:logger': 'Central logger and sensitive data masking unit',
  'test:network-status': 'PWA online and offline state observer unit',
  'test:auth-signup': 'auth signup input validation and legal agreement invariants unit',
  'test:login-bootstrap': 'login bootstrap RPC fault isolation and soft-fail resilience unit',
  'test:org-onboarding': 'organization multi-fallback and new user onboarding state machine unit',
  'test:auth-onboarding-suite': 'composite suite for auth, bootstrap resilience, and org onboarding',
};

/**
 * BI 후보이지만 이번 목록에 없는 스크립트.
 * 자동 편입하지 않는다. 새 스크립트는 catalog / out-of-scope / 여기 중 하나에 분류해야 한다.
 */
export const INVENTORY_CANDIDATES = {
  'test:types-ownership': 'P19 type ownership. architecture 후보',
  'test:industry-capability-map': 'industry contract 후보',
  'test:booking-query': 'booking unit 후보',
  'test:reschedule-booking': 'booking capability rescheduleBooking domain unit 후보',
  'test:attendance-pipeline': 'attendance capability unified attendance pipeline unit 후보',
  'test:payroll-calc-metrics': 'finance teacher payroll performance metrics calculation unit 후보',
  'test:roster-schema': 'roster capability industry roster schema configuration unit 후보',
  'test:data-provider': 'authorization(dataProvider tenant pinning and guard) 후보',
  'test:terminology': 'industry(universal taxonomy and terminology dictionary) 후보',
  'test:resource': 'resources capability. reservation과 별개',
  'test:availability': 'scheduling capability 후보',
  'test:customer-session': 'platform/session 후보',
  'test:hydrate-modules': 'persistence 후보',
  'test:clear-business-caches': 'persistence 후보',
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
  'test:account-linking-security': 'authorization(account linking & token rpc security hardening). ci-cd static security에 있음',
  'test:tenant-isolation': 'authorization(tenant data isolation & rls regression hardening). ci-cd static security에 있음',
  'test:access-control': 'authorization(refine access control adapter integration). ci-cd static security에 있음',
  'test:student-crud': 'students(refine student crud data provider contract). ci-cd static integration에 있음',
  'test:logout-protection': 'auth(conditional logout protection with offline pending mutation guard). ci-cd static integration에 있음',
  'test:settings-storage': 'persistence/settings(multi-vertical settings deep merge). candidate',
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

