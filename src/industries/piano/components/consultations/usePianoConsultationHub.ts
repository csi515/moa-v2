import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { coreScheduleService, reservationService } from '@/core/schedules';
import { customerJoinService } from '@/core/customer/services/customerJoinService';
import {
  consumeOpenConsultationInquiries,
  consumeOpenConsultationReservations,
} from '@/core/customer/studentJoinInbox';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import type { CustomerJoinRequest, ReservationDetail } from '@/types';
import { inquiryBelongsToStaff, reservationBelongsToStaff } from './staffConsultationScope';
import {
  TODAY_RESERVATION_PAGE_SIZE,
  localDayReservationWindow,
  shouldFetchNextReservationPage,
} from './consultationTodayQuery';

export type ConsultationSegment =
  | 'home'
  | 'reservations'
  | 'joins'
  | 'inquiries'
  | 'records'
  | 'availability';

/** 상담 업무(메인 탭) — 문의·예약·기록·오늘 */
export const WORK_SEGMENTS: ConsultationSegment[] = [
  'inquiries',
  'reservations',
  'records',
  'home',
];

/** 설정·도구 성격 — 메인 탭과 분리. 가입은 학생「등록」, 가능시간은 설정→부가 */
export const TOOL_SEGMENTS: ConsultationSegment[] = [];

export function isConsultationWorkSegment(segment: ConsultationSegment): boolean {
  return WORK_SEGMENTS.includes(segment);
}

/** 메인 탭 순서: 사업주 핵심 업무 우선 */
export const CONSULTATION_OPTIONS: { value: ConsultationSegment; label: string }[] = [
  { value: 'inquiries', label: '문의' },
  { value: 'reservations', label: '예약' },
  { value: 'records', label: '기록' },
  { value: 'home', label: '오늘' },
];

export function formatConsultationTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function consultationStatusLabel(status: string): { label: string; className: string } {
  if (status === 'confirmed') {
    return { label: '확정', className: 'bg-emerald-50 text-emerald-700' };
  }
  if (status === 'cancelled') {
    return { label: '취소', className: 'bg-slate-100 text-slate-500' };
  }
  return { label: '대기', className: 'bg-amber-50 text-amber-700' };
}

export function usePianoConsultationHub() {
  const { showToast, setActiveTab } = useApp();
  const { currentOrganization } = useOrganization();
  const refreshKey = useStorageRefresh();
  const { isScoped, staffId, scopeStudents } = useStaffScope();

  /** 스토리지 파생 */
  const assignedStudents = useMemo(
    () => scopeStudents(StorageService.getStudents()),
    [scopeStudents, refreshKey]
  );

  /** 서버 상태 */
  const [myScheduleIds, setMyScheduleIds] = useState<Set<string>>(new Set());
  const [todayRows, setTodayRows] = useState<ReservationDetail[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [todayError, setTodayError] = useState(false);
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);

  /** UI 상태 — 딥링크 우선, 기본은 상담 문의 */
  const [segment, setSegment] = useState<ConsultationSegment>(() => {
    if (consumeOpenConsultationReservations()) return 'reservations';
    if (consumeOpenConsultationInquiries()) return 'inquiries';
    return 'inquiries';
  });

  const keepReservation = useCallback(
    (row: ReservationDetail) => {
      if (!isScoped || !staffId) return true;
      return reservationBelongsToStaff(row, staffId, assignedStudents, myScheduleIds);
    },
    [isScoped, staffId, assignedStudents, myScheduleIds]
  );

  const keepInquiry = useCallback(
    (row: CustomerJoinRequest) => {
      if (!isScoped || !staffId) return true;
      return inquiryBelongsToStaff(row, staffId, assignedStudents);
    },
    [isScoped, staffId, assignedStudents]
  );

  /** 레거시 세그먼트 — 대표 진입점으로 넘김 (타입·딥링크 호환) */
  useEffect(() => {
    if (segment === 'joins') {
      setActiveTab('enrollment-requests');
      setSegment('inquiries');
      return;
    }
    if (segment === 'availability') {
      setSegment('inquiries');
    }
  }, [segment, setActiveTab]);

  useEffect(() => {
    if (!isScoped || !staffId || !currentOrganization) {
      setMyScheduleIds(new Set());
      return;
    }
    let cancelled = false;
    coreScheduleService
      .getOrganizationSchedules(currentOrganization.id)
      .then((rows) => {
        if (cancelled) return;
        setMyScheduleIds(new Set(rows.filter((row) => row.staff_id === staffId).map((row) => row.id)));
      })
      .catch(() => {
        if (!cancelled) setMyScheduleIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isScoped, staffId, currentOrganization]);

  const loadToday = useCallback(async () => {
    if (!currentOrganization) return;
    setLoadingToday(true);
    setTodayError(false);
    try {
      const { from, to } = localDayReservationWindow();
      const collected: ReservationDetail[] = [];
      let offset = 0;
      for (;;) {
        const page = await reservationService.getOrganizationReservations(
          currentOrganization.id,
          undefined,
          from,
          TODAY_RESERVATION_PAGE_SIZE,
          offset,
          to
        );
        collected.push(...page);
        if (!shouldFetchNextReservationPage(page.length, offset)) break;
        offset += page.length;
      }
      setTodayRows(
        collected
          .filter((r) => r.status !== 'cancelled')
          .filter(keepReservation)
          .sort((a, b) => a.schedule_starts_at.localeCompare(b.schedule_starts_at))
      );
    } catch (err) {
      console.error(err);
      setTodayRows([]);
      setTodayError(true);
      if (!isScoped) showToast('오늘 상담을 불러오지 못했습니다.', 'error');
    } finally {
      setLoadingToday(false);
    }
  }, [currentOrganization, showToast, isScoped, keepReservation]);

  useEffect(() => {
    if (segment === 'home') void loadToday();
  }, [segment, loadToday]);

  useEffect(() => {
    if (!currentOrganization?.id) {
      setPendingInquiryCount(0);
      return;
    }
    let cancelled = false;
    customerJoinService
      .getOrgJoinRequests(currentOrganization.id, 'pending', 'consultation')
      .then((rows) => {
        if (cancelled) return;
        const visible = isScoped ? rows.filter(keepInquiry) : rows;
        setPendingInquiryCount(visible.length);
      })
      .catch(() => {
        if (!cancelled) setPendingInquiryCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id, isScoped, keepInquiry, refreshKey]);

  const pendingToday = todayRows.filter((r) => r.status === 'requested').length;

  return {
    currentOrganization,
    isScoped,
    segment,
    setSegment,
    options: CONSULTATION_OPTIONS,
    todayRows,
    loadingToday,
    todayError,
    pendingInquiryCount,
    pendingToday,
    keepReservation,
    keepInquiry,
    loadToday,
  };
}
