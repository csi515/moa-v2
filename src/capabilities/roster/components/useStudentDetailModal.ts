import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students';
import { TuitionService } from '@/capabilities/finance';
import { LessonService } from '@/core/lessons';
import type { PerformanceVideo, Student, TextbookSale, TuitionInvoice, PaymentMethod } from '@/types';
import { isValidYouTubeUrl } from '@/utils/youtube';
import { getGuardiansForStudent, getPrimaryGuardian } from '@/core/parent';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPlugin } from '@/core/industry/registry';
import { isSupabaseConfigured } from '@/lib/supabase';
import { notifyParentAbsence } from '@/capabilities/attendance';
import { saveAttendanceWithPass } from '@/core/schedules/attendancePassAtomic';
import { todayIsoLocal, yearMonthLocal } from '@/shared/utils/localDate';
import {
  getAttendanceBadge,
  getInvoiceStatusBadge,
  getLevelColor,
  getStudentStatusBadge,
} from '@/utils/formatters';
import type { AttendanceStatus, ClassItem, DayOfWeek } from '@/types';
import { getStudentExitActionLabel } from './studentExitActionLabel';
import { useModuleLabels } from '@/core/labels';
import { DetailTab, getDetailTabConfig } from './detail/types';
import {
  getStudentDetailExtension,
  resolveStudentDetailTabs,
  runStudentDetailAttendanceSideEffect,
  mapStudentDetailEventToVideoType,
} from './detail/studentDetailExtensions';
import {
  getEnrolledClassesOnDate,
  nextManualAttendanceClassId,
  resolveManualAttendanceClass,
} from './detail/studentManualAttendanceClass';

const WEEKDAY_KO: DayOfWeek[] = ['일', '월', '화', '수', '목', '금', '토'];

const DEFAULT_VIDEO_TYPE_LABEL: Record<string, string> = {
  recital: '연주회',
  competition: '콩쿠르',
  lesson: '수업',
  practice: '연습',
  other: '기타',
};

/** 등록된 반 기준으로 가장 가까운 다음 수업 라벨 */
function getNextClassLabel(classes: ClassItem[]): string {
  if (classes.length === 0) return '배정된 수업 없음';

  const now = new Date();
  const todayIdx = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  type Candidate = { daysAhead: number; startMinutes: number; label: string };
  const candidates: Candidate[] = [];

  for (const cls of classes) {
    const days = cls.daysOfWeek || [];
    const [h = 0, m = 0] = (cls.startTime || '00:00').split(':').map(Number);
    const startMinutes = h * 60 + m;
    for (const day of days) {
      const dayIdx = WEEKDAY_KO.indexOf(day);
      if (dayIdx < 0) continue;
      let daysAhead = (dayIdx - todayIdx + 7) % 7;
      if (daysAhead === 0 && startMinutes <= nowMinutes) {
        daysAhead = 7;
      }
      const when =
        daysAhead === 0 ? '오늘' : daysAhead === 1 ? '내일' : day;
      candidates.push({
        daysAhead,
        startMinutes,
        label: `${when} ${cls.startTime} · ${cls.name}`,
      });
    }
  }

  if (candidates.length === 0) {
    const first = classes[0];
    return `${first.name} ${first.daysOfWeek?.join('') || ''} ${first.startTime || ''}`.trim();
  }

  candidates.sort((a, b) => a.daysAhead - b.daysAhead || a.startMinutes - b.startMinutes);
  return candidates[0].label;
}

interface UseStudentDetailModalOptions {
  student: Student;
  isOpen: boolean;
  initialTab?: DetailTab;
  onInitialTabApplied?: () => void;
  onClose: () => void;
  onEdit: (student: Student) => void;
}

export function useStudentDetailModal({
  student,
  isOpen,
  initialTab,
  onInitialTabApplied,
  onClose,
  onEdit,
}: UseStudentDetailModalOptions) {
  const { showToast, openConfirmDialog, currentUser, triggerRefresh } = useApp();
  const { attendanceEnabled, isAdmin, industry } = usePermissions();
  const labels = useModuleLabels();
  const industryPlugin = getIndustryPlugin(industry);
  const [currentTab, setCurrentTab] = useState<DetailTab>('info');
  const [guardianLinkOpen, setGuardianLinkOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setCurrentTab(initialTab);
      onInitialTabApplied?.();
    }
  }, [isOpen, initialTab, onInitialTabApplied]);

  const [isAddAttOpen, setIsAddAttOpen] = useState(false);
  const [newAttStatus, setNewAttStatus] = useState<any>('present');
  const [newAttDate, setNewAttDate] = useState(todayIsoLocal);
  const [newAttMemo, setNewAttMemo] = useState('');
  const [newAttClassId, setNewAttClassId] = useState('');

  const [isAddCstOpen, setIsAddCstOpen] = useState(false);
  const [newCstType, setNewCstType] = useState<any>('learning');
  const [newCstContent, setNewCstContent] = useState('');
  const [newCstResult, setNewCstResult] = useState('');
  const [newCstNextDate, setNewCstNextDate] = useState('');

  const [isAddPrOpen, setIsAddPrOpen] = useState(false);
  const [newPrDate, setNewPrDate] = useState(todayIsoLocal);
  const [newPrMinutes, setNewPrMinutes] = useState(40);
  const [newPrSong, setNewPrSong] = useState('');
  const [newPrDifficulty, setNewPrDifficulty] = useState('');
  const [newPrHomework, setNewPrHomework] = useState('');

  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDate, setNewVideoDate] = useState(todayIsoLocal);
  const [newVideoType, setNewVideoType] = useState<PerformanceVideo['eventType']>('recital');
  const [newVideoEventId, setNewVideoEventId] = useState('');
  const [newVideoSong, setNewVideoSong] = useState('');
  const [newVideoMemo, setNewVideoMemo] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('onsite_card');
  const [payMemo, setPayMemo] = useState('');

  const [isStudentSaleModalOpen, setIsStudentSaleModalOpen] = useState(false);
  const [isStudentTbPaymentModalOpen, setIsStudentTbPaymentModalOpen] = useState(false);
  const [selectedStudentSaleForPay, setSelectedStudentSaleForPay] = useState<TextbookSale | null>(null);
  const [isTbReceiptOpen, setIsTbReceiptOpen] = useState(false);
  const [tbReceiptSale, setTbReceiptSale] = useState<TextbookSale | null>(null);

  const allClasses = StorageService.getClasses();
  const enrolledClasses = allClasses.filter((c) => student.classIds?.includes(c.id));
  const attendanceClassOptions = React.useMemo(
    () => getEnrolledClassesOnDate(enrolledClasses, newAttDate),
    [enrolledClasses, newAttDate]
  );

  React.useEffect(() => {
    if (!isAddAttOpen) return;
    setNewAttClassId((prev) => nextManualAttendanceClassId(attendanceClassOptions, prev));
  }, [isAddAttOpen, attendanceClassOptions]);

  const allAttendance = StorageService.getAttendance().filter((a) => a.studentId === student.id);
  const allInvoices = TuitionService.getInvoicesByStudent(student.id);
  const allConsultations = StorageService.getConsultations().filter((c) => c.studentId === student.id);
  const allLessons = LessonService.getLessonRecordsByStudent(student.id);
  const allVideos = StorageService.getPerformanceVideosByStudentId(student.id);
  const recitalEvents = StorageService.getRecitalEvents();

  const studentDetailExtension = getStudentDetailExtension(industryPlugin.id);
  const showsPracticeRecords = Boolean(studentDetailExtension?.showsPracticeRecords);
  const practiceRecordsResource = studentDetailExtension?.practiceRecordsResource || 'practice_records';
  const practiceRecordsSchema = studentDetailExtension?.practiceRecordsSchema;

  const practiceRecordsList = useList<any>({
    resource: practiceRecordsResource,
    ...(practiceRecordsSchema ? { meta: { schema: practiceRecordsSchema } } : {}),
    filters: [
      { field: 'customer_id', operator: 'eq', value: student.id },
    ],
    queryOptions: { enabled: !!student.id && showsPracticeRecords },
  });
  
  const rawPracticeRecords = (practiceRecordsList as any).data?.data || (practiceRecordsList as any).query?.data?.data || [];
  const allPractice = React.useMemo(() => {
    return rawPracticeRecords.map((r: any) => ({
      id: r.id,
      studentId: r.customer_id,
      studentName: student.name,
      date: r.practice_date,
      minutes: r.minutes,
      songTitle: r.song_title,
      difficultyPart: r.difficulty_part || undefined,
      homework: r.homework || undefined,
      teacherEvaluation: r.teacher_evaluation || undefined,
      source: r.metadata?.source || 'parent',
      staffReviewed: r.metadata?.staffReviewed || false,
      staffReviewNote: r.metadata?.staffReviewNote,
      createdAt: r.created_at,
    })).sort((a: any, b: any) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [rawPracticeRecords, student.name]);
  const studentSales = StorageService.getTextbookSalesByStudentId(student.id);
  const billingSummary = StorageService.getStudentBillingSummary(
    student.id,
    yearMonthLocal()
  );
  const guardians = getGuardiansForStudent(student.id);
  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0];

  const uniqueDates = new Set(allAttendance.map((a) => a.date));
  const presentByDate = new Map<string, boolean>();
  for (const a of allAttendance) {
    const counted = a.status === 'present' || a.status === 'make_up';
    if (!presentByDate.has(a.date) || counted) {
      presentByDate.set(a.date, counted || Boolean(presentByDate.get(a.date)));
    }
  }
  const totalAttCount = uniqueDates.size;
  const presentCount = [...presentByDate.values()].filter(Boolean).length;
  const attRate =
    uniqueDates.size > 0 ? Math.round((presentCount / uniqueDates.size) * 100) : 100;

  const totalPracticeMinutes = allPractice.reduce((sum, p) => sum + p.minutes, 0);

  const exitActionLabel = getStudentExitActionLabel(industry);

  /** 소프트 종료·퇴원 — 하드 삭제하지 않고 이력 유지, 기본 목록에서 숨김 */
  const handleWithdraw = () => {
    const who = labels.customer.singular;
    const ended = exitActionLabel;
    if (student.status === 'withdrawn') {
      openConfirmDialog({
        title: '재원으로 복귀',
        message: `${student.name} ${who}을 재원 상태로 되돌릴까요?`,
        confirmText: '재원 복귀',
        onConfirm: () => {
          StudentService.saveStudent({
            ...student,
            status: 'active',
            leaveDate: undefined,
          });
          showToast(`${student.name} ${who}이 재원으로 복귀했습니다.`, 'success');
          triggerRefresh();
        },
      });
      return;
    }

    openConfirmDialog({
      title: `${who} ${ended} 처리`,
      message: `${student.name} ${who}을 ${ended} 처리할까요?\n기록이 보존되며, 목록 기본(재원) 필터에서는 숨겨집니다.`,
      isDestructive: true,
      confirmText: `${ended} 처리`,
      onConfirm: () => {
        StudentService.saveStudent({
          ...student,
          status: 'withdrawn',
          leaveDate: todayIsoLocal(),
        });
        showToast(`${student.name} ${who}이 ${ended} 처리되었습니다.`, 'info');
        triggerRefresh();
        onClose();
      },
    });
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = getEnrolledClassesOnDate(enrolledClasses, newAttDate);
    const resolved = resolveManualAttendanceClass({
      options,
      selectedClassId: newAttClassId,
    });
    if (!resolved.ok) {
      showToast('출결을 기록할 반을 선택해 주세요.', 'warning');
      return;
    }
    const { classId, className } = resolved;

    const status = newAttStatus as AttendanceStatus;
    const existing = StorageService.getAttendance().find(
      (r) => r.date === newAttDate && r.studentId === student.id && r.classId === classId
    );
    if (industryPlugin.savesAttendanceWithPass) {
      const result = await saveAttendanceWithPass({
        student,
        nextStatus: status,
        previous: existing || null,
        date: newAttDate,
        classId,
        className,
        createdBy: currentUser.name,
        memo: newAttMemo,
      });
      if (!result.ok) {
        showToast(result.warning || '출결 저장에 실패했습니다.', 'warning');
        return;
      }
    } else {
      const passResult = runStudentDetailAttendanceSideEffect(industryPlugin.id, {
        student,
        nextStatus: status,
        previous: existing || null,
        date: newAttDate,
      });
      if (passResult.warning) {
        showToast(passResult.warning, 'warning');
        return;
      }
      StorageService.saveAttendanceRecord({
        ...(existing ? { id: existing.id } : {}),
        date: newAttDate,
        studentId: student.id,
        studentName: student.name,
        classId,
        className,
        status,
        memo: newAttMemo,
        createdBy: currentUser.name,
        sessionPassId: passResult.sessionPassId,
      });
    }
    if (status === 'absent') {
      notifyParentAbsence({
        studentId: student.id,
        studentName: student.name,
        parentPhone: student.parentPhone,
        className,
        classId,
        date: newAttDate,
        reason: newAttMemo || undefined,
        previousStatus: existing?.status,
      });
    }
    showToast('출결 기록이 저장되었습니다.', 'success');
    setIsAddAttOpen(false);
    setNewAttMemo('');
    setNewAttClassId('');
  };

  const handleSaveConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCstContent.trim()) {
      showToast('상담 내용을 입력해주세요.', 'warning');
      return;
    }
    StorageService.saveConsultation({
      studentId: student.id,
      studentName: student.name,
      parentName:
        getPrimaryGuardian(student.id)?.parentName ||
        student.parentName ||
        labels.contact.singular,
      date: todayIsoLocal(),
      type: newCstType,
      content: newCstContent.trim(),
      result: newCstResult.trim(),
      nextDate: newCstNextDate || undefined,
      counselorId: StorageService.getTeachers()[0]?.id || '',
      counselorName: currentUser.name,
    });
    showToast('상담 기록이 저장되었습니다.', 'success');
    setIsAddCstOpen(false);
    setNewCstContent('');
    setNewCstResult('');
  };

  const { currentOrganization } = useOrganization();
  const { mutate: createPracticeRecord } = useCreate() as any;

  const handleSavePractice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrSong.trim()) {
      showToast('연습곡을 입력해주세요.', 'warning');
      return;
    }
    
    createPracticeRecord(
      {
        resource: practiceRecordsResource,
        ...(practiceRecordsSchema ? { meta: { schema: practiceRecordsSchema } } : {}),
        values: {
          organization_id: currentOrganization?.id,
          customer_id: student.id,
          practice_date: newPrDate,
          minutes: Number(newPrMinutes) || 30,
          song_title: newPrSong.trim(),
          homework: newPrHomework.trim() || null,
          difficulty_part: newPrDifficulty.trim() || null,
          teacher_evaluation: '⭐⭐⭐⭐',
          metadata: {
            source: 'staff',
            staffReviewed: true,
            studentName: student.name,
          }
        },
      },
      {
        onSuccess: () => {
          showToast('연습 기록이 저장되었습니다.', 'success');
          setIsAddPrOpen(false);
          setNewPrSong('');
          setNewPrDifficulty('');
          setNewPrHomework('');
        },
        onError: () => {
          showToast('연습 기록 저장에 실패했습니다.', 'error');
        }
      }
    );
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim()) {
      showToast('영상 제목을 입력해주세요.', 'warning');
      return;
    }
    if (!isValidYouTubeUrl(newVideoUrl)) {
      showToast('올바른 YouTube 링크를 입력해주세요.', 'warning');
      return;
    }
    const linkedEvent = newVideoEventId
      ? recitalEvents.find((ev) => ev.id === newVideoEventId)
      : undefined;

    StorageService.savePerformanceVideo({
      studentId: student.id,
      studentName: student.name,
      title: newVideoTitle.trim(),
      youtubeUrl: newVideoUrl.trim(),
      recordedDate: newVideoDate || undefined,
      eventType: newVideoType,
      songTitle: newVideoSong.trim() || undefined,
      memo: newVideoMemo.trim() || undefined,
      eventId: linkedEvent?.id,
      eventTitle: linkedEvent?.title,
    });
    showToast('연주 영상이 등록되었습니다.', 'success');
    setIsAddVideoOpen(false);
    setNewVideoTitle('');
    setNewVideoUrl('');
    setNewVideoEventId('');
    setNewVideoSong('');
    setNewVideoMemo('');
  };

  const handleVideoEventChange = (eventId: string) => {
    setNewVideoEventId(eventId);
    if (!eventId) return;
    const ev = recitalEvents.find((item) => item.id === eventId);
    if (!ev) return;
    setNewVideoDate(ev.startDate);
    setNewVideoType(mapStudentDetailEventToVideoType(industryPlugin.id, ev.type));
    if (!newVideoTitle.trim()) {
      setNewVideoTitle(`${ev.title} - ${student.name}`);
    }
  };

  const handleDeleteVideo = (video: PerformanceVideo) => {
    openConfirmDialog({
      title: '연주 영상 삭제',
      message: `'${video.title}' 영상을 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        StorageService.deletePerformanceVideo(video.id);
        if (previewVideoId === video.id) setPreviewVideoId(null);
        showToast('연주 영상이 삭제되었습니다.', 'info');
      },
    });
  };

  const videoTypeLabel =
    getStudentDetailExtension(industryPlugin.id)?.performanceVideoTypeLabel ||
    DEFAULT_VIDEO_TYPE_LABEL;

  const handleOpenPayModal = (inv: TuitionInvoice) => {
    setPayInvoiceId(inv.id);
    setPayAmount(inv.unpaidAmount);
    setPayMethod('onsite_card');
    setPayMemo('');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId) return;
    try {
      const updated = await TuitionService.recordPayment(payInvoiceId, payAmount, payMethod, payMemo);
      if (!updated) {
        showToast('수납 처리에 실패했습니다.', 'error');
        return;
      }
      showToast(`₩${payAmount.toLocaleString()}원 수납 처리가 완료되었습니다.`, 'success');
      setPayInvoiceId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '수납 처리에 실패했습니다.', 'error');
    }
  };

  const statusBadge = getStudentStatusBadge(student.status);

  const baseTabConfig = getDetailTabConfig({
    enrolledClasses: enrolledClasses.length,
    attRate,
    invoiceCount: allInvoices.length,
    salesCount: studentSales.length,
    consultationCount: allConsultations.length,
    practiceCount: allPractice.length,
    videoCount: allVideos.length,
  });
  const tabConfig = resolveStudentDetailTabs(industryPlugin.id, baseTabConfig, {
    enrolledClasses: enrolledClasses.length,
    attRate,
    invoiceCount: allInvoices.length,
    salesCount: studentSales.length,
    consultationCount: allConsultations.length,
    practiceCount: allPractice.length,
    videoCount: allVideos.length,
  });

  const latestAttendance = [...allAttendance].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  )[0];
  const tuitionStatusLabel =
    billingSummary.tuitionStatus === 'overdue'
      ? '연체'
      : getInvoiceStatusBadge(billingSummary.tuitionStatus).label;
  const monthUnpaid = billingSummary.totalUnpaid || 0;
  const tuitionLabel =
    monthUnpaid > 0
      ? `미납 · ₩${monthUnpaid.toLocaleString()}`
      : billingSummary.tuitionBilled > 0 || billingSummary.textbookBilled > 0
        ? tuitionStatusLabel
        : '청구 없음';

  const guardianSummary = primaryGuardian
    ? primaryGuardian.parentName
    : student.parentName || '미등록';

  const summary = {
    nextClass: getNextClassLabel(enrolledClasses),
    recentAttendance: latestAttendance?.date
      ? `${latestAttendance.date.slice(5)} ${getAttendanceBadge(latestAttendance.status).label}`
      : '기록 없음',
    tuition: tuitionLabel,
    guardian: guardianSummary,
  };

  const openQuickAttendance = () => {
    setCurrentTab('attendance');
    setIsAddAttOpen(true);
  };

  const openQuickConsultation = () => {
    setCurrentTab('consultations');
    setIsAddCstOpen(true);
  };

  const openQuickTuition = () => {
    setCurrentTab('tuition');
  };

  return {
    currentTab,
    setCurrentTab,
    guardianLinkOpen,
    setGuardianLinkOpen,
    attendanceEnabled,
    isAdmin,
    industryPlugin,
    enrolledClasses,
    allAttendance,
    allInvoices,
    allConsultations,
    allPractice,
    allLessons,
    allVideos,
    recitalEvents,
    studentSales,
    billingSummary,
    guardians,
    primaryGuardian,
    totalAttCount,
    presentCount,
    attRate,
    totalPracticeMinutes,
    statusBadge,
    summary,
    tabConfig,
    levelColor: getLevelColor(student.level),
    isSupabaseConfigured: isSupabaseConfigured(),
    onEdit,
    handleWithdraw,
    exitActionLabel,
    openQuickAttendance,
    openQuickConsultation,
    openQuickTuition,
    attendance: {
      isAddAttOpen,
      setIsAddAttOpen,
      newAttDate,
      setNewAttDate,
      newAttStatus,
      setNewAttStatus,
      newAttMemo,
      setNewAttMemo,
      newAttClassId,
      setNewAttClassId,
      attendanceClassOptions,
      onSave: handleSaveAttendance,
    },
    tuition: {
      payInvoiceId,
      setPayInvoiceId,
      payAmount,
      setPayAmount,
      payMethod,
      setPayMethod,
      payMemo,
      setPayMemo,
      onOpenPayModal: handleOpenPayModal,
      onProcessPayment: handleProcessPayment,
    },
    textbooks: {
      isStudentSaleModalOpen,
      setIsStudentSaleModalOpen,
      isStudentTbPaymentModalOpen,
      setIsStudentTbPaymentModalOpen,
      selectedStudentSaleForPay,
      setSelectedStudentSaleForPay,
      isTbReceiptOpen,
      setIsTbReceiptOpen,
      tbReceiptSale,
      setTbReceiptSale,
    },
    consultations: {
      isAddCstOpen,
      setIsAddCstOpen,
      newCstType,
      setNewCstType,
      newCstContent,
      setNewCstContent,
      newCstResult,
      setNewCstResult,
      newCstNextDate,
      setNewCstNextDate,
      onSave: handleSaveConsultation,
    },
    practice: {
      isAddPrOpen,
      setIsAddPrOpen,
      newPrDate,
      setNewPrDate,
      newPrMinutes,
      setNewPrMinutes,
      newPrSong,
      setNewPrSong,
      newPrDifficulty,
      setNewPrDifficulty,
      onSave: handleSavePractice,
    },
    videos: {
      videoTypeLabel,
      isAddVideoOpen,
      setIsAddVideoOpen,
      newVideoTitle,
      setNewVideoTitle,
      newVideoUrl,
      setNewVideoUrl,
      newVideoDate,
      setNewVideoDate,
      newVideoType,
      setNewVideoType,
      newVideoEventId,
      setNewVideoEventId,
      newVideoSong,
      setNewVideoSong,
      newVideoMemo,
      setNewVideoMemo,
      previewVideoId,
      setPreviewVideoId,
      onSave: handleSaveVideo,
      onEventChange: handleVideoEventChange,
      onDelete: handleDeleteVideo,
    },
    triggerRefresh,
  };
}
