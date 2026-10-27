import { CAPABILITY_IDS, type CapabilityManifest } from './_shared/capabilityTypes';
import { attendanceCapability } from './attendance/manifest';
import { billingCapability } from './billing/manifest';
import { bookingCapability } from './booking/manifest';
import { commerceCapability } from './commerce/manifest';
import { consultationCapability } from './consultation/manifest';
import { enrollmentCapability } from './enrollment/manifest';
import { parentCapability } from './parent/manifest';
import { resourcesCapability } from './resources/manifest';
import { rosterCapability } from './roster/manifest';
import { schedulingCapability } from './scheduling/manifest';
import { transportCapability } from './transport/manifest';
import { passesCapability } from './passes/manifest';
import { lockerCapability } from './locker/manifest';
import { inventoryCapability } from './inventory/manifest';
import { seat_roomCapability } from './seat_room/manifest';
import { rental_equipmentCapability } from './rental_equipment/manifest';
import { maintenance_checklistCapability } from './maintenance_checklist/manifest';
import { instructor_matchCapability } from './instructor_match/manifest';
import { shift_scheduleCapability } from './shift_schedule/manifest';
import { task_pipelineCapability } from './task_pipeline/manifest';
import { billing_invoicingCapability } from './billing_invoicing/manifest';
import { ledger_simpleCapability } from './ledger_simple/manifest';
import { credit_walletCapability } from './credit_wallet/manifest';
import { consultation_crmCapability } from './consultation_crm/manifest';
import { treatment_chartCapability } from './treatment_chart/manifest';
import { safety_consentCapability } from './safety_consent/manifest';
import { curriculum_progressCapability } from './curriculum_progress/manifest';
import { retention_marketingCapability } from './retention_marketing/manifest';
import { table_order_kdsCapability } from './table_order_kds/manifest';
import { diet_body_logCapability } from './diet_body_log/manifest';
import { vehicle_shuttleCapability } from './vehicle_shuttle/manifest';
import { shuttle_dispatchCapability } from './shuttle_dispatch/manifest';
import { volunteer_activityCapability } from './volunteer_activity/manifest';
import { meal_surveyCapability } from './meal_survey/manifest';
import { office_supply_requestCapability } from './office_supply_request/manifest';
import { commission_payrollCapability } from './commission_payroll/manifest';
import { lost_foundCapability } from './lost_found/manifest';
import { recipe_bomCapability } from './recipe_bom/manifest';
import { digital_contractCapability } from './digital_contract/manifest';
import { seat_timer_billingCapability } from './seat_timer_billing/manifest';
import { treatment_portfolioCapability } from './treatment_portfolio/manifest';
import { work_order_kanbanCapability } from './work_order_kanban/manifest';
import { waitlist_turn_queueCapability } from './waitlist_turn_queue/manifest';
import { deposit_escrowCapability } from './deposit_escrow/manifest';
import { equipment_lifecycleCapability } from './equipment_lifecycle/manifest';
import { package_split_billingCapability } from './package_split_billing/manifest';
import { exam_grade_analyticsCapability } from './exam_grade_analytics/manifest';
import { kiosk_staff_callCapability } from './kiosk_staff_call/manifest';
import { membership_referral_treeCapability } from './membership_referral_tree/manifest';
import { hygiene_haccp_logCapability } from './hygiene_haccp_log/manifest';
import { sop_risk_assessmentCapability } from './sop_risk_assessment/manifest';
import { vendor_ap_invoiceCapability } from './vendor_ap_invoice/manifest';
import { work_attendance_payrollCapability } from './work_attendance_payroll/manifest';
import { pickup_ordersCapability } from './pickup_orders/manifest';
import { loyalty_stampCapability } from './loyalty_stamp/manifest';
import { workplace_policyCapability } from './workplace_policy/manifest';
import { feedbacksCapability } from './feedbacks/manifest';
import { trial_funnelCapability } from './trial_funnel/manifest';
import { learning_journalCapability } from './learning_journal/manifest';
import { level_assessmentCapability } from './level_assessment/manifest';
import { space_turnaroundCapability } from './space_turnaround/manifest';
import { supply_restockCapability } from './supply_restock/manifest';
import { makeup_lesson_passCapability } from './makeup_lesson_pass/manifest';
import { intake_assessmentCapability } from './intake_assessment/manifest';
import { daily_care_reportCapability } from './daily_care_report/manifest';
import { substitute_dispatchCapability } from './substitute_dispatch/manifest';
import { entry_pass_ticketCapability } from './entry_pass_ticket/manifest';
import { event_contest_hubCapability } from './event_contest_hub/manifest';
import { facilityIncidentReportCapability } from './facility_incident_report/manifest';
import { npsSurveyCollectorCapability } from './nps_survey_collector/manifest';
import { achievementQuestBadgeCapability } from './achievement_quest_badge/manifest';
import { parking_validatorCapability } from './parking_validator/manifest';
import { emergency_alert_broadcastCapability } from './emergency_alert_broadcast/manifest';
import { digital_guestbookCapability } from './digital_guestbook/manifest';
import { mboCapability } from './mbo/manifest';
import { approval_workflowCapability } from './approval_workflow/manifest';
import { qualityInspectionCapability } from './quality_inspection/manifest';
import { change_managementCapability } from './change_management/manifest';
import { patent_ip_assetCapability } from './patent_ip_asset/manifest';
import { leave_managementCapability } from './leave_management/manifest';
import { promotional_dealCapability } from './promotional_deal/manifest';
import { research_projectCapability } from './research_project/manifest';
import { daily_pos_reconciliationCapability } from './daily_pos_reconciliation/manifest';
import { lost_card_rfidCapability } from './lost_card_rfid/manifest';
import { valet_key_custodyCapability } from './valet_key_custody/manifest';
import { coatroom_baggageCapability } from './coatroom_baggage/manifest';
import { locker_emergency_overrideCapability } from './locker_emergency_override/manifest';
import { sound_broadcast_scheduleCapability } from './sound_broadcast_schedule/manifest';
import { certificate_issuanceCapability } from './certificate_issuance/manifest';
import { customer_blacklist_guardCapability } from './customer_blacklist_guard/manifest';
import { franchise_supervisionCapability } from './franchise_supervision/manifest';
import { nda_privacy_auditCapability } from './nda_privacy_audit/manifest';
import { sublease_space_contractCapability } from './sublease_space_contract/manifest';
import { calibration_meteringCapability } from './calibration_metering/manifest';
import { key_access_controlCapability } from './key_access_control/manifest';
import { hazardous_waste_logCapability } from './hazardous_waste_log/manifest';
import { consumable_dispenserCapability } from './consumable_dispenser/manifest';
import { energy_utility_meterCapability } from './energy_utility_meter/manifest';
import { onboarding_checklistCapability } from './onboarding_checklist/manifest';
import { skills_matrix_certCapability } from './skills_matrix_cert/manifest';
import { whistleblower_grievanceCapability } from './whistleblower_grievance/manifest';
import { uniform_safety_gearCapability } from './uniform_safety_gear/manifest';
import { petty_cash_expenseCapability } from './petty_cash_expense/manifest';
import { prepaid_tax_withholdingCapability } from './prepaid_tax_withholding/manifest';
import { royalty_profit_shareCapability } from './royalty_profit_share/manifest';
import { service_warranty_claimCapability } from './service_warranty_claim/manifest';
import { custom_order_craftCapability } from './custom_order_craft/manifest';
import { media_asset_damCapability } from './media_asset_dam/manifest';
import { exhibition_art_curationCapability } from './exhibition_art_curation/manifest';
import { vip_concierge_preferenceCapability } from './vip_concierge_preference/manifest';
import { study_group_study_hallCapability } from './study_group_study_hall/manifest';
import { mentor_mentee_matchCapability } from './mentor_mentee_match/manifest';
import { simple_pl_cashflowCapability } from './simple_pl_cashflow/manifest';
import { fixed_asset_depreciationCapability } from './fixed_asset_depreciation/manifest';
import { procurement_3way_matchCapability } from './procurement_3way_match/manifest';
import { fefo_lot_trackerCapability } from './fefo_lot_tracker/manifest';
import { budget_ceiling_quotaCapability } from './budget_ceiling_quota/manifest';
import { field_audit_trailCapability } from './field_audit_trail/manifest';
import { vendor_scorecardCapability } from './vendor_scorecard/manifest';
import { field_dispatchCapability } from './field_dispatch/manifest';
import { waitlist_queueCapability } from './waitlist_queue/manifest';
import { hazardous_substance_msdsCapability } from './hazardous_substance_msds/manifest';
import { electronic_lab_notebookCapability } from './electronic_lab_notebook/manifest';
import { vehicle_mileage_logCapability } from './vehicle_mileage_log/manifest';
import { safety_work_permitCapability } from './safety_work_permit/manifest';
import { baby_food_coopCapability } from './baby_food_coop/manifest';

export {
  CAPABILITY_IDS,
  CAPABILITY_DOMAIN_RELATIONS,
  assertCapabilityDefinition,
  defineCapability,
  type CapabilityDefinition,
  type CapabilityId,
  type CapabilityManifest,
} from './_shared/capabilityTypes';

export const CAPABILITY_MANIFESTS: readonly CapabilityManifest[] = [
  attendanceCapability,
  schedulingCapability,
  bookingCapability,
  billingCapability,
  commerceCapability,
  parentCapability,
  resourcesCapability,
  transportCapability,
  rosterCapability,
  enrollmentCapability,
  consultationCapability,
  passesCapability,
  lockerCapability,
  inventoryCapability,
  seat_roomCapability,
  rental_equipmentCapability,
  maintenance_checklistCapability,
  instructor_matchCapability,
  shift_scheduleCapability,
  task_pipelineCapability,
  billing_invoicingCapability,
  ledger_simpleCapability,
  credit_walletCapability,
  consultation_crmCapability,
  treatment_chartCapability,
  safety_consentCapability,
  curriculum_progressCapability,
  retention_marketingCapability,
  table_order_kdsCapability,
  diet_body_logCapability,
  vehicle_shuttleCapability,
  shuttle_dispatchCapability,
  volunteer_activityCapability,
  meal_surveyCapability,
  office_supply_requestCapability,
  commission_payrollCapability,
  lost_foundCapability,
  recipe_bomCapability,
  digital_contractCapability,
  seat_timer_billingCapability,
  treatment_portfolioCapability,
  work_order_kanbanCapability,
  waitlist_turn_queueCapability,
  deposit_escrowCapability,
  equipment_lifecycleCapability,
  package_split_billingCapability,
  exam_grade_analyticsCapability,
  kiosk_staff_callCapability,
  membership_referral_treeCapability,
  hygiene_haccp_logCapability,
  sop_risk_assessmentCapability,
  vendor_ap_invoiceCapability,
  work_attendance_payrollCapability,
  pickup_ordersCapability,
  loyalty_stampCapability,
  workplace_policyCapability,
  feedbacksCapability,
  trial_funnelCapability,
  learning_journalCapability,
  level_assessmentCapability,
  space_turnaroundCapability,
  supply_restockCapability,
  makeup_lesson_passCapability,
  intake_assessmentCapability,
  daily_care_reportCapability,
  substitute_dispatchCapability,
  entry_pass_ticketCapability,
  event_contest_hubCapability,
  facilityIncidentReportCapability,
  npsSurveyCollectorCapability,
  achievementQuestBadgeCapability,
  parking_validatorCapability,
  emergency_alert_broadcastCapability,
  digital_guestbookCapability,
  mboCapability,
  approval_workflowCapability,
  qualityInspectionCapability,
  change_managementCapability,
  patent_ip_assetCapability,
  leave_managementCapability,
  promotional_dealCapability,
  research_projectCapability,
  daily_pos_reconciliationCapability,
  lost_card_rfidCapability,
  valet_key_custodyCapability,
  coatroom_baggageCapability,
  locker_emergency_overrideCapability,
  sound_broadcast_scheduleCapability,
  certificate_issuanceCapability,
  customer_blacklist_guardCapability,
  franchise_supervisionCapability,
  nda_privacy_auditCapability,
  sublease_space_contractCapability,
  calibration_meteringCapability,
  key_access_controlCapability,
  hazardous_waste_logCapability,
  consumable_dispenserCapability,
  energy_utility_meterCapability,
  onboarding_checklistCapability,
  skills_matrix_certCapability,
  whistleblower_grievanceCapability,
  uniform_safety_gearCapability,
  petty_cash_expenseCapability,
  prepaid_tax_withholdingCapability,
  royalty_profit_shareCapability,
  service_warranty_claimCapability,
  custom_order_craftCapability,
  media_asset_damCapability,
  exhibition_art_curationCapability,
  vip_concierge_preferenceCapability,
  study_group_study_hallCapability,
  mentor_mentee_matchCapability,
  simple_pl_cashflowCapability,
  fixed_asset_depreciationCapability,
  procurement_3way_matchCapability,
  fefo_lot_trackerCapability,
  budget_ceiling_quotaCapability,
  field_audit_trailCapability,
  vendor_scorecardCapability,
  field_dispatchCapability,
  waitlist_queueCapability,
  hazardous_substance_msdsCapability,
  electronic_lab_notebookCapability,
  vehicle_mileage_logCapability,
  safety_work_permitCapability,
  baby_food_coopCapability,
];

export * from './trial_funnel';
export * from './learning_journal';
export * from './level_assessment';
export * from './space_turnaround';
export * from './supply_restock';
export * from './makeup_lesson_pass';
export * from './intake_assessment';
export * from './daily_care_report';
export * from './substitute_dispatch';
export * from './entry_pass_ticket';
export * from './event_contest_hub';
export * from './facility_incident_report';
export * from './nps_survey_collector';
export * from './achievement_quest_badge';
export * from './parking_validator';
export * from './emergency_alert_broadcast';
export * from './digital_guestbook';
export * from './mbo';
export * from './approval_workflow';
export * from './quality_inspection';
export * from './change_management';
export * from './patent_ip_asset';
export * from './leave_management';
export * from './promotional_deal';
export * from './research_project';
export * from './daily_pos_reconciliation';
export * from './lost_card_rfid';
export * from './valet_key_custody';
export * from './coatroom_baggage';
export * from './locker_emergency_override';
export * from './sound_broadcast_schedule';
export * from './certificate_issuance';
export * from './customer_blacklist_guard';
export * from './franchise_supervision';
export * from './nda_privacy_audit';
export * from './sublease_space_contract';
export * from './calibration_metering';
export * from './key_access_control';
export * from './hazardous_waste_log';
export * from './consumable_dispenser';
export * from './energy_utility_meter';
export * from './onboarding_checklist';
export * from './skills_matrix_cert';
export * from './whistleblower_grievance';
export * from './uniform_safety_gear';
export * from './petty_cash_expense';
export * from './prepaid_tax_withholding';
export * from './royalty_profit_share';
export * from './service_warranty_claim';
export * from './custom_order_craft';
export * from './media_asset_dam';
export * from './exhibition_art_curation';
export * from './vip_concierge_preference';
export * from './study_group_study_hall';
export * from './mentor_mentee_match';
export * from './simple_pl_cashflow';
export * from './fixed_asset_depreciation';
export * from './procurement_3way_match';
export * from './fefo_lot_tracker';
export * from './budget_ceiling_quota';
export * from './field_audit_trail';
export * from './vendor_scorecard';
export * from './field_dispatch';
export * from './waitlist_queue';
export * from './hazardous_substance_msds';
export * from './electronic_lab_notebook';
export * from './vehicle_mileage_log';
export * from './safety_work_permit';
export * from './baby_food_coop';

const CAPABILITY_DISPLAY_NAME_MAP: Record<string, string> = Object.fromEntries(
  CAPABILITY_MANIFESTS.map((m) => [m.definition.id, m.definition.displayName])
);

/**
 * Capability ID에 대응하는 표준 한글 명칭(displayName)을 반환합니다.
 */
export function getCapabilityDisplayName(id: string): string {
  return CAPABILITY_DISPLAY_NAME_MAP[id] || id;
}



