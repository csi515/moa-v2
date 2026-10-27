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
export const INDUSTRY_PRESETS: Record<string, IndustryPresetDefinition> = {
  // ==========================================
  // Group 1: 학원·교육 (Education) - 8종
  // ==========================================
  piano: {
    id: 'piano',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🎹"
    },
    starterPassTemplates: [
        {
            "name": "월 주2회 정규 클래식 과정",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "성인 취미 1:1 맞춤 레슨 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 45,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "입시 집중반 (월 주4회 + 연습실 무료)",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 380000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님",
      "space": "연습실",
      "pass": "수강권",
      "fee": "교습비",
      "lesson": "피아노레슨",
      "level": "진도"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "19:00",
      "slot_minutes": 30
    },
    facilities: {
      "turnaroundBufferMinutes": 5
    },

    name: '피아노·음악학원',
    description: '원생 출결, 1:1 레슨 피아노 연습실 배정, 교습비 정기 청구, 교재 및 진도 관리',
    category: 'education',
    capabilities: ['seat_room', 'attendance', 'passes', 'billing_invoicing', 'consultation_crm', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'membership_referral_tree'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['seat_room', 'consultation_crm', 'inventory', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'membership_referral_tree'] as const,
    businessRules: {
      practiceMode: 'free',
      lessonDurationMinutes: 30,
      autoCheckInDeduct: true,
      unpaidNoticeDayOfMonth: 25,
    },
    resourceTypes: [
      { name: '그랜드룸', type: 'room', capacity: 2 },
      { name: '연습실 1~4호', type: 'room', capacity: 1 },
      { name: '업라이트 피아노', type: 'equipment' },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'], description: '학원 총괄 및 수납·인사 전권' },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'passes:view', 'consultation:*'], description: '레슨 배정 및 출결/상담' },
      { name: '파트강사', rank_order: 3, permissions: ['attendance:checkin'], description: '출결 체크인 보조' },
    ],
    onboardingSteps: ['연습실 룸 등록', '교습비 단가 및 납부일 설정', '원생 일괄 등록'],
    readinessLevel: 'verified',
  },

  general_academy: {
    id: 'general_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🎓"
    },
    starterPassTemplates: [
        {
            "name": "국영수 단과 월정규 수강권",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 250000,
            "badge": "인기"
        },
        {
            "name": "종합 집중 케어반 (주5회)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 420000,
            "badge": "추천"
        },
        {
            "name": "내신 파이널 2주 특강",
            "passType": "COUNT_BASED",
            "totalCount": 6,
            "validityDays": 14,
            "recommendedPrice": 150000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님/강사",
      "space": "강의실",
      "pass": "수강권",
      "fee": "수강료",
      "lesson": "수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "14:00",
      "end_time": "22:00",
      "slot_minutes": 50
    },

    name: '일반 보습학원',
    description: 'PIN/QR 등하원 출결, 월 교습비 정기 청구서, 학부모 상담일지 및 수강권 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'passes', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'exam_grade_analytics', 'membership_referral_tree'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'shift_schedule', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'exam_grade_analytics', 'membership_referral_tree'] as const,
    businessRules: {
      attendanceGraceMinutes: 10,
      tuitionBillingCycle: 'monthly',
    },
    resourceTypes: [{ name: '강의실 1~3관', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'consultation:*'] },
      { name: '조교', rank_order: 3, permissions: ['attendance:checkin'] },
    ],
    readinessLevel: 'basic_ui',
  },

  language_academy: {
    id: 'language_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🗣️"
    },
    starterPassTemplates: [
        {
            "name": "원어민 회화 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 220000,
            "badge": "인기"
        },
        {
            "name": "토익/오픽 단기 완성 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 60,
            "recommendedPrice": 380000,
            "badge": "추천"
        },
        {
            "name": "1:1 비즈니스 영어 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 45,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "강사/원어민강사",
      "space": "실습실/랩실",
      "pass": "수강권",
      "fee": "수강료",
      "lesson": "회화수업",
      "level": "레벨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },

    name: '어학원',
    description: '레벨별 수업 예약, 수강권 차감, 어학 실습실 및 원어민 강사 일정 관리',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'billing_invoicing', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'exam_grade_analytics'] as const,
    businessRules: { allowLevelReservation: true, maxStudentsPerClass: 12 },
    resourceTypes: [{ name: '어학랩실', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '원어민강사', rank_order: 2, permissions: ['attendance:*', 'booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  art_academy: {
    id: 'art_academy',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🎨"
    },
    starterPassTemplates: [
        {
            "name": "유초등 창의미술 주2회 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "예고/미대 입시 실기 집중반 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 450000,
            "badge": "추천"
        },
        {
            "name": "성인 취미 드로잉 4회 쿠폰권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 45,
            "recommendedPrice": 140000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님/작가",
      "space": "실기실",
      "pass": "회차수강권",
      "fee": "교습비",
      "lesson": "실기수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '미술학원',
    description: '회차별 실기 출결, 미술 재료 소모품 재고, 수강료 청구 및 포트폴리오 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'inventory', 'passes', 'curriculum_progress', 'vehicle_shuttle'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['inventory', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle'] as const,
    businessRules: { materialFeeIncluded: true },
    resourceTypes: [{ name: '실기실', type: 'room', capacity: 12 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '실기강사', rank_order: 2, permissions: ['attendance:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  taekwondo_academy: {
    id: 'taekwondo_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🥋"
    },
    starterPassTemplates: [
        {
            "name": "월 정규 수련권 (주5회 매일반)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "월 정규 수련권 (주3회 선택반)",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 150000
        },
        {
            "name": "신규 입관 패키지 (도복+수련 1개월)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 220000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "수련생/관원",
      "instructor": "관장/사범",
      "space": "수련실/도장",
      "pass": "월수련권",
      "fee": "수련비",
      "lesson": "수련",
      "level": "품/단"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "20:30",
      "slot_minutes": 50
    },

    name: '태권도장',
    description: '수련부 출결, 정기 수련권, 도복/띠 재고, 차량 탑승 및 안전 서약서',
    category: 'education',
    capabilities: ['attendance', 'passes', 'billing_invoicing', 'safety_consent', 'curriculum_progress', 'vehicle_shuttle', 'membership_referral_tree', 'loyalty_stamp'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['safety_consent', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'membership_referral_tree', 'loyalty_stamp'] as const,
    businessRules: { promotionBeltLevels: 9, attendancePinDigits: 4 },
    resourceTypes: [{ name: '수련장', type: 'court', capacity: 40 }],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '사범', rank_order: 2, permissions: ['attendance:*', 'passes:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  dance_academy: {
    id: 'dance_academy',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "💃"
    },
    starterPassTemplates: [
        {
            "name": "K-POP 댄스 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "취미 쿠폰제 10회 수강권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 200000,
            "badge": "추천"
        },
        {
            "name": "오디션/전문반 월집중 클래스",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "강사/안무가",
      "space": "연습홀",
      "pass": "쿠폰/수강권",
      "fee": "수강료",
      "lesson": "댄스레슨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "12:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },

    name: '무용·댄스학원',
    description: '클래스별 정원 예약, 무용홀 대관, 쿠폰제 수강권 차감 및 발표회 일정',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'seat_room', 'billing_invoicing', 'curriculum_progress'] as const,
    requiredCapabilities: ['attendance', 'passes', 'seat_room'] as const,
    optionalCapabilities: ['booking', 'billing_invoicing', 'curriculum_progress'] as const,
    businessRules: { classCapacityLimit: 20 },
    resourceTypes: [{ name: 'A홀', type: 'room', capacity: 25 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  coding_academy: {
    id: 'coding_academy',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🤖"
    },
    starterPassTemplates: [
        {
            "name": "초중등 엔트리/스크래치 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "파이썬/C언어 기초 알고리즘 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 60,
            "recommendedPrice": 320000,
            "badge": "추천"
        },
        {
            "name": "정보올림피아드 대비 특강",
            "passType": "COUNT_BASED",
            "totalCount": 6,
            "validityDays": 30,
            "recommendedPrice": 240000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "멘토/강사",
      "space": "PC실습실",
      "pass": "코스수강권",
      "fee": "수강료",
      "lesson": "실습수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '코딩·IT 학원',
    description: 'PC 실습 좌석 배정, 프로젝트 과제 파이프라인, 출결 및 월 교습비 관리',
    category: 'education',
    capabilities: ['attendance', 'seat_room', 'billing_invoicing', 'task_pipeline', 'curriculum_progress', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['task_pipeline', 'consultation_crm', 'curriculum_progress', 'exam_grade_analytics'] as const,
    businessRules: { pcSeatAssignment: true },
    resourceTypes: [{ name: 'PC실습실', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '멘토강사', rank_order: 2, permissions: ['attendance:*', 'task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  exam_tutoring: {
    id: 'exam_tutoring',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "📝"
    },
    starterPassTemplates: [
        {
            "name": "1:1 밀착 과외 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 400000,
            "badge": "추천"
        },
        {
            "name": "소수정예 3:1 클리닉 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 45,
            "recommendedPrice": 280000,
            "badge": "인기"
        },
        {
            "name": "오답노트 & 모의고사 첨삭 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 120000
        }
    ],
    terms: {
      "customer": "학생",
      "instructor": "선생님/멘토",
      "space": "상담지도실",
      "pass": "수강권",
      "fee": "수업료",
      "lesson": "개별지도"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "15:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },

    name: '입시·과외 학원',
    description: '1:1 개별지도 스케줄, 학습 플래너 상담 일지, 시급/수강료 정산 관리',
    category: 'education',
    capabilities: ['attendance', 'consultation_crm', 'billing_invoicing', 'shift_schedule', 'curriculum_progress', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'consultation_crm', 'billing_invoicing'] as const,
    optionalCapabilities: ['shift_schedule', 'passes', 'curriculum_progress', 'exam_grade_analytics'] as const,
    businessRules: { oneOnOneSchedule: true },
    resourceTypes: [{ name: '상담지도실', type: 'room', capacity: 4 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '과외강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  culture_center: {
    id: 'culture_center',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🏛️"
    },
    starterPassTemplates: [
        {
            "name": "정기 문화강좌 12주 수강권",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "주말 일일 특강 체험권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 20000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원/수강생",
      "instructor": "강사",
      "space": "강의실/실습실",
      "pass": "학기수강권",
      "fee": "수강료",
      "lesson": "강좌"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "20:00",
      "slot_minutes": 50
    },

    name: '문화센터·평생교육원',
    description: '강의실-강사-시간표 스케줄링, 강사료 수강매출 배분(RS %) 위탁계약서 및 강사 스펙 인쇄 포스터 관리',
    category: 'education',
    capabilities: [
      'booking',
      'instructor_match',
      'seat_room',
      'commission_payroll',
      'digital_contract',
      'passes',
      'attendance',
      'billing_invoicing',
      'feedbacks',
    ] as const,
    requiredCapabilities: [
      'booking',
      'instructor_match',
      'seat_room',
      'commission_payroll',
      'digital_contract',
    ] as const,
    optionalCapabilities: [
      'passes',
      'attendance',
      'billing_invoicing',
      'feedbacks',
    ] as const,
    businessRules: {
      defaultRevenueShareRate: 0.50,
      materialCostDeduction: true,
      cardFeeRate: 0.03,
      withholdingTaxRate: 0.033,
    },
    resourceTypes: [
      { name: '301호 조리실습실', type: 'room', capacity: 16 },
      { name: '201호 무용실', type: 'room', capacity: 25 },
      { name: '202호 미술실', type: 'room', capacity: 20 },
      { name: '101호 대강의실', type: 'room', capacity: 60 },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'], description: '센터 운영 총괄 및 위탁 계약/매출 정산 승인' },
      { name: '강좌매니저', rank_order: 2, permissions: ['scheduling:*', 'seat_room:*', 'instructor_match:*', 'passes:*', 'attendance:*'], description: '학기별 강좌 개설, 강의실 배정 및 수강생 접수' },
      { name: '전임강사', rank_order: 3, permissions: ['instructor_match:view', 'attendance:*', 'feedbacks:view'], description: '강좌 강의 진행, 출결 확인 및 피드백 열람' },
      { name: '파트강사', rank_order: 4, permissions: ['attendance:checkin'], description: '수업 출결 확인 보조' },
    ],
    onboardingSteps: ['강의실 및 실습실 등록', '강좌 개설 및 시간표 편성', '강사 위탁계약 체결', '수강생 모집'],
    readinessLevel: 'verified',
  },

  // ==========================================
  // Group 2: 체육·피트니스 (Fitness & Sports) - 8종
  // ==========================================
  pilates: {
    id: 'pilates',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🧘"
    },
    starterPassTemplates: [
        {
            "name": "1:1 개인레슨 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 700000,
            "badge": "추천"
        },
        {
            "name": "6:1 그룹레슨 30회권",
            "passType": "COUNT_BASED",
            "totalCount": 30,
            "validityDays": 90,
            "recommendedPrice": 360000,
            "badge": "인기"
        },
        {
            "name": "체험 1회권 (체형 분석 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 14,
            "recommendedPrice": 30000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "강사",
      "space": "기구룸/개인실",
      "pass": "회원권/회차권",
      "fee": "레슨비",
      "lesson": "필라테스레슨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30,
      "turnaroundBufferMinutes": 10
    },

    name: '필라테스 스튜디오',
    description: '리포머/체어 그룹 및 개인레슨 예약, 횟수권 차감, 강사 배정 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'instructor_match', 'seat_room', 'locker', 'diet_body_log', 'commission_payroll', 'digital_contract', 'equipment_lifecycle', 'membership_referral_tree', 'promotional_deal'] as const,
    requiredCapabilities: ['booking', 'passes', 'instructor_match'] as const,
    optionalCapabilities: ['seat_room', 'locker', 'treatment_chart', 'diet_body_log', 'commission_payroll', 'digital_contract', 'equipment_lifecycle', 'membership_referral_tree', 'promotional_deal'] as const,
    businessRules: { cancelCutoffHours: 6, maxGroupCapacity: 6 },
    resourceTypes: [
      { name: '리포머룸', type: 'room', capacity: 6 },
      { name: '체어룸', type: 'room', capacity: 6 },
      { name: '개인레슨실', type: 'room', capacity: 1 },
      { name: '락커 1~30번', type: 'locker' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '수석강사', rank_order: 2, permissions: ['booking:*', 'passes:*'] },
      { name: '강사', rank_order: 3, permissions: ['attendance:checkin', 'booking:view'] },
    ],
    readinessLevel: 'verified',
  },

  yoga_studio: {
    id: 'yoga_studio',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🧘"
    },
    starterPassTemplates: [
        {
            "name": "힐링/빈야사 요가 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 36,
            "validityDays": 90,
            "recommendedPrice": 360000,
            "badge": "인기"
        },
        {
            "name": "자유 예약 10회 쿠폰권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "싱잉볼 명상 원데이 클래스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 40000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원/요기",
      "instructor": "선생님/지도자",
      "space": "요가룸",
      "pass": "수련권/기간권",
      "fee": "월회비",
      "lesson": "요가수련"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 20
    },

    name: '요가 스튜디오',
    description: '수련 타임테이블 예약, 기간제/횟수제 이용권, 출결 체크인 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'attendance', 'locker', 'seat_room', 'diet_body_log', 'promotional_deal'] as const,
    requiredCapabilities: ['booking', 'passes', 'attendance'] as const,
    optionalCapabilities: ['locker', 'seat_room', 'diet_body_log', 'promotional_deal'] as const,
    businessRules: { allowWalkInCheckIn: true },
    resourceTypes: [{ name: '메인 수련실', type: 'room', capacity: 18 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '요가강사', rank_order: 2, permissions: ['booking:*', 'attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  gym_fitness: {
    id: 'gym_fitness',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "⚡"
    },
    starterPassTemplates: [
        {
            "name": "헬스 3개월 정기 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "1:1 PT 10회권 (락커/운동복 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 600000,
            "badge": "추천"
        },
        {
            "name": "헬스 12개월 연간 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 365,
            "validityDays": 365,
            "recommendedPrice": 480000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "트레이너",
      "space": "운동존/머신존",
      "pass": "헬스이용권",
      "fee": "월회비",
      "lesson": "PT"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 80
    },

    name: '헬스장 / 피트니스 센터',
    description: '회원권 기간 관리, 입장 바코드/PIN 출결, 개인 락커 배정, 운동복 대여',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'rental_equipment', 'ledger_simple', 'retention_marketing', 'diet_body_log', 'lost_found', 'digital_contract', 'equipment_lifecycle', 'package_split_billing', 'sop_risk_assessment', 'work_attendance_payroll', 'promotional_deal'] as const,
    requiredCapabilities: ['passes', 'attendance', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'retention_marketing', 'diet_body_log', 'lost_found', 'digital_contract', 'equipment_lifecycle', 'package_split_billing', 'sop_risk_assessment', 'work_attendance_payroll', 'promotional_deal'] as const,
    businessRules: { membershipHoldMaxDays: 30 },
    resourceTypes: [
      { name: '헬스존', type: 'room', capacity: 100 },
      { name: '개인락커', type: 'locker' },
      { name: '회원복', type: 'equipment' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: 'FC/트레이너', rank_order: 2, permissions: ['passes:*', 'locker:*'] },
    ],
    readinessLevel: 'persisted',
  },

  pt_fitness: {
    id: 'pt_fitness',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🏋️"
    },
    starterPassTemplates: [
        {
            "name": "1:1 개인 PT 20회 패키지 (식단 관리)",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 90,
            "recommendedPrice": 1200000,
            "badge": "인기"
        },
        {
            "name": "바디프로필 3개월 집중반 (30회)",
            "passType": "COUNT_BASED",
            "totalCount": 30,
            "validityDays": 100,
            "recommendedPrice": 1800000,
            "badge": "추천"
        },
        {
            "name": "1:1 체형교정/재활 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 700000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "트레이너/코치",
      "space": "PT존/세션룸",
      "pass": "PT세션권",
      "fee": "세션비",
      "lesson": "1:1 PT"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "07:00",
      "end_time": "22:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30
    },

    name: '1:1 피트니스 / PT 샵',
    description: 'PT 세션 차감권, 트레이너 배정, 고객 체형 상담 일지 및 락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'instructor_match', 'consultation_crm', 'locker', 'curriculum_progress', 'retention_marketing', 'diet_body_log', 'commission_payroll', 'digital_contract', 'deposit_escrow', 'membership_referral_tree', 'promotional_deal'] as const,
    requiredCapabilities: ['passes', 'booking', 'instructor_match'] as const,
    optionalCapabilities: ['consultation_crm', 'locker', 'treatment_chart', 'curriculum_progress', 'retention_marketing', 'diet_body_log', 'commission_payroll', 'digital_contract', 'deposit_escrow', 'membership_referral_tree', 'promotional_deal'] as const,
    businessRules: { ptSessionDurationMinutes: 50 },
    resourceTypes: [{ name: 'PT 세션존', type: 'room', capacity: 3 }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '트레이너', rank_order: 2, permissions: ['booking:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  indoor_golf: {
    id: 'indoor_golf',
    theme: {
        "accentColor": "emerald",
        "badgeEmoji": "⛳"
    },
    starterPassTemplates: [
        {
            "name": "60분 타석 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 200000,
            "badge": "인기"
        },
        {
            "name": "1:1 프로 레슨 10회 + 타석 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 550000,
            "badge": "추천"
        },
        {
            "name": "종일 무제한 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 450000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "레슨프로",
      "space": "타석/룸",
      "pass": "타석이용권",
      "fee": "이용료",
      "lesson": "골프레슨"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '실내 골프연습장',
    description: '타석/레슨 예약, 정기 회원권, 골프백 락커, 대여채 및 간이 시재 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'locker', 'rental_equipment', 'ledger_simple', 'curriculum_progress', 'diet_body_log', 'commission_payroll', 'lost_found', 'seat_timer_billing', 'package_split_billing', 'kiosk_staff_call', 'sop_risk_assessment'] as const,
    requiredCapabilities: ['passes', 'booking', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'instructor_match', 'curriculum_progress', 'diet_body_log', 'commission_payroll', 'lost_found', 'seat_timer_billing', 'package_split_billing', 'kiosk_staff_call', 'sop_risk_assessment'] as const,
    businessRules: { bayReservationMinutes: 60 },
    resourceTypes: [
      { name: '타석 1~12번', type: 'bay', capacity: 1 },
      { name: '골프백 락커', type: 'locker' },
      { name: '연습채', type: 'equipment' },
    ],
    roles: [
      { name: '점장', rank_order: 1, permissions: ['*'] },
      { name: '레슨프로', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  swim_school: {
    id: 'swim_school',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🏊"
    },
    starterPassTemplates: [
        {
            "name": "새벽/저녁 수영 정규 강습 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 120000,
            "badge": "인기"
        },
        {
            "name": "자유수영 10회 입장권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 70000
        },
        {
            "name": "1:1 영법 교정 레슨 5회권",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 45,
            "recommendedPrice": 250000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "회원/원생",
      "instructor": "코치/강사",
      "space": "수영레인",
      "pass": "수영강습권",
      "fee": "강습료",
      "lesson": "수영강습"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 100
    },

    name: '수영장·수영교실',
    description: '레인별 강습 예약, 정기 회원권, 탈의실 락커 배정 및 안전 서약서',
    category: 'fitness',
    capabilities: ['attendance', 'passes', 'booking', 'locker', 'safety_consent', 'curriculum_progress', 'diet_body_log', 'vehicle_shuttle', 'lost_found', 'sop_risk_assessment'] as const,
    requiredCapabilities: ['attendance', 'passes', 'locker'] as const,
    optionalCapabilities: ['booking', 'safety_consent', 'curriculum_progress', 'diet_body_log', 'vehicle_shuttle', 'lost_found', 'sop_risk_assessment'] as const,
    businessRules: { laneCapacityLimit: 15 },
    resourceTypes: [
      { name: '25m 레인 1~6', type: 'court', capacity: 15 },
      { name: '탈의실 락커', type: 'locker' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '수영강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  climbing_activity: {
    id: 'climbing_activity',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🧗"
    },
    starterPassTemplates: [
        {
            "name": "일일 자유이용권 (암벽화 대여 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 1,
            "recommendedPrice": 25000,
            "badge": "체험"
        },
        {
            "name": "정기 10회 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "1개월 정기 회원권 (전지점)",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 130000
        }
    ],
    terms: {
      "customer": "클라이머/회원",
      "instructor": "강사/세터",
      "space": "볼더링월/지구력존",
      "pass": "암장패스",
      "fee": "이용료",
      "lesson": "강습세션"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "22:30",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 40
    },

    name: '클라이밍 & 액티비티 짐',
    description: '일일/정기 이용권, 암벽화/장비 대여, 전자 면책 동의서 및 출결/락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'rental_equipment', 'safety_consent', 'locker', 'diet_body_log', 'lost_found', 'waitlist_turn_queue'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['rental_equipment', 'locker', 'diet_body_log', 'lost_found', 'waitlist_turn_queue'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '볼더링 벽 A~D', type: 'court', capacity: 25 },
      { name: '암벽화 렌탈', type: 'equipment' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['attendance:*', 'rental_equipment:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  boxing_mma: {
    id: 'boxing_mma',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🥊"
    },
    starterPassTemplates: [
        {
            "name": "복싱/MMA 3개월 정기 수련권",
            "passType": "PERIOD_BASED",
            "totalCount": 60,
            "validityDays": 90,
            "recommendedPrice": 390000,
            "badge": "인기"
        },
        {
            "name": "월 자유 수련권 (주5회)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 150000
        },
        {
            "name": "1:1 미트 트레이닝 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 400000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "관원/회원",
      "instructor": "관장/코치",
      "space": "링/샌드백존",
      "pass": "체육관등록권",
      "fee": "월회비",
      "lesson": "미트트레이닝"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 40
    },

    name: '복싱·격투기 체육관',
    description: '수련 출결 체크, 정기 이용권, 글러브/보호구 대여, 안전 서약 및 락커',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'safety_consent', 'rental_equipment', 'diet_body_log'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['locker', 'rental_equipment', 'diet_body_log'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '링 & 샌드백존', type: 'court', capacity: 30 },
      { name: '락커', type: 'locker' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '코치', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 3: 뷰티·웰빙 (Beauty & Wellness) - 8종
  // ==========================================
  hair_salon: {
    id: 'hair_salon',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "✂️"
    },
    starterPassTemplates: [
        {
            "name": "여성 디자인컷 + 스칼프 케어",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000,
            "badge": "인기"
        },
        {
            "name": "뿌리염색 + 클리닉 3회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 120,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "VIP 50만원 정액 선불권 (10% 적립)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 365,
            "recommendedPrice": 500000,
            "badge": "VIP"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "헤어디자이너",
      "space": "시술체어",
      "pass": "시술권/정액권",
      "fee": "시술비",
      "lesson": "헤어시술"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 10
    },

    name: '헤어샵 / 뷰티 살롱',
    description: '디자이너 예약, 염색약/시술 차트, 스태프 근무표 및 일일 매출 마감',
    category: 'beauty',
    capabilities: ['booking', 'treatment_chart', 'shift_schedule', 'ledger_simple', 'inventory', 'commission_payroll', 'treatment_portfolio', 'waitlist_turn_queue', 'membership_referral_tree', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['booking', 'treatment_chart', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory', 'commission_payroll', 'treatment_portfolio', 'waitlist_turn_queue', 'membership_referral_tree', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    businessRules: { doubleBookingAllowed: false, slotMinutes: 30 },
    resourceTypes: [
      { name: '경대 1~6', type: 'seat', capacity: 1 },
      { name: '샴푸실', type: 'room', capacity: 2 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '디자이너', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  barber_shop: {
    id: 'barber_shop',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "💈"
    },
    starterPassTemplates: [
        {
            "name": "맨즈 클래식컷 + 쉐이빙 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 45000,
            "badge": "인기"
        },
        {
            "name": "바버컷 5회 정기권 (두피스케일링 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 120,
            "recommendedPrice": 200000,
            "badge": "추천"
        },
        {
            "name": "다운펌 + 디자인컷 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 65000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "바버",
      "space": "바버체어",
      "pass": "회원권",
      "fee": "커트비",
      "lesson": "바버링"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 50
    },

    name: '바버숍',
    description: '바버별 1:1 예약, 면도/커트 시술 이력, 근무표 및 일일 시재 마감',
    category: 'beauty',
    capabilities: ['booking', 'shift_schedule', 'ledger_simple', 'inventory', 'treatment_portfolio'] as const,
    requiredCapabilities: ['booking', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory', 'treatment_portfolio'] as const,
    businessRules: { slotMinutes: 45 },
    resourceTypes: [{ name: '바버체어 1~3', type: 'seat', capacity: 1 }],
    roles: [
      { name: '마스터바버', rank_order: 1, permissions: ['*'] },
      { name: '바버', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  nail_salon: {
    id: 'nail_salon',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "💅"
    },
    starterPassTemplates: [
        {
            "name": "이달의 아트 젤네일 시술권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "속눈썹 펌 3회권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 120,
            "recommendedPrice": 100000,
            "badge": "추천"
        },
        {
            "name": "선불 회원권 30만원 (젤제거 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 300000,
            "badge": "VIP"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "시술아티스트",
      "space": "네일테이블/베드",
      "pass": "정액권/회차권",
      "fee": "시술비",
      "lesson": "네일아트"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '네일숍',
    description: '아트/젤네일 예약, 선불 회원권 잔액 차감, 젤네일 컬러 차트 및 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'inventory', 'ledger_simple', 'commission_payroll', 'treatment_portfolio'] as const,
    requiredCapabilities: ['booking', 'passes'] as const,
    optionalCapabilities: ['treatment_chart', 'inventory', 'ledger_simple', 'commission_payroll', 'treatment_portfolio'] as const,
    businessRules: { prepaidPassBalanceDeduct: true },
    resourceTypes: [
      { name: '네일 테이블 1~3', type: 'table', capacity: 1 },
      { name: '패디 체어', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '아티스트', rank_order: 2, permissions: ['booking:*', 'passes:deduct'] },
    ],
    readinessLevel: 'basic_ui',
  },

  skin_clinic: {
    id: 'skin_clinic',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "💆"
    },
    starterPassTemplates: [
        {
            "name": "수분 진정 맞춤 케어 5회권",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 60,
            "recommendedPrice": 350000,
            "badge": "인기"
        },
        {
            "name": "윤곽 리프팅 프로그램 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 120,
            "recommendedPrice": 900000,
            "badge": "추천"
        },
        {
            "name": "첫 방문 1회 체험권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 14,
            "recommendedPrice": 50000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "고객/회원",
      "instructor": "에스테티션",
      "space": "케어룸/스킨케어실",
      "pass": "관리회차권",
      "fee": "관리비",
      "lesson": "스킨케어"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 15
    },

    name: '피부관리실·에스테틱',
    description: '스킨케어 룸 예약, 코스 티켓팅 차감, 피부 진단 차트 및 에스테틱 화장품 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'consultation_crm', 'inventory', 'commission_payroll', 'package_split_billing'] as const,
    requiredCapabilities: ['booking', 'passes', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'inventory', 'commission_payroll', 'package_split_billing'] as const,
    businessRules: { skinAnalysisBeforeTreatment: true },
    resourceTypes: [
      { name: '관리실 1~3', type: 'room', capacity: 2 },
      { name: '에스테틱 베드', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '관리사', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*', 'passes:*'] },
    ],
    readinessLevel: 'persisted',
  },

  massage_spa: {
    id: 'massage_spa',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🌿"
    },
    starterPassTemplates: [
        {
            "name": "아로마 림프 전신 테라피 60분 (5회)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 90,
            "recommendedPrice": 450000,
            "badge": "인기"
        },
        {
            "name": "딥티슈 힐링 바디케어 90분 (10회)",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 180,
            "recommendedPrice": 1100000,
            "badge": "추천"
        },
        {
            "name": "풋케어 & 어깨 집중 40분권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "테라피스트",
      "space": "스파룸/베드",
      "pass": "테라피이용권",
      "fee": "관리료",
      "lesson": "테라피세션"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 20,
      "turnaroundBufferMinutes": 15
    },

    name: '마사지·스파',
    description: '개인/커플 스파룸 예약, 관리사 근무 교대, 정기 바우처 및 간이 정산',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'shift_schedule', 'seat_room', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'shift_schedule'] as const,
    optionalCapabilities: ['passes', 'ledger_simple'] as const,
    businessRules: { coupleRoomAvailable: true },
    resourceTypes: [{ name: '스파룸 1~4', type: 'room', capacity: 2 }],
    roles: [
      { name: '관리자', rank_order: 1, permissions: ['*'] },
      { name: '테라피스트', rank_order: 2, permissions: ['booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  tattoo_studio: {
    id: 'tattoo_studio',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🖋️"
    },
    starterPassTemplates: [
        {
            "name": "미니/레터링 타투 시술권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 80000,
            "badge": "인기"
        },
        {
            "name": "원포인트 블랙앤그레이 커스텀 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 250000,
            "badge": "추천"
        },
        {
            "name": "리터치 & 애프터케어 서비스권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 30000
        }
    ],
    terms: {
      "customer": "의뢰인/고객",
      "instructor": "타투이스트/아티스트",
      "space": "작업부스",
      "pass": "예약권",
      "fee": "작업비",
      "lesson": "타투작업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "11:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '타투 스튜디오',
    description: '도안 상담, 예약 일정, 전자 면책 서약서, 작업 단계 파이프라인 관리',
    category: 'beauty',
    capabilities: ['booking', 'safety_consent', 'consultation_crm', 'task_pipeline'] as const,
    requiredCapabilities: ['booking', 'safety_consent'] as const,
    optionalCapabilities: ['consultation_crm', 'task_pipeline'] as const,
    businessRules: { ageVerificationRequired: true, waiverMandatory: true },
    resourceTypes: [{ name: '작업 부스 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '아티스트', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  photo_studio: {
    id: 'photo_studio',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "📷"
    },
    starterPassTemplates: [
        {
            "name": "프로필/증명사진 프리미엄 보정권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "자율 렌탈 스튜디오 2시간 대관권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 70000,
            "badge": "추천"
        },
        {
            "name": "정기 촬영 10시간 충전 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 300000
        }
    ],
    terms: {
      "customer": "고객/모델",
      "instructor": "포토그래퍼",
      "space": "스튜디오/호수",
      "pass": "촬영패키지권",
      "fee": "촬영료",
      "lesson": "촬영세션"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "19:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 20
    },

    name: '사진 스튜디오',
    description: '컨셉 촬영실 예약, 장비 대여, 보정/인화 작업 파이프라인 및 정산',
    category: 'beauty',
    capabilities: ['booking', 'rental_equipment', 'seat_room', 'task_pipeline', 'ledger_simple', 'deposit_escrow'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'task_pipeline'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'deposit_escrow'] as const,
    businessRules: { proofingPipelineSteps: 3 },
    resourceTypes: [
      { name: '호리존 스튜디오', type: 'room', capacity: 10 },
      { name: '조명/렌즈', type: 'equipment' },
    ],
    roles: [
      { name: '실장/작가', rank_order: 1, permissions: ['*'] },
      { name: '보정스태프', rank_order: 2, permissions: ['task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  pet_grooming: {
    id: 'pet_grooming',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🐾"
    },
    starterPassTemplates: [
        {
            "name": "소형견 위생목욕 5회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 90,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "스포팅+가위컷 디자인 미용권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 70000,
            "badge": "추천"
        },
        {
            "name": "스파+하이드로바스 3회 정기권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 60,
            "recommendedPrice": 90000
        }
    ],
    terms: {
      "customer": "보호자/반려견",
      "instructor": "그루머/미용사",
      "space": "미용부스/드라이룸",
      "pass": "미용회차권",
      "fee": "미용비",
      "lesson": "미용/스파"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "19:00",
      "slot_minutes": 60
    },

    name: '반려동물 미용실',
    description: '반려견 체중/견종별 예약, 미용 특이사항 차트, 스파 관리 및 간이 매출',
    category: 'beauty',
    capabilities: ['booking', 'consultation_crm', 'treatment_chart', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'ledger_simple'] as const,
    businessRules: { rabiesVaccinationCheck: true },
    resourceTypes: [
      { name: '미용 테이블', type: 'table', capacity: 1 },
      { name: '하이드로바스', type: 'equipment' },
    ],
    roles: [
      { name: '원장미용사', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 4: 공간·대여·숙박 (Space & Rental) - 6종
  // ==========================================
  study_cafe: {
    id: 'study_cafe',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "📚"
    },
    starterPassTemplates: [
        {
            "name": "당일 4시간 시간권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 1,
            "recommendedPrice": 6000
        },
        {
            "name": "100시간 충전 정액권",
            "passType": "COUNT_BASED",
            "totalCount": 100,
            "validityDays": 90,
            "recommendedPrice": 120000,
            "badge": "인기"
        },
        {
            "name": "4주 기간 자유석 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 28,
            "validityDays": 28,
            "recommendedPrice": 150000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "이용자/회원",
      "instructor": "매니저",
      "space": "좌석/스터디룸",
      "pass": "시간권/기간권",
      "fee": "이용료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30,
      "needsKiosk": true
    },

    name: '스터디카페 / 공간대여',
    description: '좌석 점유 타이머, 시간제 이용권, 사물함 및 일일 청소 점검 루틴 중심',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'locker', 'maintenance_checklist', 'lost_found', 'seat_timer_billing', 'kiosk_staff_call', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['seat_room', 'passes'] as const,
    optionalCapabilities: ['locker', 'maintenance_checklist', 'lost_found', 'seat_timer_billing', 'kiosk_staff_call', 'work_attendance_payroll'] as const,
    businessRules: { timePassAutoExpire: true },
    resourceTypes: [
      { name: '자유석 1~50', type: 'seat', capacity: 1 },
      { name: '스터디룸 A, B', type: 'room', capacity: 6 },
      { name: '사물함 1~60', type: 'locker' },
    ],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  shared_office: {
    id: 'shared_office',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🏢"
    },
    starterPassTemplates: [
        {
            "name": "오픈데스크 월 자유 이용권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 200000,
            "badge": "인기"
        },
        {
            "name": "1인 독립 오피스 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 1200000,
            "badge": "추천"
        },
        {
            "name": "회의실 20시간 크레딧 팩",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 60,
            "recommendedPrice": 250000
        }
    ],
    terms: {
      "customer": "입주사/멤버",
      "instructor": "커뮤니티매니저",
      "space": "핫데스크/미팅룸",
      "pass": "멤버십패스",
      "fee": "월이용료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '공유오피스',
    description: '지정석/독립실 배정, 월간 청구서, 회의실 예약, 전자결재 및 목표관리(MBO)',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'billing_invoicing', 'maintenance_checklist', 'booking', 'mbo', 'approval_workflow'] as const,
    requiredCapabilities: ['seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'passes', 'maintenance_checklist', 'mbo', 'approval_workflow'] as const,
    businessRules: { monthlyRentBillingDay: 1 },
    resourceTypes: [
      { name: '독립오피스 1~8', type: 'room', capacity: 4 },
      { name: '회의실', type: 'room', capacity: 10 },
      { name: '핫데스크', type: 'seat', capacity: 1 },
    ],
    roles: [{ name: '센터장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  space_rental: {
    id: 'space_rental',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🎉"
    },
    starterPassTemplates: [
        {
            "name": "파티룸 주간 4시간 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 80000,
            "badge": "인기"
        },
        {
            "name": "올나잇 패키지 (20:00~08:00)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 150000,
            "badge": "추천"
        },
        {
            "name": "정기 소모임 10시간 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 180000
        }
    ],
    terms: {
      "customer": "예약자/게스트",
      "instructor": "호스트",
      "space": "파티룸/홀",
      "pass": "대관권",
      "fee": "대관료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "09:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 30
    },

    name: '공간대여·대관업',
    description: '파티룸/스튜디오 시간 단위 대관, 보증금/시재 관리 및 퇴실 청소 점검',
    category: 'studio',
    capabilities: ['booking', 'seat_room', 'ledger_simple', 'maintenance_checklist', 'seat_timer_billing', 'deposit_escrow'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['ledger_simple', 'maintenance_checklist', 'seat_timer_billing', 'deposit_escrow'] as const,
    businessRules: { securityDepositRequired: true },
    resourceTypes: [{ name: '파티룸 루프탑', type: 'room', capacity: 15 }],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  locker_storage: {
    id: 'locker_storage',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "📦"
    },
    starterPassTemplates: [
        {
            "name": "S타입 미니 사물함 1개월 이용권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 20000
        },
        {
            "name": "M타입 개인 수납창고 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "골프백/대형 장비 전용 6개월 보관권",
            "passType": "PERIOD_BASED",
            "totalCount": 180,
            "validityDays": 180,
            "recommendedPrice": 250000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "이용자/회원",
      "instructor": "관리자",
      "space": "창고유닛/락커",
      "pass": "보관권",
      "fee": "월보관료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 60,
      "needsKiosk": true
    },

    name: '사물함·개인창고 대여업',
    description: '수납 락커/스토리지 유닛 배정, 정기 자동 청구 및 잠금장치 점검',
    category: 'studio',
    capabilities: ['locker', 'passes', 'billing_invoicing', 'maintenance_checklist'] as const,
    requiredCapabilities: ['locker', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'maintenance_checklist'] as const,
    businessRules: { lockerOverdueLockout: true },
    resourceTypes: [{ name: '개인창고 1~20', type: 'locker' }],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  guesthouse: {
    id: 'guesthouse',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🏡"
    },
    starterPassTemplates: [
        {
            "name": "도미토리 1박 숙박권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 30000,
            "badge": "인기"
        },
        {
            "name": "워케이션 7일 숙박 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 7,
            "validityDays": 30,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "전체 독채 주말 대관권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "게스트/투숙객",
      "instructor": "호스트",
      "space": "도미토리/객실",
      "pass": "숙박예약권",
      "fee": "숙박료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 60
    },

    name: '게스트하우스',
    description: '도미토리 베드/객실 예약, 일일 입실/퇴실, 시재 마감 및 침구 교체 점검',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['maintenance_checklist', 'ledger_simple'] as const,
    businessRules: { checkInHour: 15, checkOutHour: 11 },
    resourceTypes: [
      { name: '도미토리 베드 1~8', type: 'seat', capacity: 1 },
      { name: '2인 전용실', type: 'room', capacity: 2 },
    ],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  small_hotel: {
    id: 'small_hotel',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🏨"
    },
    starterPassTemplates: [
        {
            "name": "스탠다드룸 대실 4시간 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "인기"
        },
        {
            "name": "디럭스룸 1박 숙박권 (조식 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 80000,
            "badge": "추천"
        },
        {
            "name": "비즈니스 장기투숙 7박 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 7,
            "validityDays": 30,
            "recommendedPrice": 450000
        }
    ],
    terms: {
      "customer": "투숙객/고객",
      "instructor": "프런트매니저",
      "space": "객실",
      "pass": "숙박/대실권",
      "fee": "숙박비"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 30
    },

    name: '소형 호텔 / 부티크 호텔',
    description: '객실 타입별 숙박 예약, 프론트 교대 근무표, 하우스키핑 룸체크 및 현금 시재',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'shift_schedule', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'maintenance_checklist'] as const,
    optionalCapabilities: ['shift_schedule', 'ledger_simple'] as const,
    businessRules: { housekeepingInspectionRequired: true },
    resourceTypes: [
      { name: '스탠다드룸 201~210', type: 'room', capacity: 2 },
      { name: '디럭스룸 301~305', type: 'room', capacity: 3 },
    ],
    roles: [
      { name: '총지배인', rank_order: 1, permissions: ['*'] },
      { name: '프론트스태프', rank_order: 2, permissions: ['booking:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 5: 도소매·외식 (Retail & Food) - 6종
  // ==========================================
  retail: {
    id: 'retail',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🛍️"
    },
    starterPassTemplates: [
        {
            "name": "VIP 매장 포인트 10만 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 100000,
            "badge": "VIP"
        },
        {
            "name": "시즌 패스 멤버십 (전품목 10% 할인)",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 30000,
            "badge": "인기"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "매장직원",
      "space": "매대/카운터",
      "pass": "포인트카드",
      "fee": "판매금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '일반 소매점',
    description: '바코드 상품 카탈로그, 재고 수불, POS 판매 및 포인트 적립/사용',
    category: 'other',
    capabilities: ['inventory', 'credit_wallet', 'ledger_simple'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet'] as const,
    businessRules: { pointEarnPercent: 1.0, lowStockAlertThreshold: 5 },
    resourceTypes: [{ name: 'POS 카운터', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '캐셔', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'verified',
  },

  apparel_store: {
    id: 'apparel_store',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "👗"
    },
    starterPassTemplates: [
        {
            "name": "VIP 쇼핑 지원금 20만 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 200000,
            "badge": "VIP"
        },
        {
            "name": "퍼스널 스타일링 & 쇼핑 컨설팅 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "스타일리스트/직원",
      "space": "피팅룸/매대",
      "pass": "적립멤버십",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:30",
      "end_time": "21:30",
      "slot_minutes": 60
    },

    name: '의류매장',
    description: '사이즈/색상 옵션 재고, 피팅룸 관리, 멤버십 포인트 및 스태프 근무',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'shift_schedule'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'shift_schedule'] as const,
    businessRules: { sizeColorSkuSupport: true },
    resourceTypes: [{ name: '피팅룸 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'isolated',
  },

  convenience_store: {
    id: 'convenience_store',
    theme: {
        "accentColor": "emerald",
        "badgeEmoji": "🏪"
    },
    starterPassTemplates: [
        {
            "name": "모바일 편의점 5만원 금액권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 50000,
            "badge": "인기"
        },
        {
            "name": "원두커피 월 30잔 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님",
      "instructor": "스태프/점원",
      "space": "계산대",
      "pass": "스탬프쿠폰",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },

    name: '편의점',
    description: '식음료/생필품 고회전 재고, 3교대 알바 근무표, 일일 시재 마감 및 점검',
    category: 'other',
    capabilities: ['inventory', 'shift_schedule', 'ledger_simple', 'maintenance_checklist'] as const,
    requiredCapabilities: ['inventory', 'shift_schedule', 'ledger_simple'] as const,
    optionalCapabilities: ['maintenance_checklist'] as const,
    businessRules: { shiftHandoverCashCount: true },
    resourceTypes: [{ name: '포스기', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '근무자', rank_order: 2, permissions: ['shift_schedule:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'isolated',
  },

  pet_supplies: {
    id: 'pet_supplies',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🐶"
    },
    starterPassTemplates: [
        {
            "name": "사료/간식 10만 정기 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 100000,
            "badge": "인기"
        },
        {
            "name": "월간 맞춤 장난감&간식 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "반려인/고객",
      "instructor": "매장스태프",
      "space": "진열존",
      "pass": "회원포인트",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '반려동물용품점',
    description: '사료/간식 유통기한 재고, 반려동물 등록 상담, 포인트 적립 및 정산',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'consultation_crm'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'consultation_crm'] as const,
    businessRules: { expiryDateTracking: true },
    resourceTypes: [{ name: '매대', type: 'table' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  cafe: {
    id: 'cafe',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "☕"
    },
    starterPassTemplates: [
        {
            "name": "아메리카노 10잔 모바일 선불권 (1잔 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 11,
            "validityDays": 90,
            "recommendedPrice": 45000,
            "badge": "인기"
        },
        {
            "name": "월 평일 모닝커피 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 55000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님/단골",
      "instructor": "바리스타",
      "space": "테이블",
      "pass": "스탬프쿠폰",
      "fee": "음료결제"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },

    name: '카페 / 디저트전문점',
    description: '원두/부자재 재고, 테이블 홀 좌석, 바리스타 시프트 근무 및 선불 충전금',
    category: 'food',
    capabilities: ['inventory', 'seat_room', 'ledger_simple', 'shift_schedule', 'credit_wallet', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'equipment_lifecycle', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll', 'pickup_orders', 'loyalty_stamp'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['seat_room', 'credit_wallet', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'equipment_lifecycle', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll', 'pickup_orders', 'loyalty_stamp'] as const,

    businessRules: { prepaidCardDiscount: 5 },
    resourceTypes: [
      { name: '에스프레소 머신', type: 'equipment' },
      { name: '홀 테이블 1~8', type: 'table', capacity: 4 },
    ],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '바리스타', rank_order: 2, permissions: ['shift_schedule:view', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  restaurant: {
    id: 'restaurant',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🍽️"
    },
    starterPassTemplates: [
        {
            "name": "점심 런치특선 10회 식권 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 95000,
            "badge": "인기"
        },
        {
            "name": "VIP 디너 코스 2인 식사권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 140000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님",
      "instructor": "서버/홀직원",
      "space": "식탁/테이블",
      "pass": "식사권",
      "fee": "음식값"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "11:00",
      "end_time": "21:30",
      "slot_minutes": 60
    },

    name: '소형 음식점 / 식당',
    description: '테이블 좌석 예약, 식자재 식별 재고, 주방/홀 근무 교대 및 일일 결산',
    category: 'food',
    capabilities: ['booking', 'seat_room', 'inventory', 'ledger_simple', 'shift_schedule', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['seat_room', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['booking', 'inventory', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    businessRules: { reservationDepositPolicy: false },
    resourceTypes: [{ name: '식탁 테이블 1~10', type: 'table', capacity: 4 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['booking:view', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 6: 생활서비스·정비·특수 (Service & Automotive) - 4종
  // ==========================================
  auto_repair: {
    id: 'auto_repair',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🔧"
    },
    starterPassTemplates: [
        {
            "name": "엔진오일 + 정밀 점검 3회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 365,
            "recommendedPrice": 210000,
            "badge": "추천"
        },
        {
            "name": "에어컨 필터 + 브레이크 점검권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "타이어 로테이션 & 얼라인먼트 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 80000
        }
    ],
    terms: {
      "customer": "고객/차주",
      "instructor": "엔지니어/정비사",
      "space": "정비베이",
      "pass": "정기점검권",
      "fee": "공임비/정비료",
      "lesson": "정비작업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:30",
      "end_time": "18:30",
      "slot_minutes": 60
    },

    name: '자동차 정비소',
    description: '정비 리프트 배정, 부품 재고, 작업지시서 파이프라인, 차량 수리 이력 및 청구',
    category: 'automotive',
    capabilities: ['task_pipeline', 'inventory', 'billing_invoicing', 'consultation_crm', 'booking', 'commission_payroll', 'work_order_kanban', 'equipment_lifecycle', 'sop_risk_assessment', 'vendor_ap_invoice', 'quality_inspection', 'change_management'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking', 'commission_payroll', 'work_order_kanban', 'equipment_lifecycle', 'sop_risk_assessment', 'vendor_ap_invoice', 'quality_inspection', 'change_management'] as const,
    businessRules: { vinRequired: true, workOrderStages: 4 },
    resourceTypes: [
      { name: '리프트 베이 1~3', type: 'bay', capacity: 1 },
      { name: '진단기', type: 'equipment' },
    ],
    roles: [
      { name: '대표/공장장', rank_order: 1, permissions: ['*'] },
      { name: '정비기사', rank_order: 2, permissions: ['task_pipeline:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  cleaning_service: {
    id: 'cleaning_service',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "✨"
    },
    starterPassTemplates: [
        {
            "name": "정기 오피스/매장 청소 월 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 280000,
            "badge": "인기"
        },
        {
            "name": "에어컨/세탁기 분해 살균 세척권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 120000,
            "badge": "추천"
        },
        {
            "name": "입주/이사 대청소 1회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "고객/의뢰인",
      "instructor": "방문클리너/매니저",
      "space": "서비스현장",
      "pass": "정기청소권",
      "fee": "용역비",
      "lesson": "홈클리닝"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },

    name: '청소·방문 서비스 업체',
    description: '클리너 출장 배정 근무표, 현장 작업 체크리스트, 완료 확인서 및 청구서 발행',
    category: 'property',
    capabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing', 'consultation_crm', 'booking'] as const,
    requiredCapabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking'] as const,
    businessRules: { dispatchAddressRequired: true },
    resourceTypes: [{ name: '서비스 차량', type: 'vehicle' }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '현장팀장', rank_order: 2, permissions: ['task_pipeline:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  pet_hotel: {
    id: 'pet_hotel',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🏨"
    },
    starterPassTemplates: [
        {
            "name": "소형견 디럭스룸 1박 숙박권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 40000,
            "badge": "인기"
        },
        {
            "name": "정기 유치원 놀이방 10회 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 250000,
            "badge": "추천"
        },
        {
            "name": "주말 2박3일 힐링 호텔링 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 90000
        }
    ],
    terms: {
      "customer": "보호자/반려동물",
      "instructor": "케어매니저/훈련사",
      "space": "호텔룸/플레이존",
      "pass": "숙박권/등원권",
      "fee": "돌봄료",
      "lesson": "유치원수업"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '반려동물 호텔·유치원',
    description: '호텔룸/유치원 좌석 점유, 등원 출결 체크, 알림장 상담 일지 및 시설 위생 점검',
    category: 'pet',
    capabilities: ['seat_room', 'attendance', 'passes', 'consultation_crm', 'maintenance_checklist'] as const,
    requiredCapabilities: ['seat_room', 'attendance', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'maintenance_checklist'] as const,
    businessRules: { emergencyContactMandatory: true },
    resourceTypes: [
      { name: '호텔룸 1~10', type: 'room', capacity: 1 },
      { name: '놀이방', type: 'court', capacity: 15 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '케어강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  equipment_rental: {
    id: 'equipment_rental',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🚜"
    },
    starterPassTemplates: [
        {
            "name": "전동 공구/촬영 장비 1일 렌탈권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000
        },
        {
            "name": "장비 10일 정액 충전 패스",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 400000,
            "badge": "인기"
        },
        {
            "name": "월간 전속 렌탈 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 900000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "대여자/고객",
      "instructor": "장비관리자",
      "space": "장비보관소",
      "pass": "렌탈이용권",
      "fee": "대여료"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },

    name: '장비·렌탈업',
    description: '건설/촬영/파티 장비 대여, 장비 일련번호 재고, 대여료 청구 및 안전 서약',
    category: 'studio',
    capabilities: ['rental_equipment', 'inventory', 'passes', 'billing_invoicing', 'safety_consent'] as const,
    requiredCapabilities: ['rental_equipment', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'safety_consent'] as const,
    businessRules: { returnInspectionMandatory: true, lateFeeDailyRate: true },
    resourceTypes: [
      { name: '대여 장비 창고', type: 'room' },
      { name: '렌탈 기기 목록', type: 'equipment' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '출고관리원', rank_order: 2, permissions: ['rental_equipment:*', 'inventory:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // 추가 2종 (레거시 호환 및 기타 특수 프리셋)
  // ==========================================
  craft_repair: {
    id: 'craft_repair',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🔨"
    },
    starterPassTemplates: [
        {
            "name": "명품 신발/가방 케어&수선 기본권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "시계 배터리 교체 및 방수 점검 3회권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 180,
            "recommendedPrice": 45000
        },
        {
            "name": "가죽 영양 코팅 복원 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 120000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "수강생/의뢰인",
      "instructor": "공방장/마스터",
      "space": "작업대/물레",
      "pass": "공방이용권",
      "fee": "수강료/공임",
      "lesson": "공방클래스"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '맞춤 제작 공방 & 수리점',
    description: '단계별 제작/수리 칸반 파이프라인, 원자재 재고 관리 및 픽업 예약',
    category: 'studio',
    capabilities: ['task_pipeline', 'inventory', 'booking', 'ledger_simple', 'sop_risk_assessment', 'pickup_orders', 'quality_inspection', 'change_management'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory'] as const,
    optionalCapabilities: ['booking', 'ledger_simple', 'sop_risk_assessment', 'pickup_orders', 'quality_inspection', 'change_management'] as const,
    resourceTypes: [{ name: '작업대', type: 'table' }],
    roles: [{ name: '공방장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  self_carwash: {
    id: 'self_carwash',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🚗"
    },
    starterPassTemplates: [
        {
            "name": "셀프 세차 IC카드 5만 충전권 (1만 보너스)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 50000,
            "badge": "인기"
        },
        {
            "name": "개인 베이 2시간 무제한 정액권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "추천"
        },
        {
            "name": "월 무제한 폼건&고압수 야간 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 89000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "스태프/관리인",
      "space": "세차베이/드라잉존",
      "pass": "세차충전권",
      "fee": "세차비"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },

    name: '셀프 세차장 & 코인샵',
    description: 'RF카드 선불 충전금/보너스, 시설 기물 루틴 점검 및 세차 소모품 재고 관리',
    category: 'automotive',
    capabilities: ['credit_wallet', 'maintenance_checklist', 'inventory', 'loyalty_stamp'] as const,
    requiredCapabilities: ['credit_wallet', 'maintenance_checklist'] as const,
    optionalCapabilities: ['inventory', 'loyalty_stamp'] as const,
    resourceTypes: [{ name: '세차 베이 1~6', type: 'bay' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },


  daycare: {
    id: 'daycare',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "👶"
    },
    starterPassTemplates: [
        {
            "name": "월 정규 안심 보육 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "정규"
        },
        {
            "name": "시간제 긴급 돌봄 10시간 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 50000,
            "badge": "인기"
        }
    ],
    terms: {
      "customer": "원아/학부모",
      "instructor": "담임교사",
      "space": "보육실(반)",
      "pass": "입학/원서",
      "fee": "보육료",
      "lesson": "일일활동"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "07:30",
      "end_time": "19:30",
      "slot_minutes": 60
    },

    name: '어린이집·유치원',
    description: '원아 등하원 출결, 보육료 결제, 학부모 상담 및 안전 동의서 관리',
    category: 'childcare',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'safety_consent', 'vehicle_shuttle', 'hygiene_haccp_log'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'safety_consent', 'vehicle_shuttle', 'hygiene_haccp_log'] as const,
    resourceTypes: [{ name: '보육실 (반)', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '보육교사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'persisted',
  },

  sauna_jjimjilbang: {
    id: 'sauna_jjimjilbang',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "♨️"
    },
    starterPassTemplates: [
        {
            "name": "사우나 10회 정기 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 90000,
            "badge": "인기"
        },
        {
            "name": "사우나+찜질방 1개월 정기 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "추천"
        },
        {
            "name": "세신(때밀이) + 사우나 패키지권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "카운터/스태프",
      "space": "사물함",
      "pass": "입장권/정기권",
      "fee": "입장료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "05:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '사우나·찜질방',
    description: '남녀 락커 배정, 이용권/회원권, 선불 크레딧 및 시설 점검 루틴 관리',
    category: 'wellness',
    capabilities: ['locker', 'passes', 'maintenance_checklist', 'credit_wallet', 'lost_found'] as const,
    requiredCapabilities: ['locker', 'passes'] as const,
    optionalCapabilities: ['maintenance_checklist', 'credit_wallet', 'lost_found'] as const,
    resourceTypes: [{ name: '사물함/락커', type: 'locker', capacity: 100 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '주간 카운터', rank_order: 2, permissions: ['passes:*', 'lockers:*'] },
      { name: '야간 카운터', rank_order: 3, permissions: ['passes:deduct', 'lockers:assign'] },
    ],
    readinessLevel: 'persisted',
  },

  // ==========================================
  // Group 7: 기업·제조·유통 엔터프라이즈 (Enterprise Suites) - 3종
  // ==========================================
  general_enterprise: {
    id: 'general_enterprise',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🏢"
    },
    starterPassTemplates: [
        {
            "name": "사내 공용 회의실 월 40시간 패스",
            "passType": "COUNT_BASED",
            "totalCount": 40,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "사내"
        },
        {
            "name": "업무용 법인 차량 10회 배차권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "고객사/임직원",
      "instructor": "담당자/팀원",
      "space": "회의실/집무실",
      "pass": "사원패스",
      "fee": "청구금액"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '일반 기업 / 경영관리',
    description: '전사 다단계 전자결재, 부서별 업무 칸반 파이프라인, MBO 성과관리, 사규 및 피드백 중심',
    category: 'other',
    capabilities: [
      'approval_workflow',
      'task_pipeline',
      'workplace_policy',
      'mbo',
      'feedbacks',
      'billing_invoicing',
      'seat_room',
      'leave_management',
      'supply_restock',
    ] as const,
    requiredCapabilities: ['approval_workflow', 'task_pipeline'] as const,
    optionalCapabilities: [
      'workplace_policy',
      'mbo',
      'feedbacks',
      'billing_invoicing',
      'seat_room',
      'leave_management',
      'supply_restock',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    roles: [
      { name: '대표이사/임원', rank_order: 1, permissions: ['*'] },
      { name: '팀장/관리자', rank_order: 2, permissions: ['approval_workflow:*', 'task_pipeline:*', 'mbo:*'] },
      { name: '팀원', rank_order: 3, permissions: ['task_pipeline:*', 'mbo:view', 'workplace_policy:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  personal_plant_ops: {
    id: 'personal_plant_ops',
    theme: {
        "accentColor": "emerald",
        "badgeEmoji": "🏭"
    },
    starterPassTemplates: [
        {
            "name": "현장 안전교육 이수 패스",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 365,
            "recommendedPrice": 0,
            "badge": "사내"
        },
        {
            "name": "공용 장비 사용 허가권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 0,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "운영자",
      "instructor": "작업자",
      "space": "운영베이",
      "pass": "작업티켓",
      "fee": "비용"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      hasDepartments: true,
    },

    name: 'EP_apps',
    hiddenInMoa: true,
    description:
      '소규모 현장용: 결재·안전·자재·공용자원·노경 건의·조직도·MBO·연구과제·연구소 포털. 급여·휴가·전사 장부는 포함하지 않습니다.',
    category: 'manufacturing',
    capabilities: [
      'approval_workflow',
      'sop_risk_assessment',
      'facility_incident_report',
      'safety_consent',
      'maintenance_checklist',
      'inventory',
      'recipe_bom',
      'supply_restock',
      'booking',
      'seat_room',
      'rental_equipment',
      'whistleblower_grievance',
      'task_pipeline',
      'mbo',
      'research_project',
      'patent_ip_asset',
      'equipment_lifecycle',
      'volunteer_activity',
      'meal_survey',
      'office_supply_request',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    requiredCapabilities: [
      'approval_workflow',
      'inventory',
      'booking',
      'whistleblower_grievance',
      'mbo',
      'research_project',
      'sop_risk_assessment',
      'facility_incident_report',
      'supply_restock',
    ] as const,
    optionalCapabilities: [
      'safety_consent',
      'maintenance_checklist',
      'recipe_bom',
      'rental_equipment',
      'seat_room',
      'task_pipeline',
      'patent_ip_asset',
      'equipment_lifecycle',
      'volunteer_activity',
      'meal_survey',
      'office_supply_request',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    roles: [
      {
        name: '대표이사 / 공장장',
        rank_order: 100,
        permissions: ['*'],
        description: '전사 총괄 및 최종 결재 권한',
      },
      {
        name: '본부장 / 실장',
        rank_order: 200,
        permissions: ['approval_workflow:*', 'mbo:*', 'task_pipeline:*', 'research_project:*', 'resources:*'],
        description: '본부/실 단위 총괄 관리자 (하위 그룹/팀 전체 통할)',
      },
      {
        name: '그룹장 / 센터장',
        rank_order: 300,
        permissions: ['approval_workflow:*', 'mbo:*', 'task_pipeline:*', 'research_project:update'],
        description: '중간 조직 관리자 (관할 팀 및 파트 통할)',
      },
      {
        name: '팀장 / 리더',
        rank_order: 400,
        permissions: ['approval_workflow:submit', 'approval_workflow:view', 'mbo:update', 'task_pipeline:*'],
        description: '부서/팀 관리자 (팀원 MBO 열람 및 부서 업무 관리)',
      },
      {
        name: '파트장 / 셀리더',
        rank_order: 500,
        permissions: ['task_pipeline:update', 'mbo:view', 'approval_workflow:submit'],
        description: '소규모 세부 파트 리더',
      },
      {
        name: '팀원 / 사원',
        rank_order: 900,
        permissions: ['booking:book', 'whistleblower_grievance:create', 'mbo:view', 'research_project:view'],
        description: '일반 실무자 (직무 기능 권한은 개인별로 부여)',
      },
    ],
    resourceTypes: [
      { name: '1호 업무용 차량', type: 'vehicle', capacity: 1 },
      { name: '회의실', type: 'room', capacity: 8 },
      { name: '시험·계측 장비', type: 'equipment', capacity: 1 },
    ],
    defaultSettings: {
      fleet_catalog_kind: 'vehicle',
      grievances_named_default: true,
      org_chart_enabled: true,
      resource_types_require_approval_default: true,
      hidden_capabilities: [
        'recipe_bom',
        'rental_equipment',
        'safety_consent',
      ],
    },
    businessRules: {
      exclude_payroll: true,
      incident_capa_linkage: true,
    },
    readinessLevel: 'isolated',
  },

  manufacturing_light: {
    id: 'manufacturing_light',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🏭"
    },
    starterPassTemplates: [
        {
            "name": "안전보건 정기 교육 4회 이수권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 90,
            "recommendedPrice": 0,
            "badge": "사내"
        },
        {
            "name": "생산라인 공구 세트 불출 패스",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "발주처/고객사",
      "instructor": "작업자/반장",
      "space": "가공/조립라인",
      "pass": "작업지시서",
      "fee": "납품단가"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:00",
      "end_time": "17:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '제조·가공업 (공정/BOM/품질 관리)',
    description: '생산 공정 파이프라인, 부품표(BOM), 원자재 재고, 설비 점검 및 현장 안전 관리',
    category: 'manufacturing',
    capabilities: [
      'task_pipeline',
      'recipe_bom',
      'inventory',
      'quality_inspection',
      'maintenance_checklist',
      'sop_risk_assessment',
      'facility_incident_report',
      'shift_schedule',
      'workplace_policy',
      'feedbacks',
      'supply_restock',
      'change_management',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'shuttle_dispatch',
      'seat_room',
    ] as const,
    requiredCapabilities: ['task_pipeline', 'recipe_bom', 'inventory'] as const,
    optionalCapabilities: [
      'quality_inspection',
      'maintenance_checklist',
      'sop_risk_assessment',
      'facility_incident_report',
      'shift_schedule',
      'workplace_policy',
      'feedbacks',
      'supply_restock',
      'change_management',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'shuttle_dispatch',
      'seat_room',
    ] as const,
    roles: [
      { name: '공장장/관리자', rank_order: 1, permissions: ['*'], description: '공장 총괄 및 최종 승인권자' },
      { name: '생산반장', rank_order: 2, permissions: ['task_pipeline:*', 'recipe_bom:*', 'inventory:*', 'quality_inspection:*', 'maintenance_checklist:*'], description: '공정 및 자재/설비 관리자' },
      { name: '현장작업자', rank_order: 3, permissions: ['task_pipeline:view', 'task_pipeline:update', 'sop_risk_assessment:view', 'maintenance_checklist:submit', 'feedbacks:create'], description: '작업 수행 및 일상 점검' },
    ],
    resourceTypes: [
      { name: '1호 가공 라인', type: 'line', capacity: 10 },
      { name: '2호 조립 라인', type: 'line', capacity: 10 },
      { name: '검사실/완제품실', type: 'room', capacity: 5 },
    ],
    defaultSettings: {
      shift_system: '2_shift',
      daily_safety_briefing: true,
      lot_tracking_mandatory: true,
    },
    businessRules: {
      bom_auto_deduct: true,
      inspection_required_before_shipment: true,
      incident_capa_linkage: true,
    },
    readinessLevel: 'basic_ui',
  },

  procurement_distribution: {
    id: 'procurement_distribution',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🚚"
    },
    starterPassTemplates: [
        {
            "name": "물류 입출고 독(Dock) 1일 배정권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "물류"
        },
        {
            "name": "파렛트 적치 월간 정기 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "매입/매출처",
      "instructor": "물류/영업담당",
      "space": "물류창고",
      "pass": "납품전표",
      "fee": "정산금액"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:30",
      "end_time": "17:30",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '도소매 / 자재 유통업',
    description: '구매 요청(PR) 및 최적 견적 비교, FEFO 로트별 창고 재고, 외상매입금(AP) 및 전자결재',
    category: 'other',
    capabilities: ['supply_restock', 'inventory', 'approval_workflow', 'billing_invoicing', 'vendor_ap_invoice', 'credit_wallet'] as const,
    requiredCapabilities: ['supply_restock', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['approval_workflow', 'vendor_ap_invoice', 'credit_wallet'] as const,
    roles: [
      { name: '유통총괄', rank_order: 1, permissions: ['*'] },
      { name: '물류/자재담당', rank_order: 2, permissions: ['inventory:*', 'supply_restock:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  iso_ims_enterprise: {
    id: 'iso_ims_enterprise',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🛡️"
    },
    starterPassTemplates: [
        {
            "name": "통합 경영시스템 위험성평가 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 0
        },
        {
            "name": "환경/안전 내부심사 점검권 (5회)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 180,
            "recommendedPrice": 0,
            "badge": "사내"
        }
    ],
    terms: {
      "customer": "이해관계자/심사원",
      "instructor": "품질/안전담당자",
      "space": "회의실/현장",
      "pass": "승인문서",
      "fee": "심사비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: 'ISO 통합경영시스템 (QEHS)',
    description: 'ISO 9001(품질), ISO 14001(환경), ISO 45001(안전보건) 3대 통합경영시스템 (품질검사, 위험성평가, 환경측면, 사고/CAPA, 전자결재)',
    category: 'other',
    capabilities: [
      'quality_inspection',
      'sop_risk_assessment',
      'facility_incident_report',
      'change_management',
      'approval_workflow',
      'maintenance_checklist',
      'workplace_policy',
      'mbo',
      'inventory',
      'seat_room',
      'leave_management',
    ] as const,
    requiredCapabilities: [
      'quality_inspection',
      'sop_risk_assessment',
      'facility_incident_report',
      'approval_workflow',
    ] as const,
    optionalCapabilities: [
      'change_management',
      'maintenance_checklist',
      'workplace_policy',
      'mbo',
      'inventory',
      'seat_room',
      'leave_management',
    ] as const,
    roles: [
      { name: 'QEHS 최고경영자/총괄책임', rank_order: 1, permissions: ['*'] },
      { name: '내부심사원/품질안전관리자', rank_order: 2, permissions: ['quality_inspection:*', 'sop_risk_assessment:*', 'facility_incident_report:*', 'approval_workflow:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  iso_human_capital: {
    id: 'iso_human_capital',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "📋"
    },
    starterPassTemplates: [
        {
            "name": "ISO 30414 감사 대비 역량 평가 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 0
        },
        {
            "name": "임직원 필수 직무 트레이닝 4과정",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 60,
            "recommendedPrice": 0,
            "badge": "사내"
        }
    ],
    terms: {
      "customer": "임직원",
      "instructor": "인사/HR담당자",
      "space": "세미나실/회의실",
      "pass": "교육이수증",
      "fee": "인건비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: 'ISO 인적자본 경영 (HR & MBO)',
    description: 'ISO 30414 인적자본 보고 지표, MBO 성과관리, 직무 역량 및 법정 자격증, 교육훈련 유효성 평가, 직무 스트레스 및 익명 고충처리',
    category: 'other',
    capabilities: [
      'mbo',
      'shift_schedule',
      'work_attendance_payroll',
      'workplace_policy',
      'feedbacks',
      'approval_workflow',
      'leave_management',
    ] as const,
    requiredCapabilities: [
      'mbo',
      'work_attendance_payroll',
      'workplace_policy',
    ] as const,
    optionalCapabilities: [
      'shift_schedule',
      'feedbacks',
      'approval_workflow',
      'leave_management',
    ] as const,
    roles: [
      { name: '대표이사/총괄임원', rank_order: 1, permissions: ['*'] },
      { name: '인사팀장/HRD', rank_order: 2, permissions: ['mbo:*', 'work_attendance_payroll:*', 'workplace_policy:*', 'feedbacks:*', 'approval_workflow:*'] },
      { name: '부서장/팀장', rank_order: 2, permissions: ['mbo:update', 'shift_schedule:*', 'feedbacks:view', 'approval_workflow:submit'] },
      { name: '사원/팀원', rank_order: 3, permissions: ['mbo:view', 'workplace_policy:view', 'feedbacks:create', 'work_attendance_payroll:view'] },
    ],
    resourceTypes: [
      { name: '본사 대회의실', type: 'room', capacity: 20 },
      { name: 'HR 상담실', type: 'room', capacity: 4 },
      { name: '교육 세미나실', type: 'room', capacity: 30 },
    ],
    defaultSettings: {
      evaluation_cycle: 'quarterly',
      grievance_anonymous_allowed: true,
      competence_expiry_alert_days: 30,
    },
    businessRules: {
      mbo_peer_review_enabled: true,
      training_effectiveness_threshold: 70,
      nda_mandatory_before_work: true,
    },
    readinessLevel: 'basic_ui',
  },

  rnd_lab_management: {
    id: 'rnd_lab_management',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🔬"
    },
    starterPassTemplates: [
        {
            "name": "정밀 분석 장비 20시간 예약권",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 60,
            "recommendedPrice": 0,
            "badge": "연구"
        },
        {
            "name": "클린룸 출입 및 시약 불출 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "연구원/과제담당자",
      "instructor": "책임연구원/관리자",
      "space": "실험실/분석기기실",
      "pass": "연구과제/승인",
      "fee": "연구비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '연구소 & 랩실 관리 (기업 R&D / 대학 연구실)',
    description: '연구 프로젝트 및 학술 논문/특허 파이프라인, 연구 장비 예약 및 자동 사용일지, 특허/직무발명 보상 관리, 연구 설비 자산/수리 이력, 연구실안전법 일일점검 및 시약 MSDS 관리',
    category: 'other',
    capabilities: [
      'task_pipeline',
      'seat_room',
      'research_project',
      'patent_ip_asset',
      'equipment_lifecycle',
      'facility_incident_report',
      'sop_risk_assessment',
      'supply_restock',
      'mbo',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'hazardous_substance_msds',
      'electronic_lab_notebook',
    ] as const,
    requiredCapabilities: [
      'task_pipeline',
      'seat_room',
      'research_project',
      'patent_ip_asset',
      'sop_risk_assessment',
    ] as const,
    optionalCapabilities: [
      'equipment_lifecycle',
      'facility_incident_report',
      'supply_restock',
      'mbo',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'hazardous_substance_msds',
      'electronic_lab_notebook',
    ] as const,
    roles: [
      { name: '연구책임자(PI) / 연구소장', rank_order: 1, permissions: ['*'] },
      { name: '부책임자 / 랩장 / 박사후연구원', rank_order: 2, permissions: ['research_project:*', 'task_pipeline:*', 'resources:*', 'patent_ip_asset:*', 'equipment_lifecycle:*', 'mbo:*'] },
      { name: '참여연구원 / 석·박사과정생', rank_order: 3, permissions: ['research_project:update', 'task_pipeline:update', 'resources:book', 'patent_ip_asset:submit', 'sop_risk_assessment:view'] },
      { name: '학부연구생 / 연구보조원', rank_order: 4, permissions: ['resources:book', 'task_pipeline:view', 'sop_risk_assessment:view'] },
      { name: '연구실 안전관리담당자', rank_order: 2, permissions: ['sop_risk_assessment:*', 'supply_restock:*', 'facility_incident_report:*', 'approval_workflow:*', 'research_project:view'] },
    ],
    resourceTypes: [
      { name: '정밀분석기기 (FE-SEM / XRD / NMR)', type: 'equipment', capacity: 1 },
      { name: '공용 분석대 (클린벤치 / 흄후드)', type: 'equipment', capacity: 2 },
      { name: '제1실험실 (합성·배양실)', type: 'room', capacity: 8 },
      { name: '랩 세미나실 / 프로젝트 미팅룸', type: 'room', capacity: 12 },
    ],
    defaultSettings: {
      lab_safety_inspection_cycle: 'daily',
      patent_share_sum_mandatory: true,
      equipment_logbook_auto_generate: true,
      statutory_safety_training_hours: 6,
    },
    businessRules: {
      require_fume_hood_daily_check: true,
      auto_generate_logbook_on_reservation: true,
      invention_review_grade_mandatory: true,
    },
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 7: 생활·커뮤니티 (Community) - 1종
  // ==========================================
  baby_food_coop: {
    id: 'baby_food_coop',
    name: '이유식 품앗이 / 공동육아',
    description: '월령별 맞춤 추천 및 알레르기 관리, 1/N 재료비 자동 정산 커뮤니티',
    category: 'COMMUNITY',
    theme: {
      accentColor: 'indigo',
      badgeEmoji: '🍼',
    },
    starterPassTemplates: [
      {
        name: '이유식 품앗이 4회 정기 분담권',
        passType: 'COUNT_BASED',
        totalCount: 4,
        validityDays: 30,
        recommendedPrice: 30000,
        badge: '정기',
      },
    ],
    terms: {
      customer: '참여 가족 (아기)',
      instructor: '모임장 (이번 달 방장)',
      space: '모임 거점 (주방/공간)',
      pass: '큐브 교환권 (품앗이 티켓)',
      fee: '재료비 1/N 정산',
      lesson: '공동 당번 (요리 조)',
      tenant: '우리 품앗이 모임',
      owner: '모임장 (이번 달 방장)',
      staff: '공동 당번 (요리 조)',
      billing: '재료비 1/N 정산',
    },
    operatingHours: {
      day_type: 'WEEKDAYS',
      start_time: '10:00',
      end_time: '17:00',
      slot_minutes: 60,
    },
    facilities: {
      hasDepartments: false,
    },
    capabilities: [
      'baby_food_coop',
      'consultation_crm',
      'feedbacks',
      'daily_care_report',
      'billing_invoicing',
      'booking',
      'rental_equipment',
    ] as const,
    requiredCapabilities: [
      'baby_food_coop',
      'consultation_crm',
      'billing_invoicing',
    ] as const,
    optionalCapabilities: [
      'feedbacks',
      'daily_care_report',
      'booking',
      'rental_equipment',
    ] as const,
    roles: [
      { name: '모임장 (총무)', rank_order: 1, permissions: ['*'] },
      { name: '공동 참여맘/보호자', rank_order: 2, permissions: ['baby_food_coop:*', 'billing_invoicing:view', 'consultation_crm:view'] },
    ],
    resourceTypes: [
      { name: '품앗이 공유 조리대', type: 'room', capacity: 6 },
      { name: '이유식 마스터기/소독기', type: 'equipment', capacity: 2 },
    ],
    defaultSettings: {
      defaultMeetingCycle: '주 1회 (화요일)',
      settlementRule: '1/N 원단위 절사 분담 (잔여금 모임 적립)',
      allergyCheckMandatory: true,
    },
    businessRules: {
      auto_calculate_per_person: true,
      require_allergy_acknowledgement: true,
    },
    readinessLevel: 'basic_ui',
  },
};

export const PRESET_ALIASES: Record<string, string> = {
  corporate_general_affairs: 'general_enterprise',
  general_affairs: 'general_enterprise',
  rnd_lab: 'rnd_lab_management',
  rnd: 'rnd_lab_management',
  personal_plant: 'personal_plant_ops',
  plant_ops: 'personal_plant_ops',
  ep_apps: 'personal_plant_ops',
  EP_apps: 'personal_plant_ops',
  gym: 'gym_fitness',
  academy: 'general_academy',
  private_tutoring: 'exam_tutoring',
  personal_training: 'pt_fitness',
  golf_lesson: 'indoor_golf',
  climbing_gym: 'climbing_activity',
  hotel_pension: 'guesthouse',
  craft_workshop: 'craft_repair',
  car_wash: 'self_carwash',
  sauna: 'sauna_jjimjilbang',
  sauna_jjimjbang: 'sauna_jjimjilbang',
  preschool: 'daycare',
  kindergarten: 'daycare',
};

export function getIndustryPreset(presetId: string): IndustryPresetDefinition | undefined {
  if (!presetId) return undefined;
  const direct = INDUSTRY_PRESETS[presetId];
  if (direct) return direct;
  const aliasedKey = PRESET_ALIASES[presetId];
  if (aliasedKey) return INDUSTRY_PRESETS[aliasedKey];
  return undefined;
}

export function listIndustryPresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS);
}

/**
 * moa 앱(일반 매장·사업장 온보딩 및 카탈로그)에서 표시 및 선택 가능한 프리셋 목록 조회.
 * hiddenInMoa 플래그가 설정된 프리셋(예: 기업 전용 EP_apps 등)은 제외됩니다.
 */
export function listMoaVisiblePresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS).filter((p) => !p.hiddenInMoa);
}

/**
 * 특정 프리셋이 moa 앱에서 노출 및 선택 가능한지 여부 판정
 */
export function isPresetVisibleInMoa(presetId: string): boolean {
  const preset = getIndustryPreset(presetId);
  if (!preset) return false;
  return !preset.hiddenInMoa;
}

/**
 * 런타임에 동적으로 신규 Capability 번들을 등록하는 확장 함수.
 * 향후 신규 Capability 추가 시 presetRegistry 파일을 직접 대규모 수정하지 않고도 동적 주입 가능.
 */
export function registerCapabilityBundle(bundle: CapabilityModuleBundle): void {
  (CAPABILITY_BUNDLES as Record<string, CapabilityModuleBundle>)[bundle.capabilityId] = bundle;
}

/**
 * 런타임에 동적으로 신규 업종 프리셋 정의를 등록하는 확장 함수.
 */
export function registerIndustryPreset(preset: IndustryPresetDefinition): void {
  INDUSTRY_PRESETS[preset.id] = preset;
}

