import { useMemo, useState, useEffect, useCallback, type FC, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, DoorOpen, Calendar as CalendarIcon } from 'lucide-react';
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
} from '@/capabilities/scheduling';
import { getPracticeRoomNames } from '@/core/organizations/utils/academyRooms';
import { notifyParentPracticeRoomBooked } from '@/capabilities/booking';
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
import {
  calendarPeriodLabel,
  rangeForMode,
  shiftCalendarPeriod,
  todayIsoDate,
  type PracticeRoomCalendarMode,
} from './practiceRoomCalendarUtils';
import {
  addMinutesToClock,
  PIANO_DEFAULT_LESSON_MINUTES,
  resolvePianoLessonMinutes,
} from '../../config/pianoLessonMinutes';
import type { PracticeRoomBooking } from '@/types';

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
  { value: 'month', label: '월간 (Month)' },
  { value: 'week', label: '주간 (Week)' },
  { value: 'day', label: '일간 (Day)' },
];

/**
 * 연습실 예약 뷰어 — 공간 점유 현황 중심의 월/주/일 타임라인 캘린더.
 * 불필요한 인원별 체크/명단 관리를 제거하고 슬롯 기반 예약에 집중.
 */
export const PracticeRoomBookingView: FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  // 1. 상태와 URL 동기화 (?view=week&date=YYYY-MM-DD)
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as PracticeRoomCalendarMode | null;
  const viewMode: PracticeRoomCalendarMode =
    viewParam === 'month' || viewParam === 'week' || viewParam === 'day'
      ? viewParam
      : 'week';

  const dateParam = searchParams.get('date');
  const selectedDate = dateParam || todayIsoDate();

  const updateUrlParams = useCallback(
    (patch: { view?: PracticeRoomCalendarMode; date?: string }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.view) next.set('view', patch.view);
          if (patch.date) next.set('date', patch.date);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleViewChange = (mode: PracticeRoomCalendarMode) => {
    updateUrlParams({ view: mode });
  };

  const handleSelectDate = (date: string) => {
    updateUrlParams({ date });
  };

  // 2. 예약 데이터 및 룸 목록 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState(() =>
    addMinutesToClock('14:00', PIANO_DEFAULT_LESSON_MINUTES)
  );
  const [memo, setMemo] = useState('');
  const [rooms, setRooms] = useState<PracticeRoomRow[]>([]);
  const [bookings, setBookings] = useState<RoomReservationRow[]>([]);
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
      const [roomList, rangeList] = await Promise.all([
        practiceRoomReservationService.listRooms(orgId),
        practiceRoomReservationService.listByRange(orgId, period.start, period.end),
      ]);
      setRooms(roomList.filter((r) => r.is_active));
      setBookings(rangeList);
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

  // 빈 타임 슬롯 클릭 시 호출되는 간이 예약 모달 오픈
  const openCreateModal = (preset?: {
    roomId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    const lessonMinutes = resolvePianoLessonMinutes(settings.defaultLessonMinutes);
    const start = preset?.startTime || '14:00';
    if (preset?.date) {
      handleSelectDate(preset.date);
    }
    setStudentId(students[0]?.id || '');
    setRoomId(preset?.roomId || rooms[0]?.id || '');
    setStartTime(start);
    setEndTime(preset?.endTime || addMinutesToClock(start, lessonMinutes));
    setMemo('');
    setModalOpen(true);
  };

  const persistBooking = async () => {
    if (!orgId) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      showToast('연습실을 선택해 주세요.', 'warning');
      return;
    }
    if (endTime <= startTime) {
      showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'warning');
      return;
    }

    const student = students.find((s) => s.id === studentId);

    setSaving(true);
    try {
      const reservationId = await practiceRoomReservationService.createStaff({
        organizationId: orgId,
        roomId: room.id,
        customerId: student?.id,
        startsAt: toSeoulIso(selectedDate, startTime),
        endsAt: toSeoulIso(selectedDate, endTime),
        memo: memo.trim() || undefined,
      });

      const created: RoomReservationRow = {
        id: reservationId,
        organization_id: orgId,
        room_id: room.id,
        customer_id: student?.id || '',
        requested_by: '',
        starts_at: toSeoulIso(selectedDate, startTime),
        ends_at: toSeoulIso(selectedDate, endTime),
        status: 'approved',
        memo: memo.trim() || undefined,
        practice_rooms: { name: room.name },
        customers: student ? { name: student.name } : null,
      };

      if (selectedDate >= period.start && selectedDate <= period.end) {
        setBookings((prev) => upsertById(prev, created));
      }

      if (student) {
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
      }

      showToast(
        `${room.name} (${startTime}~${endTime}) 연습실 예약이 완료되었습니다.`,
        'success'
      );
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '예약 저장 실패', 'error');
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
        title: '일정 충돌 경고',
        message: `다른 수업 또는 예약과 시간이 겹칩니다. 그래도 예약하시겠습니까?\n\n${formatConflictSummary(
          conflicts
        )}`,
        confirmText: '그래도 예약 진행',
        cancelText: '취소',
        onConfirm: () => {
          void persistBooking();
        },
      });
      return;
    }
    void persistBooking();
  };

  const handleCancelBooking = (row: RoomReservationRow) => {
    const roomName = row.practice_rooms?.name || '연습실';
    const userName = row.customers?.name || row.memo || '예약';
    openConfirmDialog({
      title: '연습실 예약 취소',
      message: `${roomName} (${seoulTimeFromIso(row.starts_at)} ~ ${seoulTimeFromIso(
        row.ends_at
      )})\n[${userName}] 예약을 취소하시겠습니까?`,
      confirmText: '예약 취소',
      cancelText: '닫기',
      isDestructive: true,
      onConfirm: () => {
        void practiceRoomReservationService
          .cancel(row.id)
          .then(() => {
            showToast('연습실 예약이 취소되었습니다.', 'success');
            setBookings((prev) => removeById(prev, row.id));
          })
          .catch((err: Error) => showToast(err.message, 'error'));
      },
    });
  };

  if (!orgId) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">조직을 선택해 주세요.</p>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 상단 컨트롤 바: 월/주/일 뷰 전환 + 신규 예약 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <DoorOpen className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              연습실 공간 예약 캘린더
            </h2>
            <p className="text-xs text-slate-500">
              월/주/일 타임라인으로 공간 점유 및 공실 현황을 한눈에 파악합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <SegmentedControl
            value={viewMode}
            options={VIEW_OPTIONS}
            onChange={handleViewChange}
            aria-label="연습실 캘린더 뷰 전환"
            className="shadow-2xs"
          />

          <button
            type="button"
            onClick={() => openCreateModal()}
            disabled={rooms.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>예약 등록</span>
          </button>
        </div>
      </div>

      {/* 날짜 네비게이션 헤더 */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2 shadow-xs">
        <button
          type="button"
          onClick={() =>
            handleSelectDate(shiftCalendarPeriod(viewMode, selectedDate, -1))
          }
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="이전 기간"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0 flex items-center gap-3">
          <p className="text-sm sm:text-base font-black text-slate-900 truncate">
            {calendarPeriodLabel(viewMode, selectedDate)}
          </p>
          <button
            type="button"
            onClick={() => handleSelectDate(todayIsoDate())}
            className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
          >
            오늘
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            handleSelectDate(shiftCalendarPeriod(viewMode, selectedDate, 1))
          }
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="다음 기간"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 월간 / 주간 / 일간 멀티 뷰 캘린더 본문 */}
      <PracticeRoomCalendarPanel
        mode={viewMode}
        selectedDate={selectedDate}
        rooms={rooms}
        bookings={bookings}
        loading={loading}
        onSelectDate={handleSelectDate}
        onSelectSlot={openCreateModal}
        onCancelBooking={handleCancelBooking}
        canCreate={rooms.length > 0}
      />

      {/* 간이 연습실 예약 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`연습실 간이 예약 · ${selectedDate}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5 pb-6">
          <FormField label="연습실 (공간)" required>
            <select
              className={FORM_CONTROL_CLASS}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            >
              <option value="">연습실 선택</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작 시간" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime(
                    addMinutesToClock(
                      e.target.value,
                      resolvePianoLessonMinutes(settings.defaultLessonMinutes)
                    )
                  );
                }}
                required
              />
            </FormField>
            <FormField label="종료 시간" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="예약 내용 / 사용 목적" required>
            <input
              type="text"
              className={FORM_CONTROL_CLASS}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 입시생 개인 연습, 반주 연습 등"
              required
            />
          </FormField>

          <FormField label="원생 연결 (선택 사항)">
            <select
              className={FORM_CONTROL_CLASS}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">원생 미지정 (공실 점유만 등록)</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || '연락처 없음'})
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? '예약 저장 중...' : '예약 등록 완료'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
