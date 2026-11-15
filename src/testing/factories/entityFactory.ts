/**
 * Moa-v2 Test Sandbox Entity Factories
 *
 * 52개 전 업종 및 플랫폼 공통 기능을 테스트할 때 사용하는 결정론적 팩토리 유틸리티.
 */
import type { Organization } from '../../lib/supabase';
import type { Student, ClassItem } from '../../types';
import type { Booking, SessionPass } from '../../core/types/schedule';
import type { IndustryType } from '../../core/industry/catalog';

let idSequence = 1;
export function resetFactorySequence(): void {
  idSequence = 1;
}

export function createTestOrganization(overrides?: Partial<Organization> & { industry?: IndustryType }): Organization {
  const seq = idSequence++;
  const industry = overrides?.industry || 'academy';
  const base = {
    id: `org_test_${seq}`,
    name: `테스트 사업장 ${seq}`,
    owner_id: `user_owner_${seq}`,
    created_at: '2026-01-01T00:00:00.000Z',
    settings: {
      industry,
      timezone: 'Asia/Seoul',
    },
  } as unknown as Organization;
  return Object.assign(base, overrides);
}

export function createTestCustomer(overrides?: Partial<Student>): Student {
  const seq = idSequence++;
  const now = '2026-01-01T00:00:00.000Z';
  const base: Student = {
    id: `cust_test_${seq}`,
    studentNumber: `STU-${1000 + seq}`,
    name: `테스트 회원 ${seq}`,
    gender: seq % 2 === 0 ? 'M' : 'F',
    birthDate: '2015-05-05',
    school: '테스트초등학교',
    grade: '초등3',
    phone: `010-1234-${String(seq).padStart(4, '0')}`,
    emergencyContact: '010-9999-9999',
    joinDate: '2026-01-01',
    status: 'active',
    level: '기초',
    teacherId: 'staff_test_1',
    teacherName: '담당 강사',
    classIds: [],
    tuitionFee: 150000,
    paymentDay: 1,
    createdAt: now,
    updatedAt: now,
  };
  return Object.assign(base, overrides);
}

export function createTestClass(overrides?: Partial<ClassItem>): ClassItem {
  const seq = idSequence++;
  const base: ClassItem = {
    id: `class_test_${seq}`,
    name: `테스트 클래스 ${seq}`,
    teacherId: 'staff_test_1',
    teacherName: '담당 강사',
    daysOfWeek: ['월', '수', '금'],
    startTime: '14:00',
    endTime: '15:00',
    capacity: 10,
    color: 'indigo',
    room: '1호실',
  };
  return Object.assign(base, overrides);
}

export function createTestSessionPass(overrides?: Partial<SessionPass>): SessionPass {
  const seq = idSequence++;
  const base: SessionPass = {
    id: `pass_test_${seq}`,
    customerId: `cust_test_${seq}`,
    totalSessions: 10,
    usedSessions: 0,
    status: 'active',
    purchasedAt: '2026-01-01',
    expiresAt: '2026-12-31',
  } as SessionPass;
  return Object.assign(base, overrides);
}

export function createTestBooking(overrides?: Partial<Booking>): Booking {
  const seq = idSequence++;
  const base: Booking = {
    id: `booking_test_${seq}`,
    customerId: `cust_test_${seq}`,
    customerName: `테스트 회원 ${seq}`,
    serviceId: 'service_test_1',
    serviceName: '일반 레슨',
    staffId: 'staff_test_1',
    staffName: '담당 강사',
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T11:00:00.000Z',
    status: 'confirmed',
  } as Booking;
  return Object.assign(base, overrides);
}
