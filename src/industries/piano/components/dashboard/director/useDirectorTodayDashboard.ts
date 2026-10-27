import { useEffect, useMemo, useState } from 'react';
import { StorageService } from '@/services/storage';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useStorageRefresh } from '@/hooks';
import { reservationService } from '@/core/schedules';
import { customerJoinService } from '@/core/customer/services/customerJoinService';
import { getOrgEnrollmentRequests } from '@/core/parent/services/enrollmentRequestService';
import type { ClassItem, Student, TuitionInvoice } from '@/types';
import {
  usePianoExpectedDay,
  type PianoExpectedDay,
} from '../../attendance/usePianoExpectedDay';
import { todayIsoLocal } from '../../attendance/pianoAttendanceHelpers';

export interface DirectorTodayData {
  /** 스토리지 파생 */
  stats: ReturnType<typeof StorageService.getDashboardStats>;
  students: Student[];
  todayClasses: ClassItem[];
  unpaidInvoices: TuitionInvoice[];
  unpaidStudentCount: number;
  unpaidTotal: number;
  makeupPendingCount: number;
  /** 오늘 예정·출결 맵 (홈 등원 섹션과 공유) */
  today: string;
  expectedDay: PianoExpectedDay;
  /** 서버(조직 API) 대기 건수 */
  pendingReservationCount: number;
  pendingJoinCount: number;
  pendingInquiryCount: number;
  pendingEnrollmentCount: number;
}

/** 원장 홈 — 스토리지 파생 + 조직 API 대기 건수 */
export function useDirectorTodayDashboard(): DirectorTodayData {
  const { currentOrganization } = useOrganization();
  const refreshKey = useStorageRefresh();
  const today = todayIsoLocal();
  const expectedDay = usePianoExpectedDay(today);

  /** 서버 상태 — UI는 건수만 사용 */
  const [pendingReservationCount, setPendingReservationCount] = useState(0);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);
  const [pendingEnrollmentCount, setPendingEnrollmentCount] = useState(0);

  /** 스토리지 파생 — refreshKey당 1회 읽기 */
  const storage = useMemo(() => {
    void refreshKey;
    const stats = StorageService.getDashboardStats();
    const students = StorageService.getStudents();
    const unpaidInvoices = StorageService.getUnpaidInvoices().filter(
      (inv) => inv.unpaidAmount > 0
    );
    const unpaidStats = StorageService.getUnifiedUnpaidStats();
    const makeupPendingCount = StorageService.getMakeupItems().filter(
      (item) => item.status === 'pending'
    ).length;
    const todayClasses = [...(stats.todayClasses as ClassItem[])].sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    );
    return {
      stats,
      students,
      unpaidInvoices,
      unpaidStudentCount: unpaidStats.studentCount ?? stats.unpaidStudentsCount,
      unpaidTotal: unpaidStats.grandTotal ?? stats.totalUnpaidThisMonth,
      makeupPendingCount,
      todayClasses,
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!currentOrganization?.id) {
      setPendingReservationCount(0);
      setPendingJoinCount(0);
      setPendingInquiryCount(0);
      setPendingEnrollmentCount(0);
      return;
    }

    const orgId = currentOrganization.id;
    let cancelled = false;

    void Promise.all([
      reservationService
        .getOrganizationReservations(orgId, 'requested', undefined, 8)
        .then((rows) => {
          if (!cancelled) setPendingReservationCount(rows.length);
        })
        .catch(() => {
          if (!cancelled) setPendingReservationCount(0);
        }),
      customerJoinService
        .getOrgJoinRequests(orgId, 'pending', 'membership')
        .then((rows) => {
          if (!cancelled) setPendingJoinCount(rows.length);
        })
        .catch(() => {
          if (!cancelled) setPendingJoinCount(0);
        }),
      customerJoinService
        .getOrgJoinRequests(orgId, 'pending', 'consultation')
        .then((rows) => {
          if (!cancelled) setPendingInquiryCount(rows.length);
        })
        .catch(() => {
          if (!cancelled) setPendingInquiryCount(0);
        }),
      getOrgEnrollmentRequests(orgId, 'pending')
        .then((rows) => {
          if (!cancelled) setPendingEnrollmentCount(rows.length);
        })
        .catch(() => {
          if (!cancelled) setPendingEnrollmentCount(0);
        }),
    ]);

    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id, refreshKey]);

  return {
    ...storage,
    today,
    expectedDay,
    pendingReservationCount,
    pendingJoinCount,
    pendingInquiryCount,
    pendingEnrollmentCount,
  };
}
