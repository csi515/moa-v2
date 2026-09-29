/**
 * metadata 의존 축소. 파일럿: core.schedules dual-read.
 */
import { dualReadPreferred, dualReadText, promotedFieldInvariant } from './dualRead';
import {
  schedulePromotedWrite,
  scheduleRoom,
  scheduleRoomId,
  scheduleSessionPassId,
  scheduleStaffId,
} from './scheduleFields';
import { SCHEDULE_METADATA_PROMOTION } from './types';

export const metadataCapability = {
  pilot: SCHEDULE_METADATA_PROMOTION,
  dualReadText,
  dualReadPreferred,
  promotedFieldInvariant,
  scheduleStaffId,
  scheduleSessionPassId,
  scheduleRoom,
  scheduleRoomId,
  scheduleWrite: schedulePromotedWrite,
} as const;

export type MetadataCapability = typeof metadataCapability;
