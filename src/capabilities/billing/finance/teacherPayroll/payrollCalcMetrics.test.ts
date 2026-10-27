import assert from 'node:assert/strict';
import {
  countLessonsForTeacher,
  countBookingsForStaff,
  computeStaffPerformanceMetrics,
} from './calc';
import type { LessonRecord } from '@/types';

console.log('Testing payrollCalcMetrics...');

const mockLessons: LessonRecord[] = [
  {
    id: 'l1',
    studentId: 's1',
    studentName: '학생1',
    teacherId: 't1',
    date: '2026-10-05',
    piece: '체르니',
    status: 'completed',
  },
  {
    id: 'l2',
    studentId: 's2',
    studentName: '학생2',
    teacherId: 't1',
    date: '2026-10-12',
    piece: '소나타',
    status: 'completed',
  },
  {
    id: 'l3',
    studentId: 's3',
    studentName: '학생3',
    teacherId: 't2',
    date: '2026-10-15',
    piece: '바이엘',
    status: 'completed',
  },
  {
    id: 'l4',
    studentId: 's1',
    studentName: '학생1',
    teacherId: 't1',
    date: '2026-09-28', // 지난달
    piece: '하농',
    status: 'completed',
  },
];

const mockBookings = [
  {
    staffId: 't1',
    startsAt: '2026-10-06T10:00:00',
    status: 'completed',
  },
  {
    staffId: 't1',
    startsAt: '2026-10-08T14:00:00',
    status: 'confirmed',
  },
  {
    staffId: 't1',
    startsAt: '2026-10-10T16:00:00',
    status: 'cancelled', // 취소된 예약은 제외
  },
  {
    staffId: 't2',
    startsAt: '2026-10-09T11:00:00',
    status: 'completed',
  },
];

// 1. Lesson count
assert.equal(countLessonsForTeacher(mockLessons, 't1', '2026-10'), 2);
assert.equal(countLessonsForTeacher(mockLessons, 't2', '2026-10'), 1);

// 2. Booking count (completed + confirmed)
assert.equal(countBookingsForStaff(mockBookings, 't1', '2026-10'), 2);
assert.equal(countBookingsForStaff(mockBookings, 't2', '2026-10'), 1);

// 3. Combined performance metrics for staff t1
const metricsT1 = computeStaffPerformanceMetrics({
  staffId: 't1',
  yearMonth: '2026-10',
  lessons: mockLessons,
  bookings: mockBookings,
  workHours: 40,
});

assert.equal(metricsT1.lessonCount, 2);
assert.equal(metricsT1.bookingCount, 2);
assert.equal(metricsT1.totalServiceUnits, 4);
assert.equal(metricsT1.workHours, 40);

// 4. Staff with bookings only (e.g. Pilates instructor)
const pilatesMetrics = computeStaffPerformanceMetrics({
  staffId: 't1',
  yearMonth: '2026-10',
  bookings: mockBookings,
  workHours: 20,
});

assert.equal(pilatesMetrics.lessonCount, 0);
assert.equal(pilatesMetrics.bookingCount, 2);
assert.equal(pilatesMetrics.totalServiceUnits, 2);
assert.equal(pilatesMetrics.workHours, 20);

console.log('payrollCalcMetrics.test.ts: all tests passed!');
