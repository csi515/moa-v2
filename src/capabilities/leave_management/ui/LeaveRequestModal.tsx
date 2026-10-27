import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  getScheduledDailyHours,
  calculateDeductionHours,
  validateLeaveRequest,
  LEAVE_TYPE_LABELS,
  type LeaveType,
  type StaffLeaveBalance,
  type StaffLeaveRequest,
  type WorkScheduleType,
} from '../domain/leaveManagementEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface ApproverOption {
  id: string;
  name: string;
  roleTitle: string;
}

const DEFAULT_APPROVERS: ApproverOption[] = [
  { id: 'staff-3', name: '김수현 팀장', roleTitle: '플랫폼개발팀 팀장' },
  { id: 'staff-owner', name: '최대표 대표이사', roleTitle: '총괄 대표' },
  { id: 'staff-hr', name: '박원장 실장', roleTitle: '인사/총무 책임자' },
];

interface LeaveRequestModalProps {
  isOpen: boolean;
  currentBalance: StaffLeaveBalance;
  scheduleType?: WorkScheduleType;
  approvers?: ApproverOption[];
  onClose: () => void;
  onSubmit: (request: Omit<StaffLeaveRequest, 'id' | 'createdAt' | 'status'>) => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  currentBalance,
  scheduleType = 'flexible_four_point_five',
  approvers = DEFAULT_APPROVERS,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [requestDate, setRequestDate] = useState<string>('2026-10-23'); // 기본 금요일
  const [useMode, setUseMode] = useState<'full_day' | 'time_slot'>('full_day');
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [reason, setReason] = useState<string>('');
  const [selectedApproverId, setSelectedApproverId] = useState<string>(approvers[0]?.id || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 선택 날짜의 당일 소정근로시간 자동 감지
  const scheduledDaily = useMemo(() => {
    return getScheduledDailyHours(requestDate, scheduleType);
  }, [requestDate, scheduleType]);

  // 차감 시간 자동 계산
  const deductionHours = useMemo(() => {
    return calculateDeductionHours(
      useMode,
      scheduledDaily.scheduledHours,
      useMode === 'time_slot' ? { startTime, endTime } : undefined
    );
  }, [useMode, scheduledDaily.scheduledHours, startTime, endTime]);

  // 신청 후 예상 잔여 시간 계산
  const predictedRemainingHours = useMemo(() => {
    return Math.max(0, currentBalance.remainingHours - deductionHours);
  }, [currentBalance.remainingHours, deductionHours]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const check = validateLeaveRequest(
      currentBalance,
      deductionHours,
      selectedApproverId,
      reason
    );

    if (!check.valid) {
      setValidationError(check.error || '신청 내용을 확인해주세요.');
      return;
    }

    const approver = approvers.find((a) => a.id === selectedApproverId);

    onSubmit({
      organizationId: 'org-current',
      staffId: currentBalance.staffId,
      staffName: currentBalance.staffName,
      requestDate,
      startTime: useMode === 'time_slot' ? startTime : null,
      endTime: useMode === 'time_slot' ? endTime : null,
      deductionHours,
      leaveType,
      reason,
      approverId: selectedApproverId,
      approverName: approver?.name || '승인권자',
    });

    showToast('시간 단위 휴가 신청이 성공적으로 상신되었습니다.', 'success', '휴가 신청 완료');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                시간(Hour) 단위 휴가 신청
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                유연근무 스케줄에 맞춰 필요한 시간만큼만 정밀하게 차감 신청합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* (1) 현재 잔여 시간 & 예상 잔여 시간 정보 카드 */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-950 dark:bg-indigo-950/30">
            <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                {currentBalance.staffName} 님의 연차 시간
              </span>
              <span>총 {currentBalance.totalAccruedHours}시간 발생</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-indigo-200/50 pt-2 dark:border-indigo-900/50 text-xs">
              <div>
                <span className="text-slate-500">현재 잔여: </span>
                <strong className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentBalance.remainingHours}시간
                </strong>
              </div>
              <div>
                <span className="text-rose-500">차감 예정: </span>
                <strong className="text-sm font-bold text-rose-600">
                  -{deductionHours}시간
                </strong>
              </div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400">승인 후 잔여: </span>
                <strong className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {predictedRemainingHours}시간
                </strong>
              </div>
            </div>
          </div>

          {/* (2) 날짜 선택 및 당일 근무시간 자동 감지 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              휴가 희망일 *
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                required
              />
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>{scheduledDaily.dayLabel}</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="h-3 w-3 text-slate-400" />
              당일 소정근로시간: <strong>{scheduledDaily.scheduledHours}시간</strong> (유연근무 스케줄 자동 연동)
            </p>
          </div>

          {/* (3) 사용 방식 선택 (전일 vs 시간 지정) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              사용 방식 선택 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseMode('full_day')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  useMode === 'full_day'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <div className="text-xs">당일 전일 휴가</div>
                <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                  당일 소정근로시간({scheduledDaily.scheduledHours}h) 자동 차감
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUseMode('time_slot')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  useMode === 'time_slot'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <div className="text-xs">시간 단위 지정 (외출/조퇴)</div>
                <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                  시작/종료 시간만큼 정밀 차감
                </div>
              </button>
            </div>

            {useMode === 'time_slot' && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-500 block mb-0.5">시작 시간</span>
                  <input
                    type="time"
                    step="1800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <span className="text-slate-400 pt-3">~</span>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-500 block mb-0.5">종료 시간</span>
                  <input
                    type="time"
                    step="1800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <div className="text-right pt-3 shrink-0">
                  <span className="inline-block rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold text-white">
                    {deductionHours}시간 차감
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 휴가 구분 및 결재 승인권자 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                휴가 종류
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                결재 승인권자 *
              </label>
              <select
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                required
              >
                {approvers.map((appr) => (
                  <option key={appr.id} value={appr.id}>
                    {appr.name} ({appr.roleTitle})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 휴가 사유 입력 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              휴가 사유 *
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setValidationError(null);
              }}
              placeholder="구체적인 휴가 사유를 작성하세요 (예: 개인 용무 및 병원 진료, 리프레시 등)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 resize-none h-20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              required
            />
          </div>

          {/* 에러 경고 메시지 */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 모달 푸터 버튼 */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={deductionHours <= 0}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              결재 상신 ({deductionHours}h 차감)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
