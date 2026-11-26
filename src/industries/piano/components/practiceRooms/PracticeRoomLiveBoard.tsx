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

  // 현재 시각 포맷 (디지털 시계 - 분 단위)
  const formattedClock = useMemo(() => {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  }, [now]);

  const targetRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  return (
    <div className="space-y-3">
      {/* 1. 슬림 인라인 현황 바: 전체 N실 · 이용 중 N실 · 비어 있음 N실 · 가동률 N% + 실시간 기준 시각 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-slate-100/70 border border-slate-200/80 rounded-lg text-xs">
        <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            실시간 현황
          </span>
          <span className="text-slate-300">·</span>
          <span>전체 <strong className="text-slate-900 tabular-nums">{stats.total}</strong>실</span>
          <span className="text-slate-300">·</span>
          <span className="text-blue-700">이용 중 <strong className="tabular-nums font-semibold">{stats.occupiedCount}</strong>실</span>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-700">비어 있음 <strong className="tabular-nums font-semibold">{stats.vacantCount}</strong>실</span>
          <span className="text-slate-300">·</span>
          <span>가동률 <strong className="text-slate-900 tabular-nums">{stats.utilizationRate}%</strong></span>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-slate-500 text-[11px]">
          <span className="font-mono tabular-nums text-slate-600 font-medium">
            {formattedClock} 기준
          </span>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            title="현황 새로고침"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 2. 공간 카드 그리드 (로딩 스켈레톤 분기 -> 깜빡임 완전 방지) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 animate-pulse shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded-md" />
              </div>
              <div className="h-2.5 w-16 bg-slate-100 rounded" />
              <div className="py-6 flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-8 bg-slate-50 rounded-lg border border-slate-100" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="w-8 h-8 text-slate-400" strokeWidth={1.5} />}
          title="등록된 공간이 없습니다"
          description="설정 > 공간 관리에서 강의실 또는 연습실을 추가해 주세요."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                className={`relative flex flex-col justify-between rounded-lg border transition-colors overflow-hidden bg-white shadow-2xs ${
                  isImminent
                    ? 'border-amber-300 bg-amber-50/20'
                    : isOverdue
                    ? 'border-rose-300 bg-rose-50/20'
                    : isOccupied
                    ? 'border-blue-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* 상단 룸 카드 헤더 */}
                <div className="p-3.5 pb-2.5 border-b border-slate-100">
                  {/* 1행: 방 이름 (절대 잘리지 않음) + 상태 배지 (줄바꿈 방지) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <DoorOpen
                        className={`w-4 h-4 shrink-0 ${
                          isOccupied ? 'text-blue-600' : 'text-slate-400'
                        }`}
                        strokeWidth={1.5}
                      />
                      <h4 className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {room.name}
                      </h4>
                    </div>

                    {/* 상태 배지: whitespace-nowrap 및 shrink-0 고정 */}
                    {isImminent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" strokeWidth={1.5} />
                        <span>마감 {info.remainingMinutes}분 전</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap shrink-0">
                        <Timer className="w-3 h-3 text-rose-600 shrink-0" strokeWidth={1.5} />
                        <span>초과 {Math.abs(info.remainingMinutes)}분</span>
                      </span>
                    ) : isOccupied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" strokeWidth={1.5} />
                        <span>사용 중</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={1.5} />
                        <span>비어 있음</span>
                      </span>
                    )}
                  </div>

                  {/* 2행: 방 이름 아래 서브 텍스트 줄 (설비/점검 태그 등) */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1 ${
                            hasIssue
                              ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold animate-pulse'
                              : tuning.status === 'overdue'
                              ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Wrench className="w-2.5 h-2.5 text-slate-400" strokeWidth={1.5} />
                          <span>{hasIssue ? '⚠️ 점검 필요' : `조율 D-${Math.max(0, tuning.daysRemaining)}`}</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* 본문 영역 */}
                <div className="p-3.5 pt-3 flex-1 flex flex-col justify-center">
                  {isOccupied && info.currentReservation ? (
                    <div className="space-y-2.5">
                      {/* 이용자 정보 & 메모 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{getBookingDisplayName(info.currentReservation)}</span>
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {info.currentReservation.memo || '자유 연습'}
                          </p>
                        </div>

                        {/* 남은 시간 */}
                        <div className="text-right shrink-0">
                          <p
                            className={`text-base font-bold font-mono tabular-nums tracking-tight ${
                              isImminent
                                ? 'text-amber-700'
                                : isOverdue
                                ? 'text-rose-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {isOverdue
                              ? `+${Math.abs(info.remainingMinutes)}분`
                              : `${info.remainingMinutes}분`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isOverdue ? '초과됨' : '남은 시간'}
                          </p>
                        </div>
                      </div>

                      {/* 실시간 프로그레스 바 게이지 */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isImminent
                                ? 'bg-amber-500'
                                : isOverdue
                                ? 'bg-rose-500'
                                : 'bg-slate-800'
                            }`}
                            style={{ width: `${Math.min(100, info.progressPercent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                          <span>
                            {info.currentReservation.starts_at.slice(11, 16)} 시작
                          </span>
                          <span>
                            {info.currentReservation.ends_at.slice(11, 16)} 종료 ({info.totalMinutes}분)
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 공실일 때: 반짝이 아이콘 제거 및 단정한 아웃라인 스타일 */
                    <div className="text-center py-3.5 space-y-1.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          즉시 이용 가능
                        </p>
                        {info.nextReservation ? (
                          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
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

                {/* 하단 카드 액션 버튼 영역 (과도한 보라색 버튼 제거 -> 차분한 아웃라인 버튼) */}
                <div className="p-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-1.5">
                  {isOccupied && info.currentReservation ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (info.currentReservation) {
                            void onCheckout(info.currentReservation);
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
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
                          className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-500" strokeWidth={1.5} />
                          <span>+10분</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenQuickCheckIn(room.id)}
                      className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                      <span>배정하기</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 퀵 입실 배정 모달 */}
      <Modal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        title={`공간 즉시 배정 · ${targetRoom?.name || '공간'}`}
        maxWidth="md"
      >
        <form onSubmit={handleQuickCheckInSubmit} className="space-y-4 p-5 pb-6">
          {/* 공간 이름 표시 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
              <span className="text-xs font-bold text-slate-900">
                {targetRoom?.name}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {startTime} ~ {endTime} ({durationMinutes}분)
            </span>
          </div>

          {/* 대상 원생/이용자 선택 */}
          <FormField label="이용자 선택">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className={FORM_CONTROL_CLASS}
            >
              <option value="">(자유 이용 / 이름 미지정)</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.phone ? `(${st.phone.slice(-4)})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          {/* 이용 시간 칩 (30/40/50/60분) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              이용 시간 (분)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectDuration(mins)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    durationMinutes === mins
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mins}분
                </button>
              ))}
            </div>
          </div>

          {/* 시작 / 종료 시각 직접 조정 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작 시각">
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
            <FormField label="종료 예정 시각">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
          </div>

          {/* 목적 메모 및 간편 칩 */}
          <div>
            <FormField label="이용 목적 / 연습 내용">
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 자유 연습, 곡 연습 등"
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-2">
              {PRESET_MEMOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMemo(p)}
                  className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium whitespace-nowrap transition cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? '배정 중...' : '즉시 배정 완료'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. 조율/점검 관리 모달 */}
      {tuningModalRecord && (
        <PianoRoomTuningModal
          isOpen={Boolean(tuningModalRecord)}
          onClose={() => setTuningModalRecord(null)}
          record={tuningModalRecord}
          onSaved={() => {
            setTuningModalRecord(null);
          }}
        />
      )}
    </div>
  );
};
