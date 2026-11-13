/**
 * UI 일관성 정적 검사기 (UI-CONSISTENCY-GUARD)
 *
 * 앱 전반의 UI 일관성과 웹 접근성(A11y), 키보드 트랩 보장을 위해
 * 개별 화면/컴포넌트에서 인라인으로 'fixed inset-0' 팝업을 직접 구현하는 것을 금지하고,
 * 공통 프리미티브인 '@/shared/components/ui/Modal'을 경유하도록 감시합니다.
 *
 * 실행: node scripts/check-ui-consistency.mjs [--self-test]
 */

import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'src');

function toPosix(p) {
  return relative(root, p).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(tsx|jsx)$/.test(entry.name) && !/\.test\.(tsx|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * 인라인 모달 허용 목록 (정당한 사유가 있는 저수준/특수 컴포넌트: 전체화면 키오스크, 사이드 드로어 등)
 */
export const ALLOWED_MODAL_FILES = new Set([
  'src/shared/components/ui/Modal.tsx',
  'src/shared/components/ConfirmDialog.tsx',
  'src/shared/components/ToastContainer.tsx',
  'src/shared/components/OnboardingWizard.tsx',
  'src/shared/components/notifications/NotificationDrawer.tsx',
  'src/components/ui/app-drawer.tsx',
  'src/industries/piano/components/kiosk/LobbyAttendanceKioskView.tsx',
  'src/industries/piano/components/quickAction/PianoQuickActionBottomSheet.tsx',
  'src/components/kiosk/KioskPinExitModal.tsx',
  'src/pages/workspace/CompanyAppLauncherDashboard.tsx',
]);

/**
 * 기존 레거시 인라인 모달 파일 베이스라인.
 * 점진적으로 공통 Modal로 교체하며 제거해 나감. 신규 추가는 차단됨.
 */
export const LEGACY_MODAL_BASELINE = new Set([
  'src/capabilities/mbo/ui/MboRevisionTimelineModal.tsx',
  'src/capabilities/mbo/ui/OrganizationMemberPickerModal.tsx',
  'src/capabilities/mbo/ui/ProjectCategoryManager.tsx',
  'src/capabilities/resources/ui/UniversalResourceCalendarView.tsx',
  'src/capabilities/roster/components/StudentBulkImportModal.tsx',
  'src/capabilities/roster/components/schedule/BulkScheduleAssignModal.tsx',
  'src/capabilities/safety_consent/ui/ConsentSignatureModal.tsx',
  'src/capabilities/sop_risk_assessment/components/ApprovalActionModal.tsx',
  'src/capabilities/sop_risk_assessment/components/RevisionHistoryModal.tsx',
  'src/capabilities/sop_risk_assessment/components/SopDocumentModals.tsx',
  'src/capabilities/sop_risk_assessment/components/WorkerRepledgeModal.tsx',
  'src/core/legal/LegalModal.tsx',
  'src/core/platform/KeyboardShortcutsModal.tsx',
  'src/industries/piano/components/dashboard/director/DirectorInteractiveOnboardingWizard.tsx',
  'src/industries/piano/components/dashboard/director/FavoriteMenuQuickDock.tsx',
  'src/modules/parent/ParentAddChildModal.tsx',
  'src/modules/parent/ParentChildSelectorModal.tsx',
  'src/modules/parent/ParentEnrollmentConsentModal.tsx',
  'src/modules/parent/ParentInviteResultModal.tsx',
  'src/modules/parent/ParentLinkConsentModal.tsx',
  'src/modules/parent/ParentRequestEnrollmentModal.tsx',
  'src/modules/parent/components/ParentEnrollmentPinEditor.tsx',
  'src/pages/organization/OrganizationGovernancePanel.tsx',
  'src/shared/components/PwaInstallPrompt.tsx',
]);

export function scanUiConsistencyViolations() {
  const violations = [];
  const files = walk(srcDir);

  const INLINE_MODAL_PATTERN = /(?:fixed\s+inset-0|inset-0\s+fixed)[^"'>]*?(?:z-[0-9]+|bg-)/;

  for (const file of files) {
    const rel = toPosix(file);
    if (ALLOWED_MODAL_FILES.has(rel) || LEGACY_MODAL_BASELINE.has(rel)) {
      continue;
    }

    const source = stripComments(readFileSync(file, 'utf8'));

    // 1. 인라인 모달 안티패턴 탐지
    if (INLINE_MODAL_PATTERN.test(source) && (source.includes('role="dialog"') || source.includes('aria-modal='))) {
      violations.push({
        file: rel,
        type: 'inline_modal_antipattern',
        message: `공통 컴포넌트 '@/shared/components/ui/Modal'을 사용하지 않고 직접 인라인 모달(fixed inset-0)을 작성했습니다. 웹 접근성(A11y)과 디자인 일관성을 위해 공통 Modal을 사용하세요.`,
      });
    }
  }

  return violations;
}

export function runSelfTest() {
  console.log('Running check-ui-consistency self-test...');
  const probeFile = join(srcDir, 'shared', '_ui_consistency_probe.tmp.tsx');

  try {
    writeFileSync(
      probeFile,
      `export const BadModal = () => (<div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true">test</div>);`,
      'utf8'
    );

    const violations = scanUiConsistencyViolations();
    const probeHit = violations.some((v) => v.file.includes('_ui_consistency_probe.tmp.tsx'));

    if (!probeHit) {
      throw new Error('check-ui-consistency: self-test probe violation not detected.');
    }
    console.log('Self-test: probe violation successfully caught ok');
  } finally {
    if (existsSync(probeFile)) {
      unlinkSync(probeFile);
    }
  }

  const cleanViolations = scanUiConsistencyViolations();
  const leftoverHit = cleanViolations.some((v) => v.file.includes('_ui_consistency_probe.tmp.tsx'));
  if (leftoverHit) {
    throw new Error('check-ui-consistency: probe cleanup failed.');
  }
  console.log('check-ui-consistency: self-test ok');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else {
  const violations = scanUiConsistencyViolations();
  if (violations.length > 0) {
    console.error('\n❌ [UI-CONSISTENCY-GUARD] UI 일관성 위반이 감지되었습니다:');
    for (const v of violations) {
      console.error(`  - [${v.type}] ${v.file}`);
      console.error(`    ${v.message}`);
    }
    console.error('\n신규 모달은 반드시 @/shared/components/ui/Modal을 사용해 일관된 디자인과 접근성을 보장하세요.\n');
    process.exit(1);
  }
  console.log('check-ui-consistency: ok');
}
