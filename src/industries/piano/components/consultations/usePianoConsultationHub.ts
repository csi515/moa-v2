import { useCallback, useEffect, useMemo, useState } from 'react';
import { useList } from '@refinedev/core';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { coreScheduleService, reservationService } from '@/core/schedules';
import { customerJoinService } from '@/core/customer/services/customerJoinService';
import {
  consumeOpenConsultationInquiries,
  consumeOpenConsultationReservations,
} from '@/core/customer/studentJoinInbox';
import { useStaffScope } from '@/hooks';
import { StorageService } from '@/services/storage';
import type { CustomerJoinRequest, ReservationDetail, Consultation } from '@/types';
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

export const WORK_SEGMENTS: ConsultationSegment[] = [
  'inquiries',
  'reservations',
  'records',
  'home',
];

export const TOOL_SEGMENTS: ConsultationSegment[] = [];

export function isConsultationWorkSegment(segment: ConsultationSegment): boolean {
  return WORK_SEGMENTS.includes(segment);
}

export const CONSULTATION_OPTIONS: { value: ConsultationSegment; label: string }[] = [
  { value: 'inquiries', label: '문의' },
  { value: 'reservations', label: '예약' },
  { value: 'records', label: '기록' },
  { value: 'home', label: '오늘' },
];

export function formatConsultationTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
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

export type ConsultationUnifiedStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type ConsultationFilterStatus = 'ALL' | 'TODAY' | 'PENDING' | 'CONFIRMED' | 'COMPLETED';

export interface UnifiedConsultationRow {
  id: string;
  sourceType: 'inquiry' | 'reservation' | 'record';
  originalId: string;
  sourceData: CustomerJoinRequest | ReservationDetail | Consultation;

  scheduledAt: string; // ISO 문자열 또는 YYYY-MM-DD
  status: ConsultationUnifiedStatus;
  rawStatus: string;

  applicantName: string;
  studentName?: string;
  relationship?: string;
  phone: string;
  email?: string;

  coursePreference: string;
  notes?: string;

  consultationRecord?: Consultation;
  hasRecord: boolean;

  isRegisteredStudent: boolean;
  registeredStudentId?: string;
}

export function isSameDayAsToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return dateStr.startsWith(todayStr);
  }
  const today = new Date();
  return (
    target.getFullYear() === today.getFullYear() &&
    target.getMonth() === today.getMonth() &&
    target.getDate() === today.getDate()
  );
}

export function formatConsultationSchedule(dateStr?: string): { display: string; isToday: boolean } {
  if (!dateStr) return { display: '-', isToday: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { display: dateStr, isToday: false };
  }
  const isToday = isSameDayAsToday(dateStr);
  const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hasTime = dateStr.includes('T') || dateStr.includes(':');

  if (isToday) {
    return {
      display: hasTime ? `오늘 ${timeStr}` : '오늘',
      isToday: true,
    };
  }
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const dateFormatted = `${month}월 ${day}일(${dayOfWeek})`;
  return {
    display: hasTime ? `${dateFormatted} ${timeStr}` : dateFormatted,
    isToday: false,
  };
}

export function getUnifiedStatusBadge(status: ConsultationUnifiedStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: '대기',
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      };
    case 'confirmed':
      return {
        label: '확정',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      };
    case 'completed':
      return {
        label: '완료',
        badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
      };
    case 'cancelled':
      return {
        label: '취소',
        badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      };
  }
}

export function usePianoConsultationHub() {
  const { showToast, setActiveTab } = useApp();
  const { currentOrganization } = useOrganization();
  const { isScoped, staffId, scopeStudents } = useStaffScope();

  /** Refine으로 학생 목록 조회 */
  const studentsList = useList<any>({
    resource: 'customers',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    queryOptions: { enabled: !!currentOrganization?.id },
  });
  const allStudents = (studentsList as any).data?.data || (studentsList as any).query?.data?.data || [];
  const assignedStudents = useMemo(
    () => scopeStudents(allStudents),
    [scopeStudents, allStudents]
  );

  /** 서버 및 로컬 상태 */
  const [myScheduleIds, setMyScheduleIds] = useState<Set<string>>(new Set());
  const [todayRows, setTodayRows] = useState<ReservationDetail[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [todayError, setTodayError] = useState(false);
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);

  /** 전체 통합 상담 상태 */
  const [rawInquiries, setRawInquiries] = useState<CustomerJoinRequest[]>([]);
  const [rawReservations, setRawReservations] = useState<ReservationDetail[]>([]);
  const [rawConsultations, setRawConsultations] = useState<Consultation[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ConsultationFilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmingId, setIsConfirmingId] = useState<string | null>(null);

  /** 레거시 세그먼트 호환 */
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

  /** 오늘 예약 조회 — consultationTodayQuery 계약 보존 */
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

  /** 전체 상담 문의, 예약, 상담 기록 로드 */
  const loadAllData = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setLoadingAll(true);
    try {
      const [inquiries, reservations] = await Promise.all([
        customerJoinService.getOrgJoinRequests(currentOrganization.id, undefined, 'consultation').catch(() => []),
        reservationService.getOrganizationReservations(currentOrganization.id, undefined, undefined, 200, 0, undefined).catch(() => []),
      ]);

      const consultations = StorageService.getConsultations();

      setRawInquiries(inquiries);
      setRawReservations(reservations);
      setRawConsultations(consultations);

      const pendingInqs = inquiries.filter((q) => q.status === 'pending');
      const visiblePending = isScoped ? pendingInqs.filter(keepInquiry) : pendingInqs;
      setPendingInquiryCount(visiblePending.length);
    } catch (err) {
      console.error('Failed to load consultation hub data:', err);
    } finally {
      setLoadingAll(false);
    }
  }, [currentOrganization?.id, isScoped, keepInquiry]);

  useEffect(() => {
    void loadToday();
    void loadAllData();
  }, [loadToday, loadAllData]);

  /** 통합 상담 대장 목록 조립 */
  const consultationRows: UnifiedConsultationRow[] = useMemo(() => {
    const studentPhoneMap = new Map<string, string>();
    const studentNameSet = new Set<string>();
    const studentMap = new Map<string, any>();

    allStudents.forEach((st: any) => {
      studentNameSet.add(st.name);
      if (st.phone) studentPhoneMap.set(st.phone.replace(/[^0-9]/g, ''), st.id);
      if (st.id) studentMap.set(st.id, st);
    });

    const matchedConsultationIds = new Set<string>();
    const rows: UnifiedConsultationRow[] = [];

    // 1. 상담 예약 (Reservations)
    const visibleReservations = isScoped ? rawReservations.filter(keepReservation) : rawReservations;
    visibleReservations.forEach((r) => {
      const cleanPhone = (r.applicant_phone || '').replace(/[^0-9]/g, '');
      const matchedStudentId = (cleanPhone ? studentPhoneMap.get(cleanPhone) : undefined) || r.customer_id;
      const isRegistered = Boolean(matchedStudentId || (r.applicant_name && studentNameSet.has(r.applicant_name)));

      // 상담 일지 매칭
      const matchedRecord = rawConsultations.find((c) => {
        if (matchedConsultationIds.has(c.id)) return false;
        if (c.studentName === r.applicant_name) return true;
        if (c.parentName === r.applicant_name) return true;
        if (matchedStudentId && c.studentId === matchedStudentId) return true;
        return false;
      });

      if (matchedRecord) {
        matchedConsultationIds.add(matchedRecord.id);
      }

      let status: ConsultationUnifiedStatus = 'pending';
      if (matchedRecord) {
        status = 'completed';
      } else if (r.status === 'confirmed') {
        status = 'confirmed';
      } else if (r.status === 'cancelled') {
        status = 'cancelled';
      }

      rows.push({
        id: `res_${r.id}`,
        sourceType: 'reservation',
        originalId: r.id,
        sourceData: r,
        scheduledAt: r.schedule_starts_at,
        status,
        rawStatus: r.status,
        applicantName: r.applicant_name || '신청자',
        studentName: undefined,
        relationship: undefined,
        phone: r.applicant_phone || '',
        email: r.applicant_email || undefined,
        coursePreference: r.schedule_title || '상담 예약',
        notes: r.request_message || (r.metadata?.notes as string) || undefined,
        consultationRecord: matchedRecord,
        hasRecord: Boolean(matchedRecord),
        isRegisteredStudent: isRegistered,
        registeredStudentId: matchedStudentId,
      });
    });

    // 2. 상담 문의 (Inquiries)
    const visibleInquiries = isScoped ? rawInquiries.filter(keepInquiry) : rawInquiries;
    visibleInquiries.forEach((q) => {
      const metadata = (q.customer_metadata || {}) as Record<string, unknown>;
      const studentName = (metadata.student_name || metadata.studentName) as string | undefined;
      const relationship = metadata.relationship as string | undefined;
      const desiredCourse = (metadata.desired_course || metadata.desiredCourse) as string | undefined;
      const preferredSchedule = (metadata.preferred_schedule || metadata.preferredSchedule) as string | undefined;
      const inquiryNotes = (metadata.notes as string) || q.message || undefined;

      const cleanPhone = (q.applicant_phone || '').replace(/[^0-9]/g, '');
      const matchedStudentId = cleanPhone ? studentPhoneMap.get(cleanPhone) : undefined;
      const isRegistered = Boolean(
        matchedStudentId ||
        (studentName && studentNameSet.has(studentName)) ||
        (q.applicant_name && studentNameSet.has(q.applicant_name))
      );

      // 상담 일지 매칭
      const matchedRecord = rawConsultations.find((c) => {
        if (matchedConsultationIds.has(c.id)) return false;
        if (studentName && c.studentName === studentName) return true;
        if (c.studentName === q.applicant_name || c.parentName === q.applicant_name) return true;
        return false;
      });

      if (matchedRecord) {
        matchedConsultationIds.add(matchedRecord.id);
      }

      let status: ConsultationUnifiedStatus = 'pending';
      if (matchedRecord) {
        status = 'completed';
      } else if (q.status === 'approved') {
        status = 'confirmed';
      } else if (q.status === 'rejected' || q.status === 'cancelled') {
        status = 'cancelled';
      }

      rows.push({
        id: `inq_${q.id}`,
        sourceType: 'inquiry',
        originalId: q.id,
        sourceData: q,
        scheduledAt: preferredSchedule || q.created_at,
        status,
        rawStatus: q.status,
        applicantName: q.applicant_name,
        studentName,
        relationship,
        phone: q.applicant_phone || '',
        email: q.applicant_email || undefined,
        coursePreference: desiredCourse || '상담 문의',
        notes: inquiryNotes,
        consultationRecord: matchedRecord,
        hasRecord: Boolean(matchedRecord),
        isRegisteredStudent: isRegistered,
        registeredStudentId: matchedStudentId,
      });
    });

    // 3. 매칭되지 않은 독립 상담 일지 (Consultations)
    rawConsultations.forEach((c) => {
      if (matchedConsultationIds.has(c.id)) return;

      const student = studentMap.get(c.studentId);
      const isRegistered = Boolean(student || studentNameSet.has(c.studentName));

      const typeLabel =
        c.type === 'parent'
          ? '학부모 상담'
          : c.type === 'student'
          ? '원생 상담'
          : c.type === 'career'
          ? '진로/입시'
          : '학습/진도';

      rows.push({
        id: `rec_${c.id}`,
        sourceType: 'record',
        originalId: c.id,
        sourceData: c,
        scheduledAt: c.date,
        status: 'completed',
        rawStatus: 'completed',
        applicantName: c.parentName || c.studentName,
        studentName: c.studentName,
        relationship: '학부모',
        phone: student?.phone || '',
        coursePreference: typeLabel,
        notes: c.content,
        consultationRecord: c,
        hasRecord: true,
        isRegisteredStudent: isRegistered,
        registeredStudentId: c.studentId,
      });
    });

    // 일시 내림차순 정렬 (최신 상담 우선)
    return rows.sort((a, b) => (b.scheduledAt || '').localeCompare(a.scheduledAt || ''));
  }, [allStudents, isScoped, rawReservations, keepReservation, rawConsultations, rawInquiries, keepInquiry]);

  /** 필터 및 검색 적용된 목록 */
  const filteredRows = useMemo(() => {
    return consultationRows.filter((row) => {
      // 1. 빠른 상태 필터
      if (filterStatus === 'TODAY') {
        if (!isSameDayAsToday(row.scheduledAt)) return false;
      } else if (filterStatus === 'PENDING') {
        if (row.status !== 'pending') return false;
      } else if (filterStatus === 'CONFIRMED') {
        if (row.status !== 'confirmed') return false;
      } else if (filterStatus === 'COMPLETED') {
        if (row.status !== 'completed') return false;
      }

      // 2. 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inApplicant = row.applicantName.toLowerCase().includes(q);
        const inStudent = (row.studentName || '').toLowerCase().includes(q);
        const inPhone = row.phone.includes(q);
        const inCourse = row.coursePreference.toLowerCase().includes(q);
        const inNotes = (row.notes || '').toLowerCase().includes(q);
        const inRecord = (row.consultationRecord?.content || '').toLowerCase().includes(q);

        if (!inApplicant && !inStudent && !inPhone && !inCourse && !inNotes && !inRecord) {
          return false;
        }
      }

      return true;
    });
  }, [consultationRows, filterStatus, searchQuery]);

  /** 요약 통계 뱃지 칩 카운트 */
  const summaryCounts = useMemo(() => {
    let todayCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;

    consultationRows.forEach((row) => {
      if (row.status !== 'cancelled' && isSameDayAsToday(row.scheduledAt)) {
        todayCount++;
      }
      if (row.status === 'pending') {
        pendingCount++;
      } else if (row.status === 'confirmed') {
        confirmedCount++;
      } else if (row.status === 'completed') {
        completedCount++;
      }
    });

    return {
      todayCount,
      pendingCount,
      confirmedCount,
      completedCount,
    };
  }, [consultationRows]);

  /** [확정] 액션 처리 */
  const confirmRow = useCallback(
    async (row: UnifiedConsultationRow) => {
      setIsConfirmingId(row.id);
      try {
        if (row.sourceType === 'inquiry') {
          await customerJoinService.approveJoinRequest(row.originalId);
          showToast(`${row.applicantName}님의 상담 문의가 확정되었습니다.`, 'success');
        } else if (row.sourceType === 'reservation') {
          await reservationService.confirmReservation(row.originalId);
          showToast(`${row.applicantName}님의 상담 예약이 확정되었습니다.`, 'success');
        }
        await loadAllData();
        await loadToday();
      } catch (err: any) {
        showToast(err?.message || '확정 처리에 실패했습니다.', 'error');
      } finally {
        setIsConfirmingId(null);
      }
    },
    [loadAllData, loadToday, showToast]
  );

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

    // 개편된 통합 상담 대장 API
    consultationRows,
    filteredRows,
    loadingAll,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    summaryCounts,
    confirmRow,
    isConfirmingId,
    refreshConsultations: loadAllData,
  };
}
