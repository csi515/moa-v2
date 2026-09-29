import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { notifyParentAbsence } from '@/core/academy/services/academyAlertService';
import { isAttendanceModuleEnabled } from '@/capabilities/attendance';
import type { Student } from '@/types';
import { usePianoExpectedDay } from './usePianoExpectedDay';
import {
  DAY_ATTENDANCE_CLASS_ID,
  DAY_ATTENDANCE_CLASS_NAME,
  STATUS_META,
  countDayStatuses,
  persistDayAttendance,
  resolveDayStatus,
  todayIsoLocal,
  type DayStatus,
  type ExpectedStudentOnDate,
  type StatusFilter,
} from './pianoAttendanceHelpers';

function attendanceListRank(st: DayStatus): number {
  if (st === 'unchecked') return 0;
  if (st === 'late') return 1;
  if (st === 'present') return 2;
  return 3;
}

/**
 * 출결 화면 — UI 필터/검색 + 당일 기록 저장.
 * 예정·맵 조회는 usePianoExpectedDay에 위임.
 */
export function usePianoAttendanceView() {
  const {
    currentUser,
    showToast,
    setActiveTab,
    setSelectedStudentId,
    openConfirmDialog,
    triggerRefresh,
  } = useApp();
  const pinEnabled = isAttendanceModuleEnabled(StorageService.getSettings(), 'piano');

  /** UI 상태 */
  const [selectedDate, setSelectedDate] = useState(todayIsoLocal);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [absentTarget, setAbsentTarget] = useState<Student | null>(null);

  /** 서버/스토리지 파생 */
  const { students, expected, dayRecordMap, pinCheckInIds } =
    usePianoExpectedDay(selectedDate);

  const expectedById = useMemo(() => {
    const map = new Map(expected.map((row) => [row.student.id, row]));
    return map;
  }, [expected]);

  /** 예정 학생 + (일정 변경 후에도) 당일 출결/PIN이 남은 학생 */
  const roster = useMemo(() => {
    const byId = new Map<string, ExpectedStudentOnDate>(
      expected.map((row) => [row.student.id, row])
    );
    for (const student of students) {
      if (byId.has(student.id)) continue;
      const hasRecord = dayRecordMap.has(student.id);
      const hasPin = pinCheckInIds.has(student.id);
      if (!hasRecord && !hasPin) continue;
      byId.set(student.id, {
        student,
        classes: [],
        earliestStart: '99:99',
      });
    }
    return Array.from(byId.values()).sort((a, b) => {
      const t = a.earliestStart.localeCompare(b.earliestStart);
      if (t !== 0) return t;
      return a.student.name.localeCompare(b.student.name, 'ko');
    });
  }, [expected, students, dayRecordMap, pinCheckInIds]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster
      .filter((row) => !q || row.student.name.toLowerCase().includes(q))
      .map((row) => {
        const record = dayRecordMap.get(row.student.id);
        const status = resolveDayStatus(record, pinCheckInIds.has(row.student.id));
        const scheduleTime =
          row.earliestStart && row.earliestStart !== '99:99' ? row.earliestStart : '';
        const classNames = row.classes
          .map((c) => c.name?.trim())
          .filter(Boolean)
          .join(' · ');
        return {
          student: row.student,
          record,
          status,
          scheduleTime,
          scheduleDetail: classNames,
          scheduleSort: scheduleTime || '99:99',
          fromSchedule: expectedById.has(row.student.id),
        };
      })
      .filter((row) => statusFilter === 'ALL' || row.status === statusFilter)
      .sort((a, b) => {
        const d = attendanceListRank(a.status) - attendanceListRank(b.status);
        if (d !== 0) return d;
        const t = a.scheduleSort.localeCompare(b.scheduleSort);
        if (t !== 0) return t;
        return a.student.name.localeCompare(b.student.name, 'ko');
      });
  }, [roster, searchQuery, dayRecordMap, pinCheckInIds, statusFilter, expectedById]);

  const stats = useMemo(() => {
    const counted = countDayStatuses(
      roster.map((row) =>
        resolveDayStatus(dayRecordMap.get(row.student.id), pinCheckInIds.has(row.student.id))
      )
    );
    return { ...counted, expected: expected.length };
  }, [roster, expected.length, dayRecordMap, pinCheckInIds]);

  const persistStatus = async (
    student: Student,
    status: Exclude<DayStatus, 'unchecked'>,
    memo?: string
  ) => {
    const existing = dayRecordMap.get(student.id);
    const result = await persistDayAttendance({
      student,
      date: selectedDate,
      status,
      createdBy: currentUser.name,
      existing: existing || null,
      memo,
    });
    if (result.ok === false) {
      showToast(result.warning, 'warning');
      return false;
    }

    if (status === 'absent') {
      notifyParentAbsence({
        studentId: student.id,
        studentName: student.name,
        parentPhone: student.parentPhone,
        className: DAY_ATTENDANCE_CLASS_NAME,
        classId: DAY_ATTENDANCE_CLASS_ID,
        date: selectedDate,
        reason: memo?.trim() || undefined,
        previousStatus: existing?.status,
      });
    }

    triggerRefresh();
    return true;
  };

  const handleSetStatus = async (student: Student, status: Exclude<DayStatus, 'unchecked'>) => {
    if (status === 'absent') {
      setAbsentTarget(student);
      return;
    }
    if (!(await persistStatus(student, status))) return;
    showToast(`${student.name} 학생 ${STATUS_META[status].label} 처리되었습니다.`, 'success');
  };

  const handleAbsentConfirm = async (reason: string) => {
    if (!absentTarget) return;
    const student = absentTarget;
    setAbsentTarget(null);
    if (!(await persistStatus(student, 'absent', reason))) return;
    showToast(`${student.name} 학생 결석 처리되었습니다.`, 'success');
    openConfirmDialog({
      title: '보강 일정',
      message: `${student.name} 학생 결석이 저장되었습니다. 지금 보강 일정을 잡을까요?`,
      confirmText: '보강 일정 잡기',
      cancelText: '나중에',
      onConfirm: () => setActiveTab('makeups'),
    });
  };

  const openStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('students');
  };

  return {
    pinEnabled,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    absentTarget,
    setAbsentTarget,
    pinCheckInIds,
    expectedCount: expected.length,
    rosterCount: roster.length,
    rows,
    stats,
    isToday: selectedDate === todayIsoLocal(),
    handleSetStatus,
    handleAbsentConfirm,
    openStudent,
    goPinCheckIn: () => setActiveTab('check-in'),
  };
}
