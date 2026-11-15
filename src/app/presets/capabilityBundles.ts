/**
 * Capability Module Bundles (61 Atomic Bundles)
 * Extracted from presetRegistry.ts for modularity.
 */
/**
 * Multi-vertical Industry Preset Registry & Capability Registry (Composition Layer)
 *
 * 3계층 엄격 분리 원칙:
 * 1. Core: 인증, 테넌트 격리, 확장 인터페이스 (개별 Capability를 모름)
 * 2. Capability: 독립 업무 영역, 업종 중립적 재사용 도메인 로직
 * 3. Preset (Composition): 필요한 Capability와 설정을 조합해 업종별 사업장 프로그램 구성
 *
 * 각 Capability는 독립적으로 setupSchema와 resources를 소유하며,
 * 프리셋 레이어가 이를 선언적으로 묶어 애플리케이션에 제공한다.
 */

import type {
  BundledPresetCapabilityId,
  CapabilityModuleBundle,
  IndustryPresetDefinition,
  PresetCapabilityId,
} from '@/core/presets/types';
import { registerCapabilityBundles } from '@/core/presets/presetAssembler';
import { registerPresetResolver } from '@/core/presets/presetResolver';

// 기존 5대 기능 스키마 & 리소스
import { attendanceSetupSchema } from '@/capabilities/attendance/setupSchema';
import { attendanceResources } from '@/capabilities/attendance/resources';
import { bookingSetupSchema } from '@/capabilities/booking/setupSchema';
import { bookingResources } from '@/capabilities/booking/resources';
import { passesSetupSchema } from '@/capabilities/passes/setupSchema';
import { passesResources } from '@/capabilities/passes/resources';
import { lockerSetupSchema } from '@/capabilities/locker/setupSchema';
import { lockerResources } from '@/capabilities/locker/resources';
import { inventorySetupSchema } from '@/capabilities/inventory/setupSchema';
import { inventoryResources } from '@/capabilities/inventory/resources';

// 신규 12종 Capability 스키마 & 리소스
import { seatRoomSetupSchema } from '@/capabilities/seat_room/setupSchema';
import { seatRoomResources } from '@/capabilities/seat_room/resources';
import { rentalEquipmentSetupSchema } from '@/capabilities/rental_equipment/setupSchema';
import { rentalEquipmentResources } from '@/capabilities/rental_equipment/resources';
import { maintenanceChecklistSetupSchema } from '@/capabilities/maintenance_checklist/setupSchema';
import { maintenanceChecklistResources } from '@/capabilities/maintenance_checklist/resources';
import { instructorMatchSetupSchema } from '@/capabilities/instructor_match/setupSchema';
import { instructorMatchResources } from '@/capabilities/instructor_match/resources';
import { shiftScheduleSetupSchema } from '@/capabilities/shift_schedule/setupSchema';
import { shiftScheduleResources } from '@/capabilities/shift_schedule/resources';
import { taskPipelineSetupSchema } from '@/capabilities/task_pipeline/setupSchema';
import { taskPipelineResources } from '@/capabilities/task_pipeline/resources';
import { billingInvoicingSetupSchema } from '@/capabilities/billing_invoicing/setupSchema';
import { billingInvoicingResources } from '@/capabilities/billing_invoicing/resources';
import { ledgerSimpleSetupSchema } from '@/capabilities/ledger_simple/setupSchema';
import { ledgerSimpleResources } from '@/capabilities/ledger_simple/resources';
import { creditWalletSetupSchema } from '@/capabilities/credit_wallet/setupSchema';
import { creditWalletResources } from '@/capabilities/credit_wallet/resources';
import { consultationCrmSetupSchema } from '@/capabilities/consultation_crm/setupSchema';
import { consultationCrmResources } from '@/capabilities/consultation_crm/resources';
import { treatmentChartSetupSchema } from '@/capabilities/treatment_chart/setupSchema';
import { treatmentChartResources } from '@/capabilities/treatment_chart/resources';
import { safetyConsentSetupSchema } from '@/capabilities/safety_consent/setupSchema';
import { safetyConsentResources } from '@/capabilities/safety_consent/resources';
import { curriculumProgressSetupSchema } from '@/capabilities/curriculum_progress/setupSchema';
import { curriculumProgressResources } from '@/capabilities/curriculum_progress/resources';
import { retentionMarketingSetupSchema } from '@/capabilities/retention_marketing/setupSchema';
import { retentionMarketingResources } from '@/capabilities/retention_marketing/resources';
import { tableOrderKdsSetupSchema } from '@/capabilities/table_order_kds/setupSchema';
import { tableOrderKdsResources } from '@/capabilities/table_order_kds/resources';
import { dietBodyLogSetupSchema } from '@/capabilities/diet_body_log/setupSchema';
import { dietBodyLogResources } from '@/capabilities/diet_body_log/resources';
import { vehicleShuttleSetupSchema } from '@/capabilities/vehicle_shuttle/setupSchema';
import { vehicleShuttleResources } from '@/capabilities/vehicle_shuttle/resources';
import { shuttleDispatchSetupSchema } from '@/capabilities/shuttle_dispatch/setupSchema';
import { shuttleDispatchResources } from '@/capabilities/shuttle_dispatch/resources';
import { volunteerActivitySetupSchema } from '@/capabilities/volunteer_activity/setupSchema';
import { volunteerActivityResources } from '@/capabilities/volunteer_activity/resources';
import { mealSurveySetupSchema } from '@/capabilities/meal_survey/setupSchema';
import { mealSurveyResources } from '@/capabilities/meal_survey/resources';
import { officeSupplyRequestSetupSchema } from '@/capabilities/office_supply_request/setupSchema';
import { officeSupplyRequestResources } from '@/capabilities/office_supply_request/resources';
import { commissionPayrollSetupSchema } from '@/capabilities/commission_payroll/setupSchema';
import { commissionPayrollResources } from '@/capabilities/commission_payroll/resources';
import { lostFoundSetupSchema } from '@/capabilities/lost_found/setupSchema';
import { lostFoundResources } from '@/capabilities/lost_found/resources';
import { recipeBomSetupSchema } from '@/capabilities/recipe_bom/setupSchema';
import { recipeBomResources } from '@/capabilities/recipe_bom/resources';
import { digitalContractSetupSchema } from '@/capabilities/digital_contract/setupSchema';
import { digitalContractResources } from '@/capabilities/digital_contract/resources';
import { seatTimerBillingSetupSchema } from '@/capabilities/seat_timer_billing/setupSchema';
import { seatTimerBillingResources } from '@/capabilities/seat_timer_billing/resources';
import { treatmentPortfolioSetupSchema } from '@/capabilities/treatment_portfolio/setupSchema';
import { treatmentPortfolioResources } from '@/capabilities/treatment_portfolio/resources';
import { workOrderKanbanSetupSchema } from '@/capabilities/work_order_kanban/setupSchema';
import { workOrderKanbanResources } from '@/capabilities/work_order_kanban/resources';
import { waitlistTurnQueueSetupSchema } from '@/capabilities/waitlist_turn_queue/setupSchema';
import { waitlistTurnQueueResources } from '@/capabilities/waitlist_turn_queue/resources';
import { depositEscrowSetupSchema } from '@/capabilities/deposit_escrow/setupSchema';
import { depositEscrowResources } from '@/capabilities/deposit_escrow/resources';
import { equipmentLifecycleSetupSchema } from '@/capabilities/equipment_lifecycle/setupSchema';
import { equipmentLifecycleResources } from '@/capabilities/equipment_lifecycle/resources';
import { packageSplitBillingSetupSchema } from '@/capabilities/package_split_billing/setupSchema';
import { packageSplitBillingResources } from '@/capabilities/package_split_billing/resources';
import { examGradeAnalyticsSetupSchema } from '@/capabilities/exam_grade_analytics/setupSchema';
import { examGradeAnalyticsResources } from '@/capabilities/exam_grade_analytics/resources';
import { kioskStaffCallSetupSchema } from '@/capabilities/kiosk_staff_call/setupSchema';
import { kioskStaffCallResources } from '@/capabilities/kiosk_staff_call/resources';
import { membershipReferralTreeSetupSchema } from '@/capabilities/membership_referral_tree/setupSchema';
import { membershipReferralTreeResources } from '@/capabilities/membership_referral_tree/resources';
import { hygieneHaccpLogSetupSchema } from '@/capabilities/hygiene_haccp_log/setupSchema';
import { hygieneHaccpLogResources } from '@/capabilities/hygiene_haccp_log/resources';
import { sopRiskAssessmentSetupSchema } from '@/capabilities/sop_risk_assessment/setupSchema';
import { sopRiskAssessmentResources } from '@/capabilities/sop_risk_assessment/resources';
import { vendorApInvoiceSetupSchema } from '@/capabilities/vendor_ap_invoice/setupSchema';
import { vendorApInvoiceResources } from '@/capabilities/vendor_ap_invoice/resources';
import { workAttendancePayrollSetupSchema } from '@/capabilities/work_attendance_payroll/setupSchema';
import { workAttendancePayrollResources } from '@/capabilities/work_attendance_payroll/resources';
import { pickupOrdersSetupSchema } from '@/capabilities/pickup_orders/setupSchema';
import { pickupOrdersResources } from '@/capabilities/pickup_orders/resources';
import { loyaltyStampSetupSchema } from '@/capabilities/loyalty_stamp/setupSchema';
import { loyaltyStampResources } from '@/capabilities/loyalty_stamp/resources';
import { workplacePolicySetupSchema } from '@/capabilities/workplace_policy/setupSchema';
import { workplacePolicyResources } from '@/capabilities/workplace_policy/resources';
import { feedbacksSetupSchema } from '@/capabilities/feedbacks/setupSchema';
import { feedbacksResources } from '@/capabilities/feedbacks/resources';
import { trial_funnelSetupSchema } from '@/capabilities/trial_funnel/setupSchema';
import { trial_funnelResources } from '@/capabilities/trial_funnel/resources';
import { learning_journalSetupSchema } from '@/capabilities/learning_journal/setupSchema';
import { learning_journalResources } from '@/capabilities/learning_journal/resources';
import { level_assessmentSetupSchema } from '@/capabilities/level_assessment/setupSchema';
import { level_assessmentResources } from '@/capabilities/level_assessment/resources';
import { space_turnaroundSetupSchema } from '@/capabilities/space_turnaround/setupSchema';
import { space_turnaroundResources } from '@/capabilities/space_turnaround/resources';
import { supply_restockSetupSchema } from '@/capabilities/supply_restock/setupSchema';
import { supply_restockResources } from '@/capabilities/supply_restock/resources';
import { makeupLessonPassSetupSchema } from '@/capabilities/makeup_lesson_pass/setupSchema';
import { makeupLessonPassResources } from '@/capabilities/makeup_lesson_pass/resources';
import { intakeAssessmentSetupSchema } from '@/capabilities/intake_assessment/setupSchema';
import { intakeAssessmentResources } from '@/capabilities/intake_assessment/resources';
import { dailyCareReportSetupSchema } from '@/capabilities/daily_care_report/setupSchema';
import { dailyCareReportResources } from '@/capabilities/daily_care_report/resources';
import { substituteDispatchSetupSchema } from '@/capabilities/substitute_dispatch/setupSchema';
import { substituteDispatchResources } from '@/capabilities/substitute_dispatch/resources';
import { entryPassTicketSetupSchema } from '@/capabilities/entry_pass_ticket/setupSchema';
import { entryPassTicketResources } from '@/capabilities/entry_pass_ticket/resources';
import { eventContestHubSetupSchema } from '@/capabilities/event_contest_hub/setupSchema';
import { eventContestHubResources } from '@/capabilities/event_contest_hub/resources';
import { facilityIncidentReportSetupSchema } from '@/capabilities/facility_incident_report/setupSchema';
import { facilityIncidentReportResources } from '@/capabilities/facility_incident_report/resources';
import { npsSurveyCollectorSetupSchema } from '@/capabilities/nps_survey_collector/setupSchema';
import { npsSurveyCollectorResources } from '@/capabilities/nps_survey_collector/resources';
import { achievementQuestBadgeSetupSchema } from '@/capabilities/achievement_quest_badge/setupSchema';
import { achievementQuestBadgeResources } from '@/capabilities/achievement_quest_badge/resources';
import { parkingValidatorSetupSchema } from '@/capabilities/parking_validator/setupSchema';
import { parkingValidatorResources } from '@/capabilities/parking_validator/resources';
import { emergencyAlertBroadcastSetupSchema } from '@/capabilities/emergency_alert_broadcast/setupSchema';
import { emergencyAlertBroadcastResources } from '@/capabilities/emergency_alert_broadcast/resources';
import { digitalGuestbookSetupSchema } from '@/capabilities/digital_guestbook/setupSchema';
import { digitalGuestbookResources } from '@/capabilities/digital_guestbook/resources';
import { mboSetupSchema } from '@/capabilities/mbo/setupSchema';
import { mboResources } from '@/capabilities/mbo/resources';
import { approvalWorkflowSetupSchema } from '@/capabilities/approval_workflow/setupSchema';
import { approvalWorkflowResources } from '@/capabilities/approval_workflow/resources';
import { qualityInspectionSetupSchema } from '@/capabilities/quality_inspection/setupSchema';
import { qualityInspectionResources } from '@/capabilities/quality_inspection/resources';
import { changeManagementSetupSchema } from '@/capabilities/change_management/setupSchema';
import { changeManagementResources } from '@/capabilities/change_management/resources';
import { patentIpAssetSetupSchema } from '@/capabilities/patent_ip_asset/setupSchema';
import { patentIpAssetResources } from '@/capabilities/patent_ip_asset/resources';
import { researchProjectSetupSchema } from '@/capabilities/research_project/setupSchema';
import { researchProjectResources } from '@/capabilities/research_project/resources';
import { leaveManagementSetupSchema } from '@/capabilities/leave_management/setupSchema';
import { leaveManagementResources } from '@/capabilities/leave_management/resources';
import { promotionalDealSetupSchema } from '@/capabilities/promotional_deal/setupSchema';
import { promotionalDealResources } from '@/capabilities/promotional_deal/resources';

// 30개 외부 연동 없는 독립 신규 Capability 스키마 & 리소스
import { dailyPosReconciliationSetupSchema } from '@/capabilities/daily_pos_reconciliation/setupSchema';
import { dailyPosReconciliationResources } from '@/capabilities/daily_pos_reconciliation/resources';
import { lostCardRfidSetupSchema } from '@/capabilities/lost_card_rfid/setupSchema';
import { lostCardRfidResources } from '@/capabilities/lost_card_rfid/resources';
import { valetKeyCustodySetupSchema } from '@/capabilities/valet_key_custody/setupSchema';
import { valetKeyCustodyResources } from '@/capabilities/valet_key_custody/resources';
import { coatroomBaggageSetupSchema } from '@/capabilities/coatroom_baggage/setupSchema';
import { coatroomBaggageResources } from '@/capabilities/coatroom_baggage/resources';
import { lockerEmergencyOverrideSetupSchema } from '@/capabilities/locker_emergency_override/setupSchema';
import { lockerEmergencyOverrideResources } from '@/capabilities/locker_emergency_override/resources';
import { soundBroadcastScheduleSetupSchema } from '@/capabilities/sound_broadcast_schedule/setupSchema';
import { soundBroadcastScheduleResources } from '@/capabilities/sound_broadcast_schedule/resources';
import { certificateIssuanceSetupSchema } from '@/capabilities/certificate_issuance/setupSchema';
import { certificateIssuanceResources } from '@/capabilities/certificate_issuance/resources';
import { customerBlacklistGuardSetupSchema } from '@/capabilities/customer_blacklist_guard/setupSchema';
import { customerBlacklistGuardResources } from '@/capabilities/customer_blacklist_guard/resources';
import { franchiseSupervisionSetupSchema } from '@/capabilities/franchise_supervision/setupSchema';
import { franchiseSupervisionResources } from '@/capabilities/franchise_supervision/resources';
import { ndaPrivacyAuditSetupSchema } from '@/capabilities/nda_privacy_audit/setupSchema';
import { ndaPrivacyAuditResources } from '@/capabilities/nda_privacy_audit/resources';
import { subleaseSpaceContractSetupSchema } from '@/capabilities/sublease_space_contract/setupSchema';
import { subleaseSpaceContractResources } from '@/capabilities/sublease_space_contract/resources';
import { calibrationMeteringSetupSchema } from '@/capabilities/calibration_metering/setupSchema';
import { calibrationMeteringResources } from '@/capabilities/calibration_metering/resources';
import { keyAccessControlSetupSchema } from '@/capabilities/key_access_control/setupSchema';
import { keyAccessControlResources } from '@/capabilities/key_access_control/resources';
import { hazardousWasteLogSetupSchema } from '@/capabilities/hazardous_waste_log/setupSchema';
import { hazardousWasteLogResources } from '@/capabilities/hazardous_waste_log/resources';
import { consumableDispenserSetupSchema } from '@/capabilities/consumable_dispenser/setupSchema';
import { consumableDispenserResources } from '@/capabilities/consumable_dispenser/resources';
import { energyUtilityMeterSetupSchema } from '@/capabilities/energy_utility_meter/setupSchema';
import { energyUtilityMeterResources } from '@/capabilities/energy_utility_meter/resources';
import { onboardingChecklistSetupSchema } from '@/capabilities/onboarding_checklist/setupSchema';
import { onboardingChecklistResources } from '@/capabilities/onboarding_checklist/resources';
import { skillsMatrixCertSetupSchema } from '@/capabilities/skills_matrix_cert/setupSchema';
import { skillsMatrixCertResources } from '@/capabilities/skills_matrix_cert/resources';
import { whistleblowerGrievanceSetupSchema } from '@/capabilities/whistleblower_grievance/setupSchema';
import { whistleblowerGrievanceResources } from '@/capabilities/whistleblower_grievance/resources';
import { uniformSafetyGearSetupSchema } from '@/capabilities/uniform_safety_gear/setupSchema';
import { uniformSafetyGearResources } from '@/capabilities/uniform_safety_gear/resources';
import { pettyCashExpenseSetupSchema } from '@/capabilities/petty_cash_expense/setupSchema';
import { pettyCashExpenseResources } from '@/capabilities/petty_cash_expense/resources';
import { prepaidTaxWithholdingSetupSchema } from '@/capabilities/prepaid_tax_withholding/setupSchema';
import { prepaidTaxWithholdingResources } from '@/capabilities/prepaid_tax_withholding/resources';
import { royaltyProfitShareSetupSchema } from '@/capabilities/royalty_profit_share/setupSchema';
import { royaltyProfitShareResources } from '@/capabilities/royalty_profit_share/resources';
import { serviceWarrantyClaimSetupSchema } from '@/capabilities/service_warranty_claim/setupSchema';
import { serviceWarrantyClaimResources } from '@/capabilities/service_warranty_claim/resources';
import { customOrderCraftSetupSchema } from '@/capabilities/custom_order_craft/setupSchema';
import { customOrderCraftResources } from '@/capabilities/custom_order_craft/resources';
import { mediaAssetDamSetupSchema } from '@/capabilities/media_asset_dam/setupSchema';
import { mediaAssetDamResources } from '@/capabilities/media_asset_dam/resources';
import { exhibitionArtCurationSetupSchema } from '@/capabilities/exhibition_art_curation/setupSchema';
import { exhibitionArtCurationResources } from '@/capabilities/exhibition_art_curation/resources';
import { vipConciergePreferenceSetupSchema } from '@/capabilities/vip_concierge_preference/setupSchema';
import { vipConciergePreferenceResources } from '@/capabilities/vip_concierge_preference/resources';
import { studyGroupStudyHallSetupSchema } from '@/capabilities/study_group_study_hall/setupSchema';
import { studyGroupStudyHallResources } from '@/capabilities/study_group_study_hall/resources';
import { mentorMenteeMatchSetupSchema } from '@/capabilities/mentor_mentee_match/setupSchema';
import { mentorMenteeMatchResources } from '@/capabilities/mentor_mentee_match/resources';

// 전문 ERP 벤치마킹 7대 신규 Capability
import { simplePlCashflowSetupSchema } from '@/capabilities/simple_pl_cashflow/setupSchema';
import { simplePlCashflowResources } from '@/capabilities/simple_pl_cashflow/resources';
import { fixedAssetDepreciationSetupSchema } from '@/capabilities/fixed_asset_depreciation/setupSchema';
import { fixedAssetDepreciationResources } from '@/capabilities/fixed_asset_depreciation/resources';
import { procurement3WayMatchSetupSchema } from '@/capabilities/procurement_3way_match/setupSchema';
import { procurement3WayMatchResources } from '@/capabilities/procurement_3way_match/resources';
import { fefoLotTrackerSetupSchema } from '@/capabilities/fefo_lot_tracker/setupSchema';
import { fefoLotTrackerResources } from '@/capabilities/fefo_lot_tracker/resources';
import { budgetCeilingQuotaSetupSchema } from '@/capabilities/budget_ceiling_quota/setupSchema';
import { budgetCeilingQuotaResources } from '@/capabilities/budget_ceiling_quota/resources';
import { fieldAuditTrailSetupSchema } from '@/capabilities/field_audit_trail/setupSchema';
import { fieldAuditTrailResources } from '@/capabilities/field_audit_trail/resources';
import { vendorScorecardSetupSchema } from '@/capabilities/vendor_scorecard/setupSchema';
import { vendorScorecardResources } from '@/capabilities/vendor_scorecard/resources';
import { fieldDispatchSetupSchema } from '@/capabilities/field_dispatch/setupSchema';
import { fieldDispatchResources } from '@/capabilities/field_dispatch/resources';
import { waitlistQueueSetupSchema } from '@/capabilities/waitlist_queue/setupSchema';
import { waitlistQueueResources } from '@/capabilities/waitlist_queue/resources';
import { hazardousSubstanceMsdsSetupSchema } from '@/capabilities/hazardous_substance_msds/setupSchema';
import { hazardousSubstanceMsdsResources } from '@/capabilities/hazardous_substance_msds/resources';
import { electronicLabNotebookSetupSchema } from '@/capabilities/electronic_lab_notebook/setupSchema';
import { electronicLabNotebookResources } from '@/capabilities/electronic_lab_notebook/resources';
import { vehicleMileageLogSetupSchema } from '@/capabilities/vehicle_mileage_log/setupSchema';
import { vehicleMileageLogResources } from '@/capabilities/vehicle_mileage_log/resources';
import { safetyWorkPermitSetupSchema } from '@/capabilities/safety_work_permit/setupSchema';
import { safetyWorkPermitResources } from '@/capabilities/safety_work_permit/resources';
import { babyFoodCoopSetupSchema } from '@/capabilities/baby_food_coop/setupSchema';
import { babyFoodCoopResources } from '@/capabilities/baby_food_coop/resources';


/**
 * 전방위 17대 원자적 Capability 번들 레지스트리
 */
export const CAPABILITY_BUNDLES: Record<BundledPresetCapabilityId, CapabilityModuleBundle> = {
  // 기존 5대 기능
  attendance: {
    capabilityId: 'attendance',
    setupSchema: attendanceSetupSchema,
    resources: attendanceResources,
  },
  passes: {
    capabilityId: 'passes',
    setupSchema: passesSetupSchema,
    resources: passesResources,
  },
  locker: {
    capabilityId: 'locker',
    setupSchema: lockerSetupSchema,
    resources: lockerResources,
  },
  booking: {
    capabilityId: 'booking',
    setupSchema: bookingSetupSchema,
    resources: bookingResources,
  },
  inventory: {
    capabilityId: 'inventory',
    setupSchema: inventorySetupSchema,
    resources: inventoryResources,
  },

  // 범주 A: 공간·시설 점유 및 자원 순환
  seat_room: {
    capabilityId: 'seat_room',
    setupSchema: seatRoomSetupSchema,
    resources: seatRoomResources,
  },
  rental_equipment: {
    capabilityId: 'rental_equipment',
    setupSchema: rentalEquipmentSetupSchema,
    resources: rentalEquipmentResources,
  },
  maintenance_checklist: {
    capabilityId: 'maintenance_checklist',
    setupSchema: maintenanceChecklistSetupSchema,
    resources: maintenanceChecklistResources,
  },

  // 범주 B: 인력 배정 및 작업 공정
  instructor_match: {
    capabilityId: 'instructor_match',
    setupSchema: instructorMatchSetupSchema,
    resources: instructorMatchResources,
  },
  shift_schedule: {
    capabilityId: 'shift_schedule',
    setupSchema: shiftScheduleSetupSchema,
    resources: shiftScheduleResources,
  },
  task_pipeline: {
    capabilityId: 'task_pipeline',
    setupSchema: taskPipelineSetupSchema,
    resources: taskPipelineResources,
  },

  // 범주 C: 정기 청구 및 무과금 원장
  billing_invoicing: {
    capabilityId: 'billing_invoicing',
    setupSchema: billingInvoicingSetupSchema,
    resources: billingInvoicingResources,
  },
  ledger_simple: {
    capabilityId: 'ledger_simple',
    setupSchema: ledgerSimpleSetupSchema,
    resources: ledgerSimpleResources,
  },
  credit_wallet: {
    capabilityId: 'credit_wallet',
    setupSchema: creditWalletSetupSchema,
    resources: creditWalletResources,
  },

  // 범주 D: 고객 맞춤 이력 & 신뢰 관리
  consultation_crm: {
    capabilityId: 'consultation_crm',
    setupSchema: consultationCrmSetupSchema,
    resources: consultationCrmResources,
  },
  treatment_chart: {
    capabilityId: 'treatment_chart',
    setupSchema: treatmentChartSetupSchema,
    resources: treatmentChartResources,
  },
  safety_consent: {
    capabilityId: 'safety_consent',
    setupSchema: safetyConsentSetupSchema,
    resources: safetyConsentResources,
  },

  // 범주 E: 맞춤 학습 & 성장 관리
  curriculum_progress: {
    capabilityId: 'curriculum_progress',
    setupSchema: curriculumProgressSetupSchema,
    resources: curriculumProgressResources,
  },

  // 범주 F: 자동화 CRM & 고객 리텐션
  retention_marketing: {
    capabilityId: 'retention_marketing',
    setupSchema: retentionMarketingSetupSchema,
    resources: retentionMarketingResources,
  },

  // 범주 G: 비대면 주문 & 주방 공정 관리
  table_order_kds: {
    capabilityId: 'table_order_kds',
    setupSchema: tableOrderKdsSetupSchema,
    resources: tableOrderKdsResources,
  },

  // 범주 H: 피트니스 체형 & 운동 케어
  diet_body_log: {
    capabilityId: 'diet_body_log',
    setupSchema: dietBodyLogSetupSchema,
    resources: dietBodyLogResources,
  },

  // 범주 I: 통학 & 모빌리티 관제
  vehicle_shuttle: {
    capabilityId: 'vehicle_shuttle',
    setupSchema: vehicleShuttleSetupSchema,
    resources: vehicleShuttleResources,
  },

  shuttle_dispatch: {
    capabilityId: 'shuttle_dispatch',
    setupSchema: shuttleDispatchSetupSchema,
    resources: shuttleDispatchResources,
  },
  volunteer_activity: {
    capabilityId: 'volunteer_activity',
    setupSchema: volunteerActivitySetupSchema,
    resources: volunteerActivityResources,
  },
  meal_survey: {
    capabilityId: 'meal_survey',
    setupSchema: mealSurveySetupSchema,
    resources: mealSurveyResources,
  },
  office_supply_request: {
    capabilityId: 'office_supply_request',
    setupSchema: officeSupplyRequestSetupSchema,
    resources: officeSupplyRequestResources,
  },

  // 범주 J: 프리랜서 & 인센티브 정산
  commission_payroll: {
    capabilityId: 'commission_payroll',
    setupSchema: commissionPayrollSetupSchema,
    resources: commissionPayrollResources,
  },

  // 범주 K: 시설 분실물·습득물 보관
  lost_found: {
    capabilityId: 'lost_found',
    setupSchema: lostFoundSetupSchema,
    resources: lostFoundResources,
  },

  // 범주 L: 레시피 BOM & 원가 소모
  recipe_bom: {
    capabilityId: 'recipe_bom',
    setupSchema: recipeBomSetupSchema,
    resources: recipeBomResources,
  },

  // 범주 M: 전자계약 & 환불 위약금
  digital_contract: {
    capabilityId: 'digital_contract',
    setupSchema: digitalContractSetupSchema,
    resources: digitalContractResources,
  },

  // 범주 N: 시간제 공간 타이머 & 초과과금
  seat_timer_billing: {
    capabilityId: 'seat_timer_billing',
    setupSchema: seatTimerBillingSetupSchema,
    resources: seatTimerBillingResources,
  },

  // 범주 O: 시술 스타일북 & 업셀링
  treatment_portfolio: {
    capabilityId: 'treatment_portfolio',
    setupSchema: treatmentPortfolioSetupSchema,
    resources: treatmentPortfolioResources,
  },

  // 범주 P: 정비 수리 공정 칸반 & 견적
  work_order_kanban: {
    capabilityId: 'work_order_kanban',
    setupSchema: workOrderKanbanSetupSchema,
    resources: workOrderKanbanResources,
  },

  // 범주 Q: 현장 순번 대기 & DID 호출
  waitlist_turn_queue: {
    capabilityId: 'waitlist_turn_queue',
    setupSchema: waitlistTurnQueueSetupSchema,
    resources: waitlistTurnQueueResources,
  },

  // 범주 R: 노쇼 방지 보증금 에스크로
  deposit_escrow: {
    capabilityId: 'deposit_escrow',
    setupSchema: depositEscrowSetupSchema,
    resources: depositEscrowResources,
  },

  // 범주 S: 장비 수명 주기 & 감가상각
  equipment_lifecycle: {
    capabilityId: 'equipment_lifecycle',
    setupSchema: equipmentLifecycleSetupSchema,
    resources: equipmentLifecycleResources,
  },

  // 범주 T: 복합 패키지 분할 선수금
  package_split_billing: {
    capabilityId: 'package_split_billing',
    setupSchema: packageSplitBillingSetupSchema,
    resources: packageSplitBillingResources,
  },

  // 범주 U: 단원평가 성적 채점 & 취약점 분석
  exam_grade_analytics: {
    capabilityId: 'exam_grade_analytics',
    setupSchema: examGradeAnalyticsSetupSchema,
    resources: examGradeAnalyticsResources,
  },

  // 범주 V: 좌석/룸 스마트 호출 & 디지털 벨보드
  kiosk_staff_call: {
    capabilityId: 'kiosk_staff_call',
    setupSchema: kioskStaffCallSetupSchema,
    resources: kioskStaffCallResources,
  },

  // 범주 W: 패밀리 연동 & 추천인 리워드
  membership_referral_tree: {
    capabilityId: 'membership_referral_tree',
    setupSchema: membershipReferralTreeSetupSchema,
    resources: membershipReferralTreeResources,
  },

  // 범주 X: 주방 위생 HACCP & 보건증 만료
  hygiene_haccp_log: {
    capabilityId: 'hygiene_haccp_log',
    setupSchema: hygieneHaccpLogSetupSchema,
    resources: hygieneHaccpLogResources,
  },

  // 범주 Y: 사업장 작업표준 & 위험성평가
  sop_risk_assessment: {
    capabilityId: 'sop_risk_assessment',
    setupSchema: sopRiskAssessmentSetupSchema,
    resources: sopRiskAssessmentResources,
  },

  // 범주 Z: 공급처 원장 & 매입 세무 전표
  vendor_ap_invoice: {
    capabilityId: 'vendor_ap_invoice',
    setupSchema: vendorApInvoiceSetupSchema,
    resources: vendorApInvoiceResources,
  },

  // 범주 AA: 직원 근태 & 법정 급여명세서
  work_attendance_payroll: {
    capabilityId: 'work_attendance_payroll',
    setupSchema: workAttendancePayrollSetupSchema,
    resources: workAttendancePayrollResources,
  },

  // 범주 AB: 사전 예약 픽업 칸반
  pickup_orders: {
    capabilityId: 'pickup_orders',
    setupSchema: pickupOrdersSetupSchema,
    resources: pickupOrdersResources,
  },

  // 범주 AC: 모바일 전자 스탬프 / 칭찬 스티커
  loyalty_stamp: {
    capabilityId: 'loyalty_stamp',
    setupSchema: loyaltyStampSetupSchema,
    resources: loyaltyStampResources,
  },

  // 범주 AD: 매장 내규·사규 관리
  workplace_policy: {
    capabilityId: 'workplace_policy',
    setupSchema: workplacePolicySetupSchema,
    resources: workplacePolicyResources,
  },

  // 범주 AE: 현장 소통 및 교대 인수인계
  feedbacks: {
    capabilityId: 'feedbacks',
    setupSchema: feedbacksSetupSchema,
    resources: feedbacksResources,
  },

  // 범주 AF: 무료 체험 및 상담 리드 전환 파이프라인
  trial_funnel: {
    capabilityId: 'trial_funnel',
    setupSchema: trial_funnelSetupSchema,
    resources: trial_funnelResources,
  },

  // 범주 AG: 수업 일지 및 학부모 알림장 피드
  learning_journal: {
    capabilityId: 'learning_journal',
    setupSchema: learning_journalSetupSchema,
    resources: learning_journalResources,
  },

  // 범주 AH: 정기 승급 심사 및 모바일 합격증
  level_assessment: {
    capabilityId: 'level_assessment',
    setupSchema: level_assessmentSetupSchema,
    resources: level_assessmentResources,
  },

  // 범주 AI: 공간 턴어라운드 및 정비 버퍼
  space_turnaround: {
    capabilityId: 'space_turnaround',
    setupSchema: space_turnaroundSetupSchema,
    resources: space_turnaroundResources,
  },

  // 범주 AJ: 소모품 안전재고 및 간이 발주서
  supply_restock: {
    capabilityId: 'supply_restock',
    setupSchema: supply_restockSetupSchema,
    resources: supply_restockResources,
  },

  // 범주 AK: 결석 보강 티켓 & 보강 슬롯 매칭
  makeup_lesson_pass: {
    capabilityId: 'makeup_lesson_pass',
    setupSchema: makeupLessonPassSetupSchema,
    resources: makeupLessonPassResources,
  },

  // 범주 AL: 사전 문진표 & 맞춤 진단서
  intake_assessment: {
    capabilityId: 'intake_assessment',
    setupSchema: intakeAssessmentSetupSchema,
    resources: intakeAssessmentResources,
  },

  // 범주 AM: 돌봄/활동 일일 알림장 & 타임라인 피드
  daily_care_report: {
    capabilityId: 'daily_care_report',
    setupSchema: dailyCareReportSetupSchema,
    resources: dailyCareReportResources,
  },

  // 범주 AN: 강사 대진/대강 긴급 호출
  substitute_dispatch: {
    capabilityId: 'substitute_dispatch',
    setupSchema: substituteDispatchSetupSchema,
    resources: substituteDispatchResources,
  },

  // 범주 AO: 모바일 일일 입장권 & QR 검표
  entry_pass_ticket: {
    capabilityId: 'entry_pass_ticket',
    setupSchema: entryPassTicketSetupSchema,
    resources: entryPassTicketResources,
  },

  // 범주 AP: 원내 발표회·대회 큐시트/심사
  event_contest_hub: {
    capabilityId: 'event_contest_hub',
    setupSchema: eventContestHubSetupSchema,
    resources: eventContestHubResources,
  },

  // 범주 AQ: 시설 안전사고·파손 경위서 & 보험 대장
  facility_incident_report: {
    capabilityId: 'facility_incident_report',
    setupSchema: facilityIncidentReportSetupSchema,
    resources: facilityIncidentReportResources,
  },

  // 범주 AR: 모바일 만족도·NPS 설문 조사 및 피드백 분석기
  nps_survey_collector: {
    capabilityId: 'nps_survey_collector',
    setupSchema: npsSurveyCollectorSetupSchema,
    resources: npsSurveyCollectorResources,
  },

  // 범주 AS: 원생 성취 퀘스트 & 0원 W3C SVG 뱃지 수여 엔진
  achievement_quest_badge: {
    capabilityId: 'achievement_quest_badge',
    setupSchema: achievementQuestBadgeSetupSchema,
    resources: achievementQuestBadgeResources,
  },

  // 범주 AT: 고객 무료 주차 등록 & 상가 주차권 정산기
  parking_validator: {
    capabilityId: 'parking_validator',
    setupSchema: parkingValidatorSetupSchema,
    resources: parkingValidatorResources,
  },

  // 범주 AU: 긴급 휴원·재난 공지 & 모바일 수신확인 대장
  emergency_alert_broadcast: {
    capabilityId: 'emergency_alert_broadcast',
    setupSchema: emergencyAlertBroadcastSetupSchema,
    resources: emergencyAlertBroadcastResources,
  },

  // 범주 AV: 오프라인 내방객 전자 방명록 & 마케팅 동의기
  digital_guestbook: {
    capabilityId: 'digital_guestbook',
    setupSchema: digitalGuestbookSetupSchema,
    resources: digitalGuestbookResources,
  },

  // 범주 AW: 목표관리(MBO) 및 실행 프로젝트
  mbo: {
    capabilityId: 'mbo',
    setupSchema: mboSetupSchema,
    resources: mboResources,
  },

  // 범주 AX: 전사 범용 전자결재 및 기안 승인 워크플로
  approval_workflow: {
    capabilityId: 'approval_workflow',
    setupSchema: approvalWorkflowSetupSchema,
    resources: approvalWorkflowResources,
  },

  // 범주 AY: 전문 품질검사 및 규격 공차 판정 대장
  quality_inspection: {
    capabilityId: 'quality_inspection',
    setupSchema: qualityInspectionSetupSchema,
    resources: qualityInspectionResources,
  },

  // 범주 AZ: 공정/사양 4M 변경관리 (ECN/ECO)
  change_management: {
    capabilityId: 'change_management',
    setupSchema: changeManagementSetupSchema,
    resources: changeManagementResources,
  },

  // 범주 BA: 특허 및 지식재산권(IP) 자산 관리
  patent_ip_asset: {
    capabilityId: 'patent_ip_asset',
    setupSchema: patentIpAssetSetupSchema,
    resources: patentIpAssetResources,
  },

  // 범주 BD: 연구과제 생명주기 (담당/예산/산출물/게이트)
  research_project: {
    capabilityId: 'research_project',
    setupSchema: researchProjectSetupSchema,
    resources: researchProjectResources,
  },

  // 범주 BB: 시간(Hour) 단위 휴가·연차 관리
  leave_management: {
    capabilityId: 'leave_management',
    setupSchema: leaveManagementSetupSchema,
    resources: leaveManagementResources,
  },

  // 범주 BC: 기간 한정 특가 & 이벤트 스케줄러
  promotional_deal: {
    capabilityId: 'promotional_deal',
    setupSchema: promotionalDealSetupSchema,
    resources: promotionalDealResources,
  },

  // 30개 외부 연동 없는 독립 신규 Capability
  daily_pos_reconciliation: {
    capabilityId: 'daily_pos_reconciliation',
    setupSchema: dailyPosReconciliationSetupSchema,
    resources: dailyPosReconciliationResources,
  },
  lost_card_rfid: {
    capabilityId: 'lost_card_rfid',
    setupSchema: lostCardRfidSetupSchema,
    resources: lostCardRfidResources,
  },
  valet_key_custody: {
    capabilityId: 'valet_key_custody',
    setupSchema: valetKeyCustodySetupSchema,
    resources: valetKeyCustodyResources,
  },
  coatroom_baggage: {
    capabilityId: 'coatroom_baggage',
    setupSchema: coatroomBaggageSetupSchema,
    resources: coatroomBaggageResources,
  },
  locker_emergency_override: {
    capabilityId: 'locker_emergency_override',
    setupSchema: lockerEmergencyOverrideSetupSchema,
    resources: lockerEmergencyOverrideResources,
  },
  sound_broadcast_schedule: {
    capabilityId: 'sound_broadcast_schedule',
    setupSchema: soundBroadcastScheduleSetupSchema,
    resources: soundBroadcastScheduleResources,
  },
  certificate_issuance: {
    capabilityId: 'certificate_issuance',
    setupSchema: certificateIssuanceSetupSchema,
    resources: certificateIssuanceResources,
  },
  customer_blacklist_guard: {
    capabilityId: 'customer_blacklist_guard',
    setupSchema: customerBlacklistGuardSetupSchema,
    resources: customerBlacklistGuardResources,
  },
  franchise_supervision: {
    capabilityId: 'franchise_supervision',
    setupSchema: franchiseSupervisionSetupSchema,
    resources: franchiseSupervisionResources,
  },
  nda_privacy_audit: {
    capabilityId: 'nda_privacy_audit',
    setupSchema: ndaPrivacyAuditSetupSchema,
    resources: ndaPrivacyAuditResources,
  },
  sublease_space_contract: {
    capabilityId: 'sublease_space_contract',
    setupSchema: subleaseSpaceContractSetupSchema,
    resources: subleaseSpaceContractResources,
  },
  calibration_metering: {
    capabilityId: 'calibration_metering',
    setupSchema: calibrationMeteringSetupSchema,
    resources: calibrationMeteringResources,
  },
  key_access_control: {
    capabilityId: 'key_access_control',
    setupSchema: keyAccessControlSetupSchema,
    resources: keyAccessControlResources,
  },
  hazardous_waste_log: {
    capabilityId: 'hazardous_waste_log',
    setupSchema: hazardousWasteLogSetupSchema,
    resources: hazardousWasteLogResources,
  },
  consumable_dispenser: {
    capabilityId: 'consumable_dispenser',
    setupSchema: consumableDispenserSetupSchema,
    resources: consumableDispenserResources,
  },
  energy_utility_meter: {
    capabilityId: 'energy_utility_meter',
    setupSchema: energyUtilityMeterSetupSchema,
    resources: energyUtilityMeterResources,
  },
  onboarding_checklist: {
    capabilityId: 'onboarding_checklist',
    setupSchema: onboardingChecklistSetupSchema,
    resources: onboardingChecklistResources,
  },
  skills_matrix_cert: {
    capabilityId: 'skills_matrix_cert',
    setupSchema: skillsMatrixCertSetupSchema,
    resources: skillsMatrixCertResources,
  },
  whistleblower_grievance: {
    capabilityId: 'whistleblower_grievance',
    setupSchema: whistleblowerGrievanceSetupSchema,
    resources: whistleblowerGrievanceResources,
  },
  uniform_safety_gear: {
    capabilityId: 'uniform_safety_gear',
    setupSchema: uniformSafetyGearSetupSchema,
    resources: uniformSafetyGearResources,
  },
  petty_cash_expense: {
    capabilityId: 'petty_cash_expense',
    setupSchema: pettyCashExpenseSetupSchema,
    resources: pettyCashExpenseResources,
  },
  prepaid_tax_withholding: {
    capabilityId: 'prepaid_tax_withholding',
    setupSchema: prepaidTaxWithholdingSetupSchema,
    resources: prepaidTaxWithholdingResources,
  },
  royalty_profit_share: {
    capabilityId: 'royalty_profit_share',
    setupSchema: royaltyProfitShareSetupSchema,
    resources: royaltyProfitShareResources,
  },
  service_warranty_claim: {
    capabilityId: 'service_warranty_claim',
    setupSchema: serviceWarrantyClaimSetupSchema,
    resources: serviceWarrantyClaimResources,
  },
  custom_order_craft: {
    capabilityId: 'custom_order_craft',
    setupSchema: customOrderCraftSetupSchema,
    resources: customOrderCraftResources,
  },
  media_asset_dam: {
    capabilityId: 'media_asset_dam',
    setupSchema: mediaAssetDamSetupSchema,
    resources: mediaAssetDamResources,
  },
  exhibition_art_curation: {
    capabilityId: 'exhibition_art_curation',
    setupSchema: exhibitionArtCurationSetupSchema,
    resources: exhibitionArtCurationResources,
  },
  vip_concierge_preference: {
    capabilityId: 'vip_concierge_preference',
    setupSchema: vipConciergePreferenceSetupSchema,
    resources: vipConciergePreferenceResources,
  },
  study_group_study_hall: {
    capabilityId: 'study_group_study_hall',
    setupSchema: studyGroupStudyHallSetupSchema,
    resources: studyGroupStudyHallResources,
  },
  mentor_mentee_match: {
    capabilityId: 'mentor_mentee_match',
    setupSchema: mentorMenteeMatchSetupSchema,
    resources: mentorMenteeMatchResources,
  },
  simple_pl_cashflow: {
    capabilityId: 'simple_pl_cashflow',
    setupSchema: simplePlCashflowSetupSchema,
    resources: simplePlCashflowResources,
  },
  fixed_asset_depreciation: {
    capabilityId: 'fixed_asset_depreciation',
    setupSchema: fixedAssetDepreciationSetupSchema,
    resources: fixedAssetDepreciationResources,
  },
  procurement_3way_match: {
    capabilityId: 'procurement_3way_match',
    setupSchema: procurement3WayMatchSetupSchema,
    resources: procurement3WayMatchResources,
  },
  fefo_lot_tracker: {
    capabilityId: 'fefo_lot_tracker',
    setupSchema: fefoLotTrackerSetupSchema,
    resources: fefoLotTrackerResources,
  },
  budget_ceiling_quota: {
    capabilityId: 'budget_ceiling_quota',
    setupSchema: budgetCeilingQuotaSetupSchema,
    resources: budgetCeilingQuotaResources,
  },
  field_audit_trail: {
    capabilityId: 'field_audit_trail',
    setupSchema: fieldAuditTrailSetupSchema,
    resources: fieldAuditTrailResources,
  },
  vendor_scorecard: {
    capabilityId: 'vendor_scorecard',
    setupSchema: vendorScorecardSetupSchema,
    resources: vendorScorecardResources,
  },
  field_dispatch: {
    capabilityId: 'field_dispatch',
    setupSchema: fieldDispatchSetupSchema,
    resources: fieldDispatchResources,
  },
  waitlist_queue: {
    capabilityId: 'waitlist_queue',
    setupSchema: waitlistQueueSetupSchema,
    resources: waitlistQueueResources,
  },
  hazardous_substance_msds: {
    capabilityId: 'hazardous_substance_msds',
    setupSchema: hazardousSubstanceMsdsSetupSchema,
    resources: hazardousSubstanceMsdsResources,
  },
  electronic_lab_notebook: {
    capabilityId: 'electronic_lab_notebook',
    setupSchema: electronicLabNotebookSetupSchema,
    resources: electronicLabNotebookResources,
  },
  vehicle_mileage_log: {
    capabilityId: 'vehicle_mileage_log',
    setupSchema: vehicleMileageLogSetupSchema,
    resources: vehicleMileageLogResources,
  },
  safety_work_permit: {
    capabilityId: 'safety_work_permit',
    setupSchema: safetyWorkPermitSetupSchema,
    resources: safetyWorkPermitResources,
  },
  baby_food_coop: {
    capabilityId: 'baby_food_coop',
    setupSchema: babyFoodCoopSetupSchema,
    resources: babyFoodCoopResources,
  },
};


// Core 런타임 동적 레지스트리에 번들 등록
registerCapabilityBundles(CAPABILITY_BUNDLES);

/**
 * 40대 전방위 업종 프리셋 선언적 정의 (40 Industry Preset Configurations)
 *
 * Core–Capability–Preset 3계층 엄격 분리 원칙:
 * 1. 업종별 별도 애플리케이션을 복제하지 않는다.
 * 2. 원자적 Capability(17종)의 결합과 업무 규칙 선언으로 40개 업종을 온전히 표현한다.
 * 3. 각 프리셋은 필수/선택 기능, 자원 템플릿, 역할 권한, 업무 규칙 및 완성도 수준(Readiness)을 명시한다.
 */
