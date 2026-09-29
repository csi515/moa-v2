import { useMemo, useState, useEffect, useCallback, type FC, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StudentService } from '@/core/students';
import { StorageService } from '@/services/storage';
import {
  FormField,
  FORM_CONTROL_CLASS,
  Modal,
  SegmentedControl,
} from '@/shared/components';
import {
  findPracticeRoomSlotConflicts,
  formatConflictSummary,
} from '@/core/academy/utils/scheduleConflicts';
import { getPracticeRoomNames } from '@/core/academy/utils/academyRooms';
import { notifyParentPracticeRoomBooked } from '@/core/academy/services/academyAlertService';
import {
  practiceRoomReservationService,
  seoulDateFromIso,
  seoulTimeFromIso,
  toSeoulIso,
  type PracticeRoomRow,
  type RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';
import { removeById, upsertById } from '@/shared/utils/listUpdate';
import { PracticeRoomCalendarPanel } from './PracticeRoomCalendarPanel';
import { PracticeRoomStatusGrid } from '@/core/customer/components/PracticeRoomStatusGrid';
import {
  calendarPeriodLabel,
  rangeForMode,
  shiftCalendarPeriod,
  todayIsoDate,
  type PracticeRoomCalendarMode,
} from './practiceRoomCalendarUtils';
import type { PracticeRoomBooking } from '@/types';

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function toConflictBookings(rows: RoomReservationRow[]): PracticeRoomBooking[] {
  return rows.map((row) => ({
    id: row.id,
    studentId: row.customer_id,
    studentName: row.customers?.name || '',
    room: row.practice_rooms?.name || '',
    date: seoulDateFromIso(row.starts_at),
    startTime: seoulTimeFromIso(row.starts_at),
    endTime: seoulTimeFromIso(row.ends_at),
    createdBy: row.requested_by,
    status: row.status,
    memo: row.memo || undefined,
    createdAt: row.created_at,
  }));
}

const VIEW_OPTIONS: Array<{ value: PracticeRoomCalendarMode; label: string }> = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
];

/**
 * 스태프 연습실 — canonical `room_reservations` + 일/주/월 캘린더.
 */
export const PracticeRoomBookingView: FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [viewMode, setViewMode] = useState<PracticeRoomCalendarMode>('week');
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('16:50');
  const [memo, setMemo] = useState('');
  const [rooms, setRooms] = useState<PracticeRoomRow[]>([]);
  const [bookings, setBookings] = useState<RoomReservationRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RoomReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const settings = StorageService.getSettings();
  const students = useMemo(() => StudentService.getActiveStudents(), []);
  const classes = useMemo(() => StorageService.getClasses(), []);
  const makeups = useMemo(() => StorageService.getMakeupItems(), []);
  const seedRoomNames = useMemo(
    () => getPracticeRoomNames({ settings, classes }),
    [settings, classes]
  );

  const period = useMemo(
    () => rangeForMode(viewMode, selectedDate),
    [viewMode, selectedDate]
  );

  const reload = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      for (const name of seedRoomNames) {
        if (!name.trim()) continue;
        await practiceRoomReservationService.upsertRoom({
          organizationId: orgId,
          name,
        });
      }
      const [roomList, rangeList, pending] = await Promise.all([
        practiceRoomReservationService.listRooms(orgId),
        practiceRoomReservationService.listByRange(orgId, period.start, period.end),
        practiceRoomReservationService.listPending(orgId),
      ]);
      setRooms(roomList.filter((r) => r.is_active));
      setBookings(rangeList);
      setPendingRequests(pending);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : '연습실 데이터를 불러오지 못했습니다.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, period.start, period.end, seedRoomNames, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = (preset?: {
    roomId?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    const lessonMinutes = settings.defaultLessonMinutes || 50;
    const start = preset?.startTime || '16:00';
    setStudentId(students[0]?.id || '');
    setRoomId(preset?.roomId || rooms[0]?.id || '');
    setStartTime(start);
    setEndTime(preset?.endTime || addMinutes(start, lessonMinutes));
    setMemo('');
    setModalOpen(true);
  };

  const persistBooking = async () => {
    if (!orgId) return;
    const student = students.find((s) => s.id === studentId);
    const room = rooms.find((r) => r.id === roomId);
    if (!student || !room) {
      showToast('학생과 연습실을 선택해 주세요.', 'warning');
      return;
    }
    if (endTime <= startTime) {
      showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const reservationId = await practiceRoomReservationService.createStaff({
        organizationId: orgId,
        roomId: room.id,
        customerId: student.id,
        startsAt: toSeoulIso(selectedDate, startTime),
        endsAt: toSeoulIso(selectedDate, endTime),
        memo: memo.trim() || undefined,
      });
      const created: RoomReservationRow = {
        id: reservationId,
        organization_id: orgId,
        room_id: room.id,
        customer_id: student.id,
        requested_by: '',
        starts_at: toSeoulIso(selectedDate, startTime),
        ends_at: toSeoulIso(selectedDate, endTime),
        status: 'approved',
        memo: memo.trim() || undefined,
        practice_rooms: { name: room.name },
        customers: { name: student.name },
      };
      if (selectedDate >= period.start && selectedDate <= period.end) {
        setBookings((prev) => upsertById(prev, created));
      }
      notifyParentPracticeRoomBooked(
        {
          studentId: student.id,
          studentName: student.name,
          room: room.name,
          date: selectedDate,
          startTime,
          endTime,
        },
        student.parentPhone
      );
      showToast(`${student.name} 학생 연습실이 예약되었습니다.`, 'success');
      setModalOpen(false);
      setViewMode('day');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '예약 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === roomId);
    const conflicts = findPracticeRoomSlotConflicts({
      classes,
      makeups,
      bookings: toConflictBookings(bookings),
      candidate: {
        date: selectedDate,
        startTime,
        endTime,
        room: room?.name || '',
      },
    });

    if (conflicts.length > 0) {
      openConfirmDialog({
        title: '일정 충돌',
        message: `반·보강·다른 연습실 예약과 시간이 겹칩니다. 그래도 예약할까요?\n\n${formatConflictSummary(conflicts)}`,
        confirmText: '그래도 예약',
        cancelText: '취소',
        onConfirm: () => {
          void persistBooking();
        },
      });
      return;
    }
    void persistBooking();
  };

  const handleCancel = (row: RoomReservationRow) => {
    const name = row.customers?.name || '학생';
    const roomName = row.practice_rooms?.name || '연습실';
    openConfirmDialog({
      title: '예약 취소',
      message: `${name} · ${roomName} ${seoulTimeFromIso(row.starts_at)}–${seoulTimeFromIso(row.ends_at)} 예약을 취소할까요?`,
      confirmText: '취소하기',
      cancelText: '닫기',
      isDestructive: true,
      onConfirm: () => {
        void practiceRoomReservationService
          .cancel(row.id)
          .then(() => {
            showToast('연습실 예약을 취소했습니다.', 'success');
            setBookings((prev) => removeById(prev, row.id));
            setPendingRequests((prev) => removeById(prev, row.id));
          })
          .catch((err: Error) => showToast(err.message, 'error'));
      },
    });
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const selectedDayBookings = useMemo(
    () => bookings.filter((b) => seoulDateFromIso(b.starts_at) === selectedDate),
    [bookings, selectedDate]
  );

  if (!orgId) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">조직을 선택해 주세요.</p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {pendingRequests.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
          <h3 className="text-xs font-black text-amber-900">학생 예약 승인 대기</h3>
          {pendingRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-amber-100 px-3 py-2"
            >
              <div className="text-xs min-w-0">
                <p className="font-bold text-slate-900">
                  {r.customers?.name || '학생'} · {r.practice_rooms?.name || '연습실'}
                </p>
                <p className="text-slate-500 mt-0.5 font-mono">
                  {seoulDateFromIso(r.starts_at)}{' '}
                  {seoulTimeFromIso(r.starts_at)}–{seoulTimeFromIso(r.ends_at)}
                </p>
                {r.memo && <p className="text-slate-500 mt-0.5">{r.memo}</p>}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                  onClick={() => {
                    void practiceRoomReservationService
                      .review(r.id, true)
                      .then(() => {
                        showToast('예약을 승인했습니다.', 'success');
                        const approved = { ...r, status: 'approved' as const };
                        setPendingRequests((prev) => removeById(prev, r.id));
                        const date = seoulDateFromIso(r.starts_at);
                        if (date >= period.start && date <= period.end) {
                          setBookings((prev) => upsertById(prev, approved));
                        }
                      })
                      .catch((err: Error) => showToast(err.message, 'error'));
                  }}
                >
                  승인
                </button>
                <button
                  type="button"
                  className="min-h-[44px] px-3 rounded-xl text-xs font-bold border border-rose-200 text-rose-600"
                  onClick={() => {
                    void practiceRoomReservationService
                      .review(r.id, false)
                      .then(() => {
                        showToast('예약을 거절했습니다.', 'info');
                        setPendingRequests((prev) => removeById(prev, r.id));
                      })
                      .catch((err: Error) => showToast(err.message, 'error'));
                  }}
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <SegmentedControl
          value={viewMode}
          options={VIEW_OPTIONS}
          onChange={setViewMode}
          aria-label="연습실 캘린더 보기"
          fullWidth
          className="sm:w-auto sm:min-w-[220px]"
        />
        <button
          type="button"
          onClick={() => openCreate()}
          disabled={rooms.length === 0}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shrink-0 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          예약
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => shiftCalendarPeriod(viewMode, d, -1))}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          aria-label="이전"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">
            {calendarPeriodLabel(viewMode, selectedDate)}
          </p>
          <button
            type="button"
            onClick={() => setSelectedDate(todayIsoDate())}
            className="text-[11px] font-bold text-indigo-600 min-h-[32px]"
          >
            오늘
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => shiftCalendarPeriod(viewMode, d, 1))}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          aria-label="다음"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <PracticeRoomCalendarPanel
        mode={viewMode}
        selectedDate={selectedDate}
        bookings={bookings}
        loading={loading}
        onSelectDate={handleSelectDate}
        onCreate={() => openCreate()}
        onCancel={handleCancel}
        canCreate={rooms.length > 0}
      />

      {!loading && (
        <PracticeRoomStatusGrid
          date={selectedDate}
          rooms={rooms}
          bookings={selectedDayBookings}
          onPickFreeSlot={(pick) => {
            setViewMode('day');
            openCreate({
              roomId: pick.roomId,
              startTime: pick.startTime,
              endTime: pick.endTime,
            });
          }}
          onPickBusySlot={handleCancel}
        />
      )}

      {viewMode !== 'day' && !loading && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-800">
              선택일 · {calendarPeriodLabel('day', selectedDate)}
            </h4>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-2"
            >
              일별로 보기
            </button>
          </div>
          {selectedDayBookings.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">이 날 예약이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedDayBookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-slate-900 truncate">
                      {seoulTimeFromIso(b.starts_at)}–{seoulTimeFromIso(b.ends_at)} ·{' '}
                      {b.practice_rooms?.name || '연습실'}
                    </p>
                    <p className="text-slate-500">{b.customers?.name || '학생'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancel(b)}
                    className="shrink-0 min-h-[44px] px-2.5 text-[11px] font-bold text-rose-600"
                  >
                    취소
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`연습실 예약 · ${selectedDate}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5 pb-6">
          <FormField label="학생" required>
            <select
              className={FORM_CONTROL_CLASS}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="연습실" required>
            <select
              className={FORM_CONTROL_CLASS}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            >
              <option value="">선택</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime(addMinutes(e.target.value, settings.defaultLessonMinutes || 50));
                }}
                required
              />
            </FormField>
            <FormField label="종료" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </FormField>
          </div>
          <FormField label="메모">
            <input
              className={FORM_CONTROL_CLASS}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="선택 사항"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] min-h-[48px] rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '예약 저장'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
