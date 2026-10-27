import { defineCapability } from '../_shared/capabilityTypes';

export const makeup_lesson_passCapability = defineCapability({
  id: 'makeup_lesson_pass',
  displayName: '결석 보강 티켓 & 보강 슬롯 매칭 엔진',
  dependencies: ['roster', 'scheduling'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['schedule.manage', 'roster.view'],
});

export const makeupLessonPassManifest = makeup_lesson_passCapability;
