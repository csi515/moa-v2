import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOperatingHours,
  validateStudentDraft,
  validatePlacementDraft,
  generateAvailableLessonTimeSlots,
  DEFAULT_OPERATING_HOURS,
  DEFAULT_STUDENT_DRAFT,
  DEFAULT_PLACEMENT_DRAFT,
} from './directorOnboardingHelpers';

describe('directorOnboardingHelpers', () => {
  it('운영시간 유효성 검사가 정상 작동해야 한다', () => {
    assert.equal(validateOperatingHours(DEFAULT_OPERATING_HOURS).isValid, true);

    const noDays = { ...DEFAULT_OPERATING_HOURS, operatingDays: [] };
    assert.equal(validateOperatingHours(noDays).isValid, false);

    const invalidTimes = { ...DEFAULT_OPERATING_HOURS, startTime: '18:00', endTime: '13:00' };
    assert.equal(validateOperatingHours(invalidTimes).isValid, false);
  });

  it('원생 정보 유효성 검사가 정상 작동해야 한다', () => {
    const validStudent = {
      ...DEFAULT_STUDENT_DRAFT,
      name: '김민준',
      parentPhone: '010-1234-5678',
    };
    assert.equal(validateStudentDraft(validStudent).isValid, true);

    const emptyName = { ...validStudent, name: '' };
    assert.equal(validateStudentDraft(emptyName).isValid, false);

    const invalidPhone = { ...validStudent, parentPhone: '123' };
    assert.equal(validateStudentDraft(invalidPhone).isValid, false);
  });

  it('시간표 배치 정보 유효성 검사가 정상 작동해야 한다', () => {
    assert.equal(validatePlacementDraft(DEFAULT_PLACEMENT_DRAFT).isValid, true);

    const noDay = { ...DEFAULT_PLACEMENT_DRAFT, dayOfWeek: '' };
    assert.equal(validatePlacementDraft(noDay).isValid, false);

    const noTime = { ...DEFAULT_PLACEMENT_DRAFT, startTime: '' };
    assert.equal(validatePlacementDraft(noTime).isValid, false);
  });

  it('운영 시간에 따른 레슨 시간 슬롯을 올바르게 생성해야 한다', () => {
    const slots = generateAvailableLessonTimeSlots('13:00', '18:00', 60);
    assert.deepEqual(slots, ['13:00', '14:00', '15:00', '16:00', '17:00']);
  });
});
