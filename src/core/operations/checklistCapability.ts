/**
 * 업종 무관 Checklist Capability.
 * 객실/시설 객체를 여기서 만들지 않는다.
 */
import { operationsService } from './operationsService';
import { normalizeChecklistItems, sortChecklistItems } from './transitions';
import { CHECKLIST_PURPOSES } from './types';

export const checklistCapability = {
  purposes: CHECKLIST_PURPOSES,
  list: operationsService.listTemplates,
  upsert: operationsService.upsertTemplate,
  deactivate: operationsService.deactivateTemplate,
  normalizeItems: normalizeChecklistItems,
  sortItems: sortChecklistItems,
} as const;

export type ChecklistCapability = typeof checklistCapability;
