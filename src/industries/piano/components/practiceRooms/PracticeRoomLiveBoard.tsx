import { EmptyState } from '@/shared/components';
import { useState, useEffect, useMemo, type FC, type FormEvent } from 'react';
import {
  DoorOpen,
  Clock,
  User,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Music,
  ArrowRight,
  LogOut,
  Timer,
  Wrench,
} from 'lucide-react';
import { PianoRoomTuningModal } from './PianoRoomTuningModal';
import {
  getRoomTuningRecord,
  calculateTuningDDay,
  type RoomTuningRecord,
} from './pianoTuningHelpers';
import { Modal, FormField, FORM_CONTROL_CLASS } from '@/shared/components';
import type {
  PracticeRoomRow,
  RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';
import {
  resolveRoomLiveInfo,
  formatSeoulTime,
  formatSeoulDate,
  calculateSlotRange,
  getBookingDisplayName,
  type RoomLiveInfo,
} from './practiceRoomLiveUtils';
import { addMinutesToClock } from '../../config/pianoLessonMinutes';

export interface PracticeRoomLiveBoardProps {
  rooms: PracticeRoomRow[];
  bookings: RoomReservationRow[];
  students: Array<{ id: string; name: string; phone?: string }>;
  loading?: boolean;
  onCheckIn: (params: {
    roomId: string;
    studentId?: string;
    startTime: string;
    endTime: string;
    memo?: string;
  }) => Promise<void>;
  onCheckout: (reservation: RoomReservationRow) => Promise<void>;
  onExtend?: (reservation: RoomReservationRow, extraMinutes: number) => Promise<void>;
  onReload: () => void;
  onOpenNormalModal?: (preset?: { roomId?: string }) => void;
}

const PRESET_DURATIONS = [30, 40, 50, 60] as const;
const PRESET_MEMOS = ['바이엘/체르니', '작품곡 연습', '콩쿠르 대비', '자유 연습', '레슨 전 대기'];

export const PracticeRoomLiveBoard: FC<PracticeRoomLiveBoardProps> = ({
  rooms,
  bookings,
  students,
  loading = false,
  onCheckIn,
  onCheckout,
  onExtend,
  onReload,
  onOpenNormalModal,
}) => {
  // 1초 단위 타이머 실시간 렌더링
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 퀵 입실 배정 모달 상태
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('14:50');
  const [memo, setMemo] = useState<string>('자유 연습');
  const [submitting, setSubmitting] = useState(false);
  const [tuningModalRecord, setTuningModalRecord] = useState<RoomTuningRecord | null>(null);

  // 각 방의 실시간 점유 상태 매핑
  const roomLiveMap = useMemo(() => {
    const map = new Map<string, RoomLiveInfo>();
    for (const room of rooms) {
      const roomBookings = bookings.filter((b) => b.room_id === room.id);
      map.set(room.id, resolveRoomLiveInfo(now, roomBookings));
    }
    return map;
  }, [rooms, bookings, now]);

  // 통계 집계
  const stats = useMemo(() => {
    const total = rooms.length;
    let occupiedCount = 0;
    let imminentCount = 0;

    for (const room of rooms) {
      const info = roomLiveMap.get(room.id);
      if (info?.state === 'occupied' || info?.state === 'overdue') {
        occupiedCount += 1;
      } else if (info?.state === 'imminent') {
        occupiedCount += 1;
        imminentCount += 1;
      }
    }

    const vacantCount = Math.max(0, total - occupiedCount);
    const utilizationRate = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

    return { total, occupiedCount, vacantCount, imminentCount, utilizationRate };
  }, [rooms, roomLiveMap]);

  // 퀵 입실 모달 오픈
  const handleOpenQuickCheckIn = (roomId: string) => {
    const defaultStudent = students[0]?.id || '';
    const { startTime: curTime, endTime: calcEnd } = calculateSlotRange(now, 50);

    setSelectedRoomId(roomId);
    setSelectedStudentId(defaultStudent);
    setDurationMinutes(50);
    setStartTime(curTime);
    setEndTime(calcEnd);
    setMemo('자유 연습');
    setQuickModalOpen(true);
  };

  // 시간 간편 칩 선택 시 종료 시각 동기화
  const handleSelectDuration = (minutes: number) => {
    setDurationMinutes(minutes);
    setEndTime(addMinutesToClock(startTime, minutes));
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    setEndTime(addMinutesToClock(newStartTime, durationMinutes));
  };

  // 퀵 배정 제출
  const handleQuickCheckInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;

    setSubmitting(true);
    try {
      await onCheckIn({
        roomId: selectedRoomId,
        studentId: selectedStudentId || undefined,
        startTime,
        endTime,
        memo: memo.trim() || undefined,
      });
      setQuickModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // 현재 시각 포맷 (디지털 시계)
  const formattedClock = useMemo(() => {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
  }, [now]);

  const targetRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  return (
    <div className="space-y-4">
      {/* 1. 상단 실시간 통계 및 라이브 인디케이터 배너 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE · 실시간 현황
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {formatSeoulDate(now)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {formattedClock}
              </span>
              <span className="text-xs text-slate-500">기준 원내 룸 가동 상황</span>
            </div>
          </div>

          {/* 통계 메트릭 요약 바 */}
          <div className="flex items-center gap-3 sm:gap-4 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/60">
            <div className="text-center px-2">
              <p className="text-[11px] font-semibold text-slate-500">전체 연습실</p>
              <p className="text-base font-black text-slate-900">{stats.total}실</p>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-center px-2">
              <p className="text-[11px] font-semibold text-indigo-600">이용 중</p>
              <p className="text-base font-black text-indigo-600">
                {stats.occupiedCount}실
              </p>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-center px-2">
              <p className="text-[11px] font-semibold text-emerald-600">비어 있음</p>
              <p className="text-base font-black text-emerald-600">
                {stats.vacantCount}실
              </p>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-center px-2">
              <p className="text-[11px] font-semibold text-slate-500">가동률</p>
              <p className="text-base font-black text-slate-800">
                {stats.utilizationRate}%
              </p>
            </div>

            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              title="새로고침"
              className="ml-1 p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. 연습실 카드 그리드 */}
      {rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="w-12 h-12 text-slate-300" />}
          title="등록된 연습실 공간이 없습니다"
          description="학원 설정 또는 공간 관리에서 연습실을 먼저 추가해 주세요."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const info = roomLiveMap.get(room.id) || {
              state: 'vacant' as const,
              remainingMinutes: 0,
              elapsedMinutes: 0,
              totalMinutes: 0,
              progressPercent: 0,
            };

            const isOccupied =
              info.state === 'occupied' ||
              info.state === 'imminent' ||
              info.state === 'overdue';
            const isImminent = info.state === 'imminent';
            const isOverdue = info.state === 'overdue';

            return (
              <div
                key={room.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  isImminent
                    ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/40'
                    : isOverdue
                    ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-400/40'
                    : isOccupied
                    ? 'bg-white border-indigo-200 ring-1 ring-indigo-100'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* 상단 룸 카드 헤더 */}
                <div className="p-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`p-1.5 rounded-lg ${
                          isOccupied
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <DoorOpen className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {room.name}
                      </h4>
                      {(() => {
                        const tuningRecord = getRoomTuningRecord(room.id, room.name);
                        const tuning = calculateTuningDDay(tuningRecord.lastTunedAt, tuningRecord.tuningCycleMonths);
                        const hasIssue = Boolean(tuningRecord.issueNotes?.trim());
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTuningModalRecord(tuningRecord);
                            }}
                            title="피아노 조율 및 건반 상태 점검"
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                              hasIssue
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold animate-pulse'
                                : tuning.status === 'overdue'
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            <Wrench className="w-2.5 h-2.5" />
                            <span>{hasIssue ? '⚠️이상' : `조율 D-${Math.max(0, tuning.daysRemaining)}`}</span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* 상태 배지 */}
                    {isImminent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        마감 {info.remainingMinutes}분 전
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                        <Timer className="w-3 h-3 text-rose-600" />
                        초과 {Math.abs(info.remainingMinutes)}분
                      </span>
                    ) : isOccupied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        연습 중
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        비어 있음
                      </span>
                    )}
                  </div>
                </div>

                {/* 본문 영역 */}
                <div className="p-4 pt-3 flex-1 flex flex-col justify-center">
                  {isOccupied && info.currentReservation ? (
                    <div className="space-y-3">
                      {/* 학생 정보 & 메모 */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-black text-slate-900 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-indigo-600" />
                            {getBookingDisplayName(info.currentReservation)}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {info.currentReservation.memo || '자유 연습'}
                          </p>
                        </div>

                        {/* 남은 시간 큰 글씨 */}
                        <div className="text-right">
                          <p
                            className={`text-lg font-black font-mono tracking-tight ${
                              isImminent
                                ? 'text-amber-600'
                                : isOverdue
                                ? 'text-rose-600'
                                : 'text-indigo-600'
                            }`}
                          >
                            {isOverdue
                              ? `+${Math.abs(info.remainingMinutes)}분`
                              : `${info.remainingMinutes}분`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {isOverdue ? '초과됨' : '남은 시간'}
                          </p>
                        </div>
                      </div>

                      {/* 실시간 프로그레스 바 게이지 */}
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isImminent
                                ? 'bg-amber-500'
                                : isOverdue
                                ? 'bg-rose-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${info.progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>
                            {info.currentReservation.starts_at.slice(11, 16)} 시작
                          </span>
                          <span>
                            {info.currentReservation.ends_at.slice(11, 16)} 종료 (
                            {info.totalMinutes}분)
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 공실일 때 */
                    <div className="text-center py-4 space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          즉시 이용 가능
                        </p>
                        {info.nextReservation ? (
                          <p className="text-[11px] text-amber-700 font-medium mt-1">
                            다음 예약: {info.nextReservation.starts_at.slice(11, 16)}{' '}
                            ({getBookingDisplayName(info.nextReservation)})
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            예정된 예약 없음
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단 카드 액션 버튼 영역 */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
                  {isOccupied && info.currentReservation ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (info.currentReservation) {
                            void onCheckout(info.currentReservation);
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-500" />
                        <span>퇴실 완료</span>
                      </button>

                      {onExtend && (
                        <button
                          type="button"
                          onClick={() => {
                            if (info.currentReservation) {
                              void onExtend(info.currentReservation, 10);
                            }
                          }}
                          title="10분 연장"
                          className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-indigo-50 border border-indigo-200/60 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+10분</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenQuickCheckIn(room.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>원생 즉시 배정</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 1초 퀵 입실 배정 모달 */}
      <Modal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        title={`연습실 즉시 배정 · ${targetRoom?.name || '공간'}`}
        maxWidth="md"
      >
        <form onSubmit={handleQuickCheckInSubmit} className="space-y-4 p-5 pb-6">
          {/* 연습실 이름 표시 */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-950">
                {targetRoom?.name}
              </span>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200/50">
              즉시 입실
            </span>
          </div>

          {/* 원생 선택 */}
          <FormField label="원생 선택" required>
            <select
              className={FORM_CONTROL_CLASS}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
            >
              <option value="">원생을 선택하세요</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || '연락처 없음'})
                </option>
              ))}
            </select>
          </FormField>

          {/* 연습 시간 원터치 칩 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">연습 시간 (분)</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => handleSelectDuration(minutes)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    durationMinutes === minutes
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {minutes}분
                </button>
              ))}
            </div>
          </div>

          {/* 시간 직접 조정 (시작 / 종료) */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작 시각" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </FormField>
            <FormField label="종료 시각" required>
              <input
                type="time"
                className={FORM_CONTROL_CLASS}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* 연습 메모 / 목적 퀵 칩 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">연습 목적 / 메모</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_MEMOS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMemo(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    memo === preset
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              className={FORM_CONTROL_CLASS}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="직접 입력할 수 있습니다"
            />
          </div>

          {/* 하단 확인 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickModalOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedRoomId || !selectedStudentId}
              className="flex-[1.4] min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                '배정 중...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>즉시 입실 배정 완료</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 피아노 조율 주기 및 건반 이상 메모 모달 */}
      {tuningModalRecord && (
        <PianoRoomTuningModal
          isOpen={Boolean(tuningModalRecord)}
          onClose={() => setTuningModalRecord(null)}
          record={tuningModalRecord}
          onSaved={() => {
            setTuningModalRecord(null);
            onReload();
          }}
        />
      )}
    </div>
  );
};
