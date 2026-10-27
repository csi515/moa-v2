/**
 * capability 번들 list 경로(URL 첫 세그먼트) → 기존 capability 화면.
 * App.tsx CAPABILITY_ROUTE_PATHS → IndustryAppRouter → GenericIndustryShell 탭으로 연결된다.
 * 새 UI를 만들지 않고 각 capability가 export하는 기존 화면만 연결한다.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface CapabilityListView {
  capability: string;
  exportName: string;
  View: LazyExoticComponent<ComponentType>;
}

const views: Record<string, LazyExoticComponent<ComponentType>> = {};
function view(capability: string, name: string, loader: () => Promise<Record<string, unknown>>) {
  const key = `${capability}:${name}`;
  views[key] ??= lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })));
  return { capability, exportName: name, View: views[key] };
}

export const CAPABILITY_LIST_VIEWS: Record<string, CapabilityListView> = {
  'patents': view('patent_ip_asset', 'PatentAssetManagementView', () => import('@/capabilities/patent_ip_asset')),
  'patent-inventors': view('patent_ip_asset', 'PatentAssetManagementView', () => import('@/capabilities/patent_ip_asset')),
  'research-project-gates': view('research_project', 'ResearchProjectManagementView', () => import('@/capabilities/research_project')),
  'research-project-deliverables': view('research_project', 'ResearchProjectManagementView', () => import('@/capabilities/research_project')),
  'leave-balances': view('leave_management', 'LeaveManagementDashboardView', () => import('@/capabilities/leave_management')),
  'leave-requests': view('leave_management', 'LeaveManagementDashboardView', () => import('@/capabilities/leave_management')),
  'pos-reconciliations': view('daily_pos_reconciliation', 'PosReconciliationListPage', () => import('@/capabilities/daily_pos_reconciliation')),
  'rfid-cards': view('lost_card_rfid', 'LostCardListPage', () => import('@/capabilities/lost_card_rfid')),
  'valet-custody': view('valet_key_custody', 'ValetKeyListPage', () => import('@/capabilities/valet_key_custody')),
  'coatroom-baggage': view('coatroom_baggage', 'CoatroomListPage', () => import('@/capabilities/coatroom_baggage')),
  'locker-overrides': view('locker_emergency_override', 'LockerOverrideListPage', () => import('@/capabilities/locker_emergency_override')),
  'sound-broadcasts': view('sound_broadcast_schedule', 'SoundBroadcastListPage', () => import('@/capabilities/sound_broadcast_schedule')),
  'certificates': view('certificate_issuance', 'CertificateListPage', () => import('@/capabilities/certificate_issuance')),
  'blacklist-guard': view('customer_blacklist_guard', 'BlacklistGuardListPage', () => import('@/capabilities/customer_blacklist_guard')),
  'supervision-audits': view('franchise_supervision', 'FranchiseSupervisionListPage', () => import('@/capabilities/franchise_supervision')),
  'privacy-audits': view('nda_privacy_audit', 'PrivacyAuditListPage', () => import('@/capabilities/nda_privacy_audit')),
  'sublease-contracts': view('sublease_space_contract', 'SubleaseListPage', () => import('@/capabilities/sublease_space_contract')),
  'calibration-devices': view('calibration_metering', 'CalibrationListPage', () => import('@/capabilities/calibration_metering')),
  'access-keys': view('key_access_control', 'KeyAccessListPage', () => import('@/capabilities/key_access_control')),
  'hazardous-waste': view('hazardous_waste_log', 'HazardousWasteListPage', () => import('@/capabilities/hazardous_waste_log')),
  'consumable-dispenser': view('consumable_dispenser', 'ConsumableDispenserListPage', () => import('@/capabilities/consumable_dispenser')),
  'utility-meters': view('energy_utility_meter', 'UtilityMeterListPage', () => import('@/capabilities/energy_utility_meter')),
  'staff-onboardings': view('onboarding_checklist', 'OnboardingListPage', () => import('@/capabilities/onboarding_checklist')),
  'skills-matrix': view('skills_matrix_cert', 'SkillsMatrixListPage', () => import('@/capabilities/skills_matrix_cert')),
  'whistleblower-grievances': view('whistleblower_grievance', 'GrievanceListPage', () => import('@/capabilities/whistleblower_grievance')),
  'uniform-gear': view('uniform_safety_gear', 'UniformGearListPage', () => import('@/capabilities/uniform_safety_gear')),
  'petty-cash': view('petty_cash_expense', 'PettyCashListPage', () => import('@/capabilities/petty_cash_expense')),
  'tax-withholdings': view('prepaid_tax_withholding', 'TaxWithholdingListPage', () => import('@/capabilities/prepaid_tax_withholding')),
  'profit-share': view('royalty_profit_share', 'ProfitShareListPage', () => import('@/capabilities/royalty_profit_share')),
  'warranty-claims': view('service_warranty_claim', 'WarrantyClaimListPage', () => import('@/capabilities/service_warranty_claim')),
  'custom-orders': view('custom_order_craft', 'CustomOrderListPage', () => import('@/capabilities/custom_order_craft')),
  'media-assets': view('media_asset_dam', 'MediaDamListPage', () => import('@/capabilities/media_asset_dam')),
  'art-exhibitions': view('exhibition_art_curation', 'ExhibitionCurationListPage', () => import('@/capabilities/exhibition_art_curation')),
  'vip-profiles': view('vip_concierge_preference', 'VipConciergeListPage', () => import('@/capabilities/vip_concierge_preference')),
  'study-groups': view('study_group_study_hall', 'StudyGroupListPage', () => import('@/capabilities/study_group_study_hall')),
  'mentoring-pairs': view('mentor_mentee_match', 'MentorMenteeListPage', () => import('@/capabilities/mentor_mentee_match')),
  'pl-cashflows': view('simple_pl_cashflow', 'SimplePlCashflowListPage', () => import('@/capabilities/simple_pl_cashflow')),
  'fixed-assets': view('fixed_asset_depreciation', 'FixedAssetListPage', () => import('@/capabilities/fixed_asset_depreciation')),
  'procurement-3way': view('procurement_3way_match', 'Procurement3WayListPage', () => import('@/capabilities/procurement_3way_match')),
  'fefo-lots': view('fefo_lot_tracker', 'FefoLotListPage', () => import('@/capabilities/fefo_lot_tracker')),
  'budget-ceilings': view('budget_ceiling_quota', 'BudgetCeilingListPage', () => import('@/capabilities/budget_ceiling_quota')),
  'audit-trails': view('field_audit_trail', 'FieldAuditListPage', () => import('@/capabilities/field_audit_trail')),
  'vendor-scorecards': view('vendor_scorecard', 'VendorScorecardListPage', () => import('@/capabilities/vendor_scorecard')),
  'hazardous-substances': view('hazardous_substance_msds', 'HazardousSubstanceManagementView', () => import('@/capabilities/hazardous_substance_msds')),
  'chemical-usage-logs': view('hazardous_substance_msds', 'HazardousSubstanceManagementView', () => import('@/capabilities/hazardous_substance_msds')),
  'electronic-lab-notebooks': view('electronic_lab_notebook', 'ElectronicLabNotebookManagementView', () => import('@/capabilities/electronic_lab_notebook')),
  'lab-notebook-signatures': view('electronic_lab_notebook', 'ElectronicLabNotebookManagementView', () => import('@/capabilities/electronic_lab_notebook')),
  'vehicle-mileage-logs': view('vehicle_mileage_log', 'VehicleMileageLogManagementView', () => import('@/capabilities/vehicle_mileage_log')),
  'safety-work-permits': view('safety_work_permit', 'SafetyWorkPermitManagementView', () => import('@/capabilities/safety_work_permit')),
  'baby-food': view('baby_food_coop', 'BabyFoodCoopManagementView', () => import('@/capabilities/baby_food_coop')),
  'baby-food/settlement': view('baby_food_coop', 'BabyFoodCoopManagementView', () => import('@/capabilities/baby_food_coop')),
};
