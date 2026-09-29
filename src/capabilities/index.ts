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
];
