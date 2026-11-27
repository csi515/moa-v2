/**
 * UI 일관성 정적 검사기 (UI-CONSISTENCY-GUARD)
 *
 * 앱 전반의 UI 일관성과 웹 접근성(A11y), 키보드 트랩 및 반응형 디자인 보장을 위해
 * 1) 개별 화면/컴포넌트에서 인라인으로 'fixed inset-0' 팝업을 직접 구현하는 것을 금지 (@/shared/components/ui/Modal 의무화)
 * 2) 인라인 <table> 태그를 직접 작성하는 것을 금지 (@/shared/components/ui/StandardDataTable 의무화)
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
  'src/shared/components/ui/FormModal.tsx',
  'src/shared/components/ConfirmDialog.tsx',
  'src/shared/components/ToastContainer.tsx',
  'src/shared/components/OnboardingWizard.tsx',
  'src/shared/components/notifications/NotificationDrawer.tsx',
  'src/shared/components/commandPalette/AppDrawer.tsx',
  'src/shared/components/commandPalette/GlobalCommandPalette.tsx',
  'src/industries/piano/components/kiosk/LobbyAttendanceKioskView.tsx',
  'src/industries/piano/components/quickAction/PianoQuickActionBottomSheet.tsx',
  'src/components/kiosk/KioskPinExitModal.tsx',
  'src/pages/workspace/CompanyAppLauncherDashboard.tsx',
]);

/**
 * 기존 레거시 인라인 모달 파일 베이스라인 (잔여 0건 달성)
 */
export const LEGACY_MODAL_BASELINE = new Set([]);

/**
 * 허용된 테이블 기반 컴포넌트
 */
export const ALLOWED_TABLE_FILES = new Set([
  "src/shared/components/ui/StandardDataTable.tsx",
  "src/shared/components/ui/ResponsiveTable.tsx",
  "src/shared/components/receipt/PrintReceipt.tsx",
  "src/components/counter/VirtualRows.tsx"
]);

/**
 * 기존 레거시 테이블 파일 베이스라인 (Phase 2~3에서 StandardDataTable로 점진 전환 예정)
 */
export const LEGACY_TABLE_BASELINE = new Set([
  "src/capabilities/achievement_quest_badge/ui/AchievementQuestBadgeView.tsx",
  "src/capabilities/approval_workflow/ui/ApprovalRequestTable.tsx",
  "src/capabilities/billing/components/tuition/TuitionReceiptModal.tsx",
  "src/capabilities/billing/finance/components/ExecutiveAnalyticsHubView.tsx",
  "src/capabilities/billing/finance/components/ExpenseManagementView.tsx",
  "src/capabilities/billing/finance/components/IncomeManagementView.tsx",
  "src/capabilities/billing/finance/components/TeacherPayrollList.tsx",
  "src/capabilities/billing_invoicing/ui/BillingInvoicingView.tsx",
  "src/capabilities/budget_ceiling_quota/components/BudgetCeilingListPage.tsx",
  "src/capabilities/calibration_metering/components/CalibrationListPage.tsx",
  "src/capabilities/certificate_issuance/components/CertificateListPage.tsx",
  "src/capabilities/coatroom_baggage/components/CoatroomListPage.tsx",
  "src/capabilities/commission_payroll/components/CommissionPayrollManagementView.tsx",
  "src/capabilities/commission_payroll/ui/InstructorCommissionSettlementView.tsx",
  "src/capabilities/consumable_dispenser/components/ConsumableDispenserListPage.tsx",
  "src/capabilities/custom_order_craft/components/CustomOrderListPage.tsx",
  "src/capabilities/daily_pos_reconciliation/components/PosReconciliationListPage.tsx",
  "src/capabilities/diet_body_log/components/DietBodyLogManagementView.tsx",
  "src/capabilities/digital_guestbook/ui/DigitalGuestbookView.tsx",
  "src/capabilities/emergency_alert_broadcast/ui/EmergencyAlertBroadcastView.tsx",
  "src/capabilities/energy_utility_meter/components/UtilityMeterListPage.tsx",
  "src/capabilities/entry_pass_ticket/ui/EntryPassTicketView.tsx",
  "src/capabilities/event_contest_hub/ui/EventContestHubView.tsx",
  "src/capabilities/exhibition_art_curation/components/ExhibitionCurationListPage.tsx",
  "src/capabilities/facility_incident_report/ui/FacilityIncidentReportView.tsx",
  "src/capabilities/fefo_lot_tracker/components/FefoLotListPage.tsx",
  "src/capabilities/field_audit_trail/components/FieldAuditListPage.tsx",
  "src/capabilities/field_dispatch/components/DispatchListPage.tsx",
  "src/capabilities/fixed_asset_depreciation/components/FixedAssetListPage.tsx",
  "src/capabilities/franchise_supervision/components/FranchiseSupervisionListPage.tsx",
  "src/capabilities/hazardous_waste_log/components/HazardousWasteListPage.tsx",
  "src/capabilities/hygiene_haccp_log/components/HygieneHaccpLogView.tsx",
  "src/capabilities/intake_assessment/ui/IntakeAssessmentView.tsx",
  "src/capabilities/inventory/components/InventoryManagementView.tsx",
  "src/capabilities/key_access_control/components/KeyAccessListPage.tsx",
  "src/capabilities/leave_management/ui/LeaveManagementLedgerView.tsx",
  "src/capabilities/locker_emergency_override/components/LockerOverrideListPage.tsx",
  "src/capabilities/lost_card_rfid/components/LostCardListPage.tsx",
  "src/capabilities/lost_found/components/LostFoundManagementView.tsx",
  "src/capabilities/makeup_lesson_pass/ui/MakeupLessonPassView.tsx",
  "src/capabilities/mbo/ui/MboYearlyCapacityForecastView.tsx",
  "src/capabilities/meal_survey/ui/MealSurveyManagePage.tsx",
  "src/capabilities/meal_survey/ui/MealSurveyMyView.tsx",
  "src/capabilities/media_asset_dam/components/MediaDamListPage.tsx",
  "src/capabilities/membership_referral_tree/components/MembershipReferralTreeView.tsx",
  "src/capabilities/mentor_mentee_match/components/MentorMenteeListPage.tsx",
  "src/capabilities/nda_privacy_audit/components/PrivacyAuditListPage.tsx",
  "src/capabilities/nps_survey_collector/ui/NpsSurveyCollectorView.tsx",
  "src/capabilities/office_supply_request/ui/OfficeSupplyManagePage.tsx",
  "src/capabilities/parking_validator/ui/ParkingValidatorView.tsx",
  "src/capabilities/petty_cash_expense/components/PettyCashListPage.tsx",
  "src/capabilities/prepaid_tax_withholding/components/TaxWithholdingListPage.tsx",
  "src/capabilities/procurement_3way_match/components/Procurement3WayListPage.tsx",
  "src/capabilities/promotional_deal/components/PromotionListPage.tsx",
  "src/capabilities/quality_inspection/ui/QualityInspectionManagementView.tsx",
  "src/capabilities/recipe_bom/components/RecipeBomManagementView.tsx",
  "src/capabilities/rental_equipment/ui/RentalEquipmentManagementView.tsx",
  "src/capabilities/roster/components/StudentBulkImportModal.tsx",
  "src/capabilities/roster/components/StudentListView.tsx",
  "src/capabilities/royalty_profit_share/components/ProfitShareListPage.tsx",
  "src/capabilities/safety_consent/ui/SafetyConsentManagementView.tsx",
  "src/capabilities/service_warranty_claim/components/WarrantyClaimListPage.tsx",
  "src/capabilities/shift_schedule/ui/ShiftScheduleManagementView.tsx",
  "src/capabilities/shuttle_dispatch/ui/ShuttleRosterPage.tsx",
  "src/capabilities/shuttle_dispatch/ui/ShuttleRoutesPage.tsx",
  "src/capabilities/simple_pl_cashflow/components/SimplePlCashflowListPage.tsx",
  "src/capabilities/sop_risk_assessment/components/SopRiskAssessmentView.tsx",
  "src/capabilities/sop_risk_assessment/components/SopStepMatrixTable.tsx",
  "src/capabilities/sound_broadcast_schedule/components/SoundBroadcastListPage.tsx",
  "src/capabilities/study_group_study_hall/components/StudyGroupListPage.tsx",
  "src/capabilities/sublease_space_contract/components/SubleaseListPage.tsx",
  "src/capabilities/supply_restock/ui/ProcurementVettingQueueView.tsx",
  "src/capabilities/supply_restock/ui/PurchaseOrderDocumentView.tsx",
  "src/capabilities/supply_restock/ui/SupplyRestockView.tsx",
  "src/capabilities/uniform_safety_gear/components/UniformGearListPage.tsx",
  "src/capabilities/valet_key_custody/components/ValetKeyListPage.tsx",
  "src/capabilities/vehicle_mileage_log/ui/VehicleMileageLogManagementView.tsx",
  "src/capabilities/vendor_ap_invoice/components/VendorApInvoiceView.tsx",
  "src/capabilities/vendor_scorecard/components/VendorScorecardListPage.tsx",
  "src/capabilities/vip_concierge_preference/components/VipConciergeListPage.tsx",
  "src/capabilities/waitlist_queue/components/WaitlistPage.tsx",
  "src/capabilities/whistleblower_grievance/components/GrievanceListPage.tsx",
  "src/capabilities/work_attendance_payroll/components/WorkAttendancePayrollView.tsx",
  "src/core/customer/components/PracticeRoomStatusGrid.tsx",
  "src/core/legal/legalContent.tsx",
  "src/core/locations/components/BranchConsolidationHqView.tsx",
  "src/core/staff/components/TeacherManagementView.tsx",
  "src/industries/piano/components/consultations/PianoConsultationHubView.tsx",
  "src/industries/piano/components/practice/PracticeRecordsView.tsx",
  "src/industries/piano/components/practiceRooms/PracticeRoomCalendarPanel.tsx",
  "src/industries/piano/components/songProgress/DirectorApprovalModal.tsx",
  "src/industries/piano/components/textbooks/tabs/TextbookHistoryTab.tsx",
  "src/industries/piano/components/textbooks/tabs/TextbookPaymentsTab.tsx",
  "src/industries/piano/components/textbooks/tabs/TextbookSalesTab.tsx",
  "src/industries/piano/components/textbooks/TextbookReceiptModal.tsx",
  "src/industries/retail/components/customers/RetailCustomerPointsPanel.tsx",
  "src/industries/retail/components/inventory/InventoryListView.tsx",
  "src/industries/retail/components/products/ProductBulkImportModal.tsx",
  "src/industries/retail/components/products/ProductListView.tsx",
  "src/industries/retail/components/sales/SaleHistoryView.tsx",
  "src/pages/admin/SuperAdminTenantsPage.tsx",
  "src/pages/members/MemberList.tsx",
  "src/shared/components/declarative/AutoDataTable.tsx",
  "src/shared/components/ui/ResponsiveTable.tsx",
  "src/shared/components/ui/StandardDataTable.tsx"
]);

export function scanUiConsistencyViolations() {
  const violations = [];
  const files = walk(srcDir);

  const INLINE_MODAL_PATTERN = /(?:fixed\s+inset-0|inset-0\s+fixed)[^"'>]*?(?:z-[0-9]+|bg-)/;
  const INLINE_TABLE_PATTERN = /<table\b/;
  const FORBIDDEN_THEME_PATTERN = /(?:[a-z0-9:-]+)?(?:bg|text|border|ring|divide|from|to|via)-(?:indigo|purple)-[a-z0-9/]+/;
  const FORBIDDEN_ROUNDED_PATTERN = /\brounded-3xl\b/;

  for (const file of files) {
    const rel = toPosix(file);
    const source = stripComments(readFileSync(file, 'utf8'));

    // 1. 인라인 모달 안티패턴 탐지
    if (!ALLOWED_MODAL_FILES.has(rel) && !LEGACY_MODAL_BASELINE.has(rel)) {
      if (INLINE_MODAL_PATTERN.test(source) && (source.includes('role="dialog"') || source.includes('aria-modal='))) {
        violations.push({
          file: rel,
          type: 'inline_modal_antipattern',
          message: '공통 컴포넌트 @/shared/components/ui/Modal 또는 FormModal을 사용하지 않고 직접 인라인 모달(fixed inset-0)을 작성했습니다. 웹 접근성(A11y)과 디자인 일관성을 위해 공통 Modal을 사용하세요.',
        });
      }
    }

    // 2. 인라인 테이블 안티패턴 탐지
    if (!ALLOWED_TABLE_FILES.has(rel) && !LEGACY_TABLE_BASELINE.has(rel)) {
      if (INLINE_TABLE_PATTERN.test(source)) {
        violations.push({
          file: rel,
          type: 'inline_table_antipattern',
          message: '공통 컴포넌트 @/shared/components/ui/StandardDataTable을 사용하지 않고 직접 <table 태그를 작성했습니다. 반응형 모바일 가로 스크롤 및 디자인 일관성을 위해 StandardDataTable을 사용하세요.',
        });
      }
    }

    // 3. 비표준 테마 색상(indigo/purple) 탐지
    if (FORBIDDEN_THEME_PATTERN.test(source)) {
      violations.push({
        file: rel,
        type: 'forbidden_theme_color',
        message: '비표준 테마 색상(indigo-*, purple-*)이 감지되었습니다. Moa-v2 표준 B2B 토큰(slate-*, blue-*)을 사용하세요.',
      });
    }

    // 4. 비표준 모서리 반경(rounded-3xl) 탐지
    if (FORBIDDEN_ROUNDED_PATTERN.test(source)) {
      violations.push({
        file: rel,
        type: 'forbidden_rounded_radius',
        message: '과도한 모서리 반경(rounded-3xl)이 감지되었습니다. B2B 표준 모서리(rounded-lg, rounded-xl)를 사용하세요.',
      });
    }
  }

  return violations;
}

export function runSelfTest() {
  console.log('Running check-ui-consistency self-test...');
  const probeModalFile = join(srcDir, 'shared', '_ui_consistency_modal_probe.tmp.tsx');
  const probeTableFile = join(srcDir, 'shared', '_ui_consistency_table_probe.tmp.tsx');
  const probeColorFile = join(srcDir, 'shared', '_ui_consistency_color_probe.tmp.tsx');

  try {
    writeFileSync(
      probeModalFile,
      'export const BadModal = () => (<div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true">test</div>);',
      'utf8'
    );
    writeFileSync(
      probeTableFile,
      'export const BadTable = () => (<table><tbody><tr><td>test</td></tr></tbody></table>);',
      'utf8'
    );
    writeFileSync(
      probeColorFile,
      'export const BadColor = () => (<div className="bg-indigo-600 rounded-3xl">test</div>);',
      'utf8'
    );

    const violations = scanUiConsistencyViolations();
    const modalProbeHit = violations.some((v) => v.file.includes('_ui_consistency_modal_probe.tmp.tsx'));
    const tableProbeHit = violations.some((v) => v.file.includes('_ui_consistency_table_probe.tmp.tsx'));
    const colorProbeHit = violations.some((v) => v.file.includes('_ui_consistency_color_probe.tmp.tsx'));

    if (!modalProbeHit) {
      throw new Error('check-ui-consistency: self-test modal probe violation not detected.');
    }
    if (!tableProbeHit) {
      throw new Error('check-ui-consistency: self-test table probe violation not detected.');
    }
    if (!colorProbeHit) {
      throw new Error('check-ui-consistency: self-test color probe violation not detected.');
    }
    console.log('Self-test: probe violations successfully caught ok');
  } finally {
    if (existsSync(probeModalFile)) {
      unlinkSync(probeModalFile);
    }
    if (existsSync(probeTableFile)) {
      unlinkSync(probeTableFile);
    }
    if (existsSync(probeColorFile)) {
      unlinkSync(probeColorFile);
    }
  }

  const cleanViolations = scanUiConsistencyViolations();
  const leftoverHit = cleanViolations.some((v) => v.file.includes('_probe.tmp.tsx'));
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
      console.error('  - [' + v.type + '] ' + v.file);
      console.error('    ' + v.message);
    }
    console.error('\n신규 화면은 반드시 @/shared/components/ui/의 공통 컴포넌트(Modal, StandardDataTable 등)를 사용해 일관된 디자인과 접근성을 보장하세요.\n');
    process.exit(1);
  }
  console.log('check-ui-consistency: ok');
}
