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

export {
  CAPABILITY_IDS,
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
];


