import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh, useStudentNavigation, useStaffScope } from '@/hooks';
import { StorageService } from '@/services/storage';
import { MakeupItem, MakeupStatus } from '@/types';
import {
  EmptyState,
  FilterBar,
  FilterTabs,
  FormField,
  FORM_CONTROL_CLASS,
  Modal,
  PageHeader,
  SummaryMetricCard,
  type FilterTabItem,
} from '@/shared/components';
import { formatPhone } from '@/utils/formatters';
import {
  findMakeupSlotConflicts,
  formatConflictSummary,
} from '@/core/academy/utils/scheduleConflicts';
import { notifyParentMakeupScheduled } from '@/core/academy/services/academyAlertService';
import { scheduleMakeupAtomic } from '@/core/schedules/makeupScheduleAtomic';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { getAcademyRoomNames } from '@/core/academy/utils/academyRooms';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
} from 'lucide-react';

const STATUS_TABS: FilterTabItem<MakeupStatus | 'all'>[] = [
  { id: 'pending', label: '미보강' },
  { id: 'scheduled', label: '예약됨' },
  { id: 'completed', label: '완료' },
  { id: 'all', label: '전체' },
];

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export const MakeupManagementView: React.FC = () => {
  const { showToast } = useApp();
  const { openStudent } = useStudentNavigation();
  const refreshKey = useStorageRefresh();
  const { scopeMakeupItems } = useStaffScope();

  const [statusFilter, setStatusFilter] = useState<MakeupStatus | 'all'>('pending');
  const [scheduleTarget, setScheduleTarget] = useState<MakeupItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayIsoLocal);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('16:50');
  const [room, setRoom] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const allStudents = StorageService.getStudents();
  const teachers = StorageService.getTeachers().filter((t) => t.status === 'active');
  const classes = StorageService.getClasses();
  const rooms = useMemo(
    () =>
      getAcademyRoomNames({
        settings: StorageService.getSettings(),
        classes,
      }),
    [classes, refreshKey]
  );

  const allItems = useMemo(
    () => scopeMakeupItems(StorageService.getMakeupItems(), allStudents),
    [allStudents, scopeMakeupItems, refreshKey]
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return allItems;
    return allItems.filter((m) => m.status === statusFilter);
  }, [allItems, statusFilter, refreshKey]);

  const counts = useMemo(
    () => ({
      pending: allItems.filter((m) => m.status === 'pending').length,
      scheduled: allItems.filter((m) => m.status === 'scheduled').length,
      completed: allItems.filter((m) => m.status === 'completed').length,
    }),
    [allItems, refreshKey]
  );

  const statusTabsWithCounts = STATUS_TABS.map((tab) =>
    tab.id !== 'all' ? { ...tab, count: counts[tab.id as MakeupStatus] } : tab
  );

  const openSchedule = (item: MakeupItem) => {
    const origin = classes.find((c) => c.id === item.classId);
    const lessonMinutes = StorageService.getSettings().defaultLessonMinutes || 50;
    const start = item.makeUpStartTime || origin?.startTime || '16:00';
    setScheduleTarget(item);
    setScheduleDate(item.makeUpDate || todayIsoLocal());
    setStartTime(start);
    setEndTime(item.makeUpEndTime || origin?.endTime || addMinutes(start, lessonMinutes));
    setRoom(item.makeUpRoom || origin?.room || rooms[0] || '');
    setTeacherId(item.makeUpTeacherId || origin?.teacherId || teachers[0]?.id || '');
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTarget) return;
    if (!startTime || !endTime) {
      showToast('보강 시작·종료 시간을 입력해 주세요.', 'warning');
      return;
    }

    const teacher = teachers.find((t) => t.id === teacherId);
    const conflicts = findMakeupSlotConflicts({
      classes,
      makeups: allItems,
      candidate: {
        date: scheduleDate,
        startTime,
        endTime,
        teacherId: teacherId || undefined,
        room: room || undefined,
        excludeAttendanceId: scheduleTarget.attendanceId,
      },
    });

    if (conflicts.length > 0) {
      showToast(formatConflictSummary(conflicts) || '일정이 겹칩니다.', 'warning');
      return;
    }

    void (async () => {
      const result = await scheduleMakeupAtomic({
        attendanceId: scheduleTarget.attendanceId,
        makeup: {
          date: scheduleDate,
          startTime,
          endTime,
          room,
          teacherId: teacher?.id,
          teacherName: teacher?.name,
        },
      });
      if (!result.ok) {
        showToast(result.warning || '보강 일정 등록에 실패했습니다.', 'warning');
        return;
      }

      const refreshed = StorageService.getMakeupItems().find(
        (m) => m.attendanceId === scheduleTarget.attendanceId
      );
      if (refreshed) notifyParentMakeupScheduled(refreshed);

      showToast(`${scheduleTarget.studentName} 학생 보강 일정이 등록되었습니다.`, 'success');
      setScheduleTarget(null);
    })();
  };

  const handleComplete = (item: MakeupItem) => {
    StorageService.completeMakeup(item.attendanceId);
    showToast(`${item.studentName} 학생 보강이 완료 처리되었습니다.`, 'success');
  };

  const statusLabel: Record<MakeupStatus, string> = {
    pending: '미보강',
    scheduled: '예약됨',
    completed: '완료',
  };

  const statusColor: Record<MakeupStatus, string> = {
    pending: 'bg-rose-100 text-rose-700',
    scheduled: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  const formatSlot = (item: MakeupItem) => {
    if (!item.makeUpDate) return null;
    const time =
      item.makeUpStartTime && item.makeUpEndTime
        ? ` ${item.makeUpStartTime}–${item.makeUpEndTime}`
        : '';
    const extras = [item.makeUpRoom, item.makeUpTeacherName].filter(Boolean).join(' · ');
    return `${item.makeUpDate}${time}${extras ? ` · ${extras}` : ''}`;
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Sparkles className="w-6 h-6" />}
        iconClassName="text-purple-600"
        title="보강 일정"
        description="결석 후 보강 가능 시간을 정해 일정을 등록합니다"
      />

      <div className="grid grid-cols-3 gap-3">
        <SummaryMetricCard label="미보강" value={`${counts.pending}건`} variant="rose" />
        <SummaryMetricCard label="예약됨" value={`${counts.scheduled}건`} variant="amber" />
        <SummaryMetricCard label="완료" value={`${counts.completed}건`} variant="emerald" />
      </div>

      <FilterBar>
        <FilterTabs
          tabs={statusTabsWithCounts}
          active={statusFilter}
          onChange={setStatusFilter}
          activeClassName="bg-purple-600 text-white"
          inactiveClassName="bg-slate-100 text-slate-600"
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-10 h-10" />}
          title={statusFilter === 'pending' ? '미보강 건이 없습니다' : '해당 보강 내역이 없습니다'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.attendanceId}
              className={`rounded-2xl border shadow-xs p-4 sm:p-5 ${
                item.status === 'pending'
                  ? 'bg-white border-rose-100'
                  : item.status === 'scheduled'
                    ? 'bg-white border-amber-100'
                    : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openStudent(item.studentId)}
                      className="font-bold text-slate-900 hover:text-indigo-600 text-sm min-h-[44px]"
                    >
                      {item.studentName}
                    </button>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor[item.status]}`}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.className} · 결석일 {item.originalDate}
                    {item.absentReason && ` · ${item.absentReason}`}
                  </p>
                  {formatSlot(item) && (
                    <p className="text-xs text-purple-800 font-semibold mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2 py-1">
                      <Calendar className="w-3.5 h-3.5" />
                      보강: {formatSlot(item)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {item.parentPhone && (
                    <a
                      href={`tel:${item.parentPhone}`}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600"
                      title={formatPhone(item.parentPhone)}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {(item.status === 'pending' || item.status === 'scheduled') && (
                    <button
                      type="button"
                      onClick={() => openSchedule(item)}
                      className="px-3.5 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {item.status === 'scheduled' ? '일정 수정' : '일정 등록'}
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'scheduled') && (
                    <button
                      type="button"
                      onClick={() => handleComplete(item)}
                      className="px-3.5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      보강 완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(scheduleTarget)}
        onClose={() => setScheduleTarget(null)}
        title="보강 일정 등록"
        maxWidth="md"
      >
        <form onSubmit={handleSchedule} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{scheduleTarget?.studentName}</strong> · 결석일 {scheduleTarget?.originalDate}
          </p>
          <FormField label="보강 예정일" required>
            <input
              type="date"
              required
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작" required>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  const mins = StorageService.getSettings().defaultLessonMinutes || 50;
                  setEndTime(addMinutes(e.target.value, mins));
                }}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
            <FormField label="종료" required>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
          </div>
          <FormField label="연습실">
            {rooms.length === 0 ? (
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="학원 설정에서 실을 등록하거나 직접 입력"
                className={FORM_CONTROL_CLASS}
              />
            ) : (
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className={FORM_CONTROL_CLASS}
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="담당 선생님">
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className={FORM_CONTROL_CLASS}
            >
              <option value="">선택</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
          <button
            type="submit"
            className="w-full min-h-[44px] py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            등록
          </button>
        </form>
      </Modal>
    </div>
  );
};
