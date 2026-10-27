import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Clock,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Coins,
  X,
  UserCheck,
  ShieldAlert,
  Wifi,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import {
  detectShiftSlotConflict,
  calculateShiftWage,
  calculateWeeklyWorkMinutes,
  validateWeekly52HourLimit,
  generateShiftCycleForMonth,
  verifyProximityWorkplaceAuth,
  type StaffShift,
  type ShiftTemplate,
} from '../domain/shiftScheduleEngine';

const STORAGE_KEY_SHIFTS = 'moa_staff_shifts';

export interface ShiftWithStaffName extends StaffShift {
  staffName: string;
  hourlyRate: number;
}

const SAMPLE_SHIFTS: ShiftWithStaffName[] = [
  {
    id: 'sft-001',
    staffId: 'staff-1',
    staffName: '이지훈 (오전 오픈)',
    startAt: `${new Date().toISOString().slice(0, 10)}T08:00:00Z`,
    endAt: `${new Date().toISOString().slice(0, 10)}T17:00:00Z`, // 9시간 - 1시간 휴게 = 8시간
    breakMinutes: 60,
    hourlyRate: 11000,
  },
  {
    id: 'sft-002',
    staffId: 'staff-2',
    staffName: '김민아 (오후 피크)',
    startAt: `${new Date().toISOString().slice(0, 10)}T14:00:00Z`,
    endAt: `${new Date().toISOString().slice(0, 10)}T23:00:00Z`,
    breakMinutes: 60,
    hourlyRate: 11000,
  },
  {
    id: 'sft-003',
    staffId: 'staff-3',
    staffName: '박준영 (야간 마감)',
    startAt: `${new Date().toISOString().slice(0, 10)}T22:00:00Z`,
    endAt: `${new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}T06:00:00Z`,
    breakMinutes: 60,
    hourlyRate: 12000,
  },
];

export const ShiftScheduleManagementView: React.FC = () => {
  const storageKey = getTenantStorageKey(STORAGE_KEY_SHIFTS);

  // 1. Refine v5 데이터 페칭
  const { query } = useList<any>({
    resource: 'shift_schedules',
    pagination: { mode: 'off' },
  });

  const refineShifts = query?.data?.data as ShiftWithStaffName[] | undefined;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  // 2. 로컬스토리지 폴백 상태
  const [localShifts, setLocalShifts] = useState<ShiftWithStaffName[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_SHIFTS;
  });

  const shifts = useMemo(() => {
    if (refineShifts && refineShifts.length > 0) return refineShifts;
    return localShifts;
  }, [refineShifts, localShifts]);

  const saveLocalShifts = (next: ShiftWithStaffName[]) => {
    setLocalShifts(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCycleTemplateModalOpen, setIsCycleTemplateModalOpen] = useState(false);
  const [isProximityModalOpen, setIsProximityModalOpen] = useState(false);

  // 주간 시작일 (해당 주 월요일 기준)
  const currentWeekMonday = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }, []);

  // 직원별 주 52시간 현황 집계
  const staffHoursList = useMemo(() => {
    const staffMap = new Map<string, string>();
    shifts.forEach((s) => staffMap.set(s.staffId, s.staffName));

    return Array.from(staffMap.entries()).map(([staffId, staffName]) => {
      const summary = calculateWeeklyWorkMinutes(shifts, staffId, currentWeekMonday);
      return {
        staffId,
        staffName,
        ...summary,
      };
    });
  }, [shifts, currentWeekMonday]);

  // 주 52시간 초과 위험 직원 수
  const over52WarningCount = useMemo(() => {
    return staffHoursList.filter((s) => s.isOver52Hours).length;
  }, [staffHoursList]);

  const filteredShifts = useMemo(() => {
    if (!searchTerm.trim()) return shifts;
    return shifts.filter((s) => s.staffName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [shifts, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>엔터프라이즈 교대근무 & 근로기준법 주 52시간 관제</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">직원 근무표 및 교대 스케줄</h1>
          <p className="text-xs text-slate-500 mt-1">
            주 52시간 초과 차단 인터락, 2/3교대 순환 템플릿 일괄 생성 및 GPS/Wi-Fi 근태 인증 연동
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProximityModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>GPS/Wi-Fi 인증 체크</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCycleTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>교대조 템플릿 생성</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>근무 시프트 배정</span>
          </button>
        </div>
      </div>

      {/* 주 52시간 한도 초과 경보 배너 */}
      {over52WarningCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
              <span>근로기준법 주 52시간 한도 초과 경보 ({over52WarningCount}명)</span>
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              해당 직원의 누적 예정 근로시간이 법정 한도(52시간)를 초과하였습니다. 특별연장근로 인가서 제출 또는 교대조 재배치가 필요합니다.
            </p>
          </div>
        </div>
      )}

      {/* 직원별 주간 근로시간 현황 위젯 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffHoursList.map((s) => {
          const isDanger = s.isOver52Hours;
          const isWarning = s.isOver40Hours && !s.isOver52Hours;

          return (
            <div
              key={s.staffId}
              className={`p-4 rounded-2xl border shadow-xs space-y-2 bg-white ${
                isDanger
                  ? 'border-rose-300 bg-rose-50/20'
                  : isWarning
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{s.staffName}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    isDanger
                      ? 'bg-rose-600 text-white animate-pulse'
                      : isWarning
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isDanger ? '52H 초과 (위반)' : isWarning ? '연장근로 구간' : '소정근로 정상'}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {s.totalWorkHours}시간
                </span>
                <span className="text-[11px] text-slate-400">
                  잔여: <strong>{Math.round(s.remainingMinutesTo52h / 60)}h</strong> / 52h
                </span>
              </div>

              {/* 주 52시간 프로그레스 바 */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isDanger ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (s.totalWorkHours / 52) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 시프트 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              배정된 교대 시프트 목록 ({filteredShifts.length}건)
            </span>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="직원명 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">근무자</th>
                <th className="px-4 py-3">시프트 시작</th>
                <th className="px-4 py-3">시프트 종료</th>
                <th className="px-4 py-3">휴게 시간</th>
                <th className="px-4 py-3">예상 실근무</th>
                <th className="px-4 py-3">시급 정산액</th>
                <th className="px-4 py-3 text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.map((s) => {
                const wage = calculateShiftWage({
                  clockIn: s.startAt,
                  clockOut: s.endAt,
                  breakMinutes: s.breakMinutes,
                  hourlyRate: s.hourlyRate || 10500,
                });

                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{s.staffName}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {new Date(s.startAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {new Date(s.endAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.breakMinutes}분</td>
                    <td className="px-4 py-3 font-bold text-blue-600 font-mono">
                      {Math.floor(wage.actualWorkMinutes / 60)}시간 {wage.actualWorkMinutes % 60}분
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {wage.totalPay.toLocaleString()}원
                      {wage.nightBonusPay > 0 && (
                        <span className="text-[10px] text-amber-600 block">
                          (야간 가산 {wage.nightBonusPay.toLocaleString()}원 포함)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        편성 확정
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 신규 시프트 편성 모달 (주 52시간 인터락 탑재) */}
      {isNewModalOpen && (
        <NewShiftModal
          shifts={shifts}
          currentWeekMonday={currentWeekMonday}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newShift) => {
            if (refineShifts) {
              mutateCreate(
                { resource: 'shift_schedules', values: newShift },
                {
                  onSuccess: () => {
                    refetch();
                    setIsNewModalOpen(false);
                    showToast(`[${newShift.staffName}] 근무 시프트가 편성되었습니다.`, 'success');
                  },
                  onError: () => {
                    saveLocalShifts([newShift, ...shifts]);
                    setIsNewModalOpen(false);
                    showToast(`[${newShift.staffName}] 시프트가 로컬 편성되었습니다.`, 'info');
                  },
                }
              );
            } else {
              saveLocalShifts([newShift, ...shifts]);
              setIsNewModalOpen(false);
              showToast(`[${newShift.staffName}] 근무 시프트가 편성되었습니다.`, 'success');
            }
          }}
        />
      )}

      {/* 교대조 템플릿 1개월 일괄 생성 모달 */}
      {isCycleTemplateModalOpen && (
        <CycleTemplateModal
          onClose={() => setIsCycleTemplateModalOpen(false)}
          onGenerated={(generatedSlots) => {
            const mappedSlots: ShiftWithStaffName[] = generatedSlots.map((g, idx) => ({
              id: `gen-${Date.now()}-${idx}`,
              staffId: g.staffId,
              staffName: g.staffId === 'staff-1' ? '이지훈' : g.staffId === 'staff-2' ? '김민아' : '박준영',
              startAt: g.startAt,
              endAt: g.endAt,
              breakMinutes: g.breakMinutes,
              hourlyRate: 11000,
            }));

            saveLocalShifts([...mappedSlots, ...shifts]);
            showToast(`${mappedSlots.length}건의 교대 스케줄이 일괄 생성되었습니다.`, 'success');
            setIsCycleTemplateModalOpen(false);
          }}
        />
      )}

      {/* GPS / Wi-Fi 인증 근태 타임카드 확인 모달 */}
      {isProximityModalOpen && (
        <ProximityCheckModal onClose={() => setIsProximityModalOpen(false)} />
      )}
    </div>
  );
};

// ============================================================================
// 신규 시프트 편성 모달 (주 52시간 한도 초과 인터락 포함)
// ============================================================================

interface NewShiftModalProps {
  shifts: ShiftWithStaffName[];
  currentWeekMonday: string;
  onClose: () => void;
  onCreated: (shift: ShiftWithStaffName) => void;
}

const NewShiftModal: React.FC<NewShiftModalProps> = ({
  shifts,
  currentWeekMonday,
  onClose,
  onCreated,
}) => {
  const [staffId, setStaffId] = useState('staff-1');
  const [staffName, setStaffName] = useState('이지훈 (오전)');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [hourlyRate, setHourlyRate] = useState('11000');
  const [allowSpecialApproval, setAllowSpecialApproval] = useState(false);

  // 주 52시간 인터락 검증
  const validation = useMemo(() => {
    const currentSummary = calculateWeeklyWorkMinutes(shifts, staffId, currentWeekMonday);
    const inTime = new Date(`${shiftDate}T${startTime}:00Z`).getTime();
    const outTime = new Date(`${shiftDate}T${endTime}:00Z`).getTime();
    const shiftMinutes = Math.max(0, Math.floor((outTime - inTime) / (1000 * 60)) - Number(breakMinutes));

    return validateWeekly52HourLimit({
      currentWeeklyMinutes: currentSummary.totalWorkMinutes,
      additionalShiftMinutes: shiftMinutes,
      allowSpecialApproval,
    });
  }, [shifts, staffId, currentWeekMonday, shiftDate, startTime, endTime, breakMinutes, allowSpecialApproval]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.allowed) {
      showToast(validation.message, 'warning');
      return;
    }

    const startAt = `${shiftDate}T${startTime}:00Z`;
    const endAt = `${shiftDate}T${endTime}:00Z`;

    // 동일 시프트 충돌 체크
    const conflict = detectShiftSlotConflict(shifts, { staffId, startAt, endAt });
    if (conflict.hasConflict) {
      showToast('해당 직원의 기존 근무 시간과 겹칩니다.', 'warning');
      return;
    }

    const newShift: ShiftWithStaffName = {
      id: `sft-${Date.now()}`,
      staffId,
      staffName,
      startAt,
      endAt,
      breakMinutes: Number(breakMinutes) || 0,
      hourlyRate: Number(hourlyRate) || 10500,
    };

    onCreated(newShift);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">신규 근무 시프트 편성</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">근무자 선택</label>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setStaffName(
                  e.target.value === 'staff-1'
                    ? '이지훈 (오전)'
                    : e.target.value === 'staff-2'
                    ? '김민아 (오후)'
                    : '박준영 (야간)'
                );
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff-1">이지훈 (오전)</option>
              <option value="staff-2">김민아 (오후)</option>
              <option value="staff-3">박준영 (야간)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">근무 일자</label>
            <input
              type="date"
              required
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">시작 시각</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">종료 시각</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 주 52시간 실시간 인터락 배너 */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              validation.alertLevel === 'BLOCKED_52H'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : validation.alertLevel === 'SPECIAL_APPROVED'
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : validation.alertLevel === 'WARNING_OVERTIME'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>주간 예정 근로시간: {validation.projectedTotalHours}시간 / 52시간</span>
              <span className="text-[10px] uppercase font-mono font-extrabold">{validation.alertLevel}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{validation.message}</p>

            {validation.alertLevel === 'BLOCKED_52H' && (
              <label className="flex items-center gap-2 pt-2 border-t border-rose-200 text-rose-800 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSpecialApproval}
                  onChange={(e) => setAllowSpecialApproval(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>[관리자 특약 승인] 특별연장근로 인가로 편성 강제 허용</span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              취소
            </button>
            <button
              type="submit"
              disabled={!validation.allowed}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 shadow-xs"
            >
              시프트 편성 확정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 교대조 템플릿 1개월 생성 모달
// ============================================================================

interface CycleTemplateModalProps {
  onClose: () => void;
  onGenerated: (slots: any[]) => void;
}

const CycleTemplateModal: React.FC<CycleTemplateModalProps> = ({ onClose, onGenerated }) => {
  const [cycleType, setCycleType] = useState<'3_SHIFT' | '2_SHIFT'>('3_SHIFT');

  const handleGenerate = () => {
    const templates: ShiftTemplate[] = [
      { id: 't-day', name: '주간', startTime: '08:00', endTime: '17:00', breakMinutes: 60 },
      { id: 't-night', name: '야간', startTime: '17:00', endTime: '02:00', breakMinutes: 60 },
      { id: 't-off', name: '비번/휴무', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isOffDay: true },
    ];

    const slots = generateShiftCycleForMonth({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      staffIds: ['staff-1', 'staff-2', 'staff-3'],
      templates,
      cyclePattern: cycleType === '3_SHIFT' ? ['t-day', 't-night', 't-off'] : ['t-day', 't-off'],
    });

    onGenerated(slots);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">교대조 순환 템플릿 1개월 일괄 생성</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">교대 순환 방식 선택</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCycleType('3_SHIFT')}
              className={`p-3 rounded-xl border text-left text-xs ${
                cycleType === '3_SHIFT' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200'
              }`}
            >
              <span>3조 2교대 (주간/야간/휴무)</span>
            </button>
            <button
              type="button"
              onClick={() => setCycleType('2_SHIFT')}
              className={`p-3 rounded-xl border text-left text-xs ${
                cycleType === '2_SHIFT' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200'
              }`}
            >
              <span>2조 1교대 (격일제)</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            당월 1일부터 말일까지 3명의 직원을 대상으로 교대 순환 스케줄을 자동으로 균등 배정합니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            취소
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            1개월 스케줄 일괄 자동 생성
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// GPS / Wi-Fi 인증 근태 타임카드 확인 모달
// ============================================================================

const ProximityCheckModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [wifiSsid, setWifiSsid] = useState('MOA_STORE_5G');

  const result = useMemo(() => {
    return verifyProximityWorkplaceAuth({
      employeeWifiSsid: wifiSsid,
      workplaceWifiSsid: 'MOA_STORE_5G',
      employeeCoordinates: { latitude: 37.497942, longitude: 127.027621 },
      workplaceCoordinates: { latitude: 37.497950, longitude: 127.027630, maxAllowedRadiusMeters: 50 },
    });
  }, [wifiSsid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">GPS & Wi-Fi 근태 인증 시뮬레이터</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">접속 Wi-Fi SSID</label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl"
            />
            <span className="text-[10px] text-slate-400">매장 공인 SSID: MOA_STORE_5G</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
            <span className="font-bold text-slate-700 block">GPS 지오펜싱 (반경 50m)</span>
            <p className="text-[11px] text-slate-500">
              현재 좌표: 37.497942, 127.027621 (매장 거리 약 1.1m)
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border text-xs font-bold ${
              result.isAuthenticated
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <span>{result.isAuthenticated ? '인증 성공' : '인증 실패'}: </span>
            <span className="font-medium">{result.message}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
