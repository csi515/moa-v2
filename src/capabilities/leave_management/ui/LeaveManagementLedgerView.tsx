import React, { useState } from 'react';
import {
  User,
  Users,
  Clock,
  Plus,
  Calendar,
  X,
  History,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  accrueAnnualLeaveHours,
  LEAVE_TYPE_LABELS,
  type StaffLeaveBalance,
  type StaffLeaveRequest,
} from '../domain/leaveManagementEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface LeaveManagementLedgerViewProps {
  balances: StaffLeaveBalance[];
  requests: StaffLeaveRequest[];
  onBalanceUpdate: (updatedBalance: StaffLeaveBalance) => void;
  onOpenRequestModal?: (balance: StaffLeaveBalance) => void;
}

export const LeaveManagementLedgerView: React.FC<LeaveManagementLedgerViewProps> = ({
  balances,
  requests,
  onBalanceUpdate,
  onOpenRequestModal,
}) => {
  const [selectedStaffForTimeline, setSelectedStaffForTimeline] = useState<StaffLeaveBalance | null>(null);
  const [grantModalStaff, setGrantModalStaff] = useState<StaffLeaveBalance | null>(null);
  const [hoursToGrant, setHoursToGrant] = useState<number>(8); // 기본 8시간 부여

  // 선택 직원의 승인 완료된 휴가 타임라인 내역
  const staffTimeline = selectedStaffForTimeline
    ? requests.filter(
        (r) => r.staffId === selectedStaffForTimeline.staffId && r.status === 'approved'
      )
    : [];

  const handleGrantHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalStaff || hoursToGrant <= 0) return;

    const updated = accrueAnnualLeaveHours(grantModalStaff, hoursToGrant);
    onBalanceUpdate(updated);

    showToast(
      `[${grantModalStaff.staffName}] 직원에게 ${hoursToGrant}시간의 연차가 성공적으로 부여되었습니다.`,
      'success',
      '연차 시간 부여 완료'
    );
    setGrantModalStaff(null);
  };

  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>총 등록 임직원</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {balances.length}명
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>전사 총 휴가 사용 시간</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {balances.reduce((acc, cur) => acc + cur.usedHours, 0)}시간
            </span>
            <span className="text-xs text-slate-400">
              / 총 {balances.reduce((acc, cur) => acc + cur.totalAccruedHours, 0)}시간 발생
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>전사 잔여 가용 시간</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {balances.reduce((acc, cur) => acc + cur.remainingHours, 0)}시간
          </div>
        </div>
      </div>

      {/* 직원별 휴가 대장 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              사내 시간제 휴가 관리 대장
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              직원 이름을 클릭하면 상세 일자별/시간별 사용 타임라인 팝업이 출력됩니다.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">직원명</th>
                <th className="px-6 py-3 font-semibold">소속 부서 / 직급</th>
                <th className="px-6 py-3 font-semibold">총 발생 시간</th>
                <th className="px-6 py-3 font-semibold">사용 시간</th>
                <th className="px-6 py-3 font-semibold">잔여 시간</th>
                <th className="px-6 py-3 font-semibold text-right">관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {balances.map((staff) => {
                const usagePercent =
                  staff.totalAccruedHours > 0
                    ? Math.round((staff.usedHours / staff.totalAccruedHours) * 100)
                    : 0;

                return (
                  <tr
                    key={staff.staffId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForTimeline(staff)}
                        className="text-left hover:text-indigo-600 hover:underline flex items-center gap-1.5"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{staff.staffName}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <span>{staff.departmentName || '플랫폼팀'}</span>
                      <span className="text-slate-400 text-[11px] block">{staff.roleTitle || '담당'}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                      {staff.totalAccruedHours}시간
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-600 dark:text-rose-400">
                      {staff.usedHours}시간 ({usagePercent}%)
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        {staff.remainingHours}시간 남음
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForTimeline(staff)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <History className="inline h-3 w-3 mr-1" />
                        타임라인
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantModalStaff(staff)}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        <Plus className="inline h-3 w-3 mr-0.5" />
                        연차 부여
                      </button>
                      {onOpenRequestModal && (
                        <button
                          type="button"
                          onClick={() => onOpenRequestModal(staff)}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          대리 신청
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 일자별/시간별 상세 사용 타임라인 팝업 모달 */}
      {selectedStaffForTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  [{selectedStaffForTimeline.staffName}] 휴가 사용 상세 타임라인
                </h3>
                <p className="text-xs text-slate-500">
                  총 발생 {selectedStaffForTimeline.totalAccruedHours}h | 사용 {selectedStaffForTimeline.usedHours}h | 잔여 {selectedStaffForTimeline.remainingHours}h
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffForTimeline(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {staffTimeline.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {item.requestDate}
                      {item.startTime && item.endTime && ` (${item.startTime} ~ ${item.endTime})`}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      -{item.deductionHours}시간 차감
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    <strong>구분:</strong> {LEAVE_TYPE_LABELS[item.leaveType]} | <strong>결재자:</strong> {item.approverName || '팀장'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    <strong>사유:</strong> {item.reason}
                  </p>
                </div>
              ))}

              {staffTimeline.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  승인된 휴가 사용 이력이 없습니다.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStaffForTimeline(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연차 시간 수동 부여 모달 */}
      {grantModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-500" />
              연차 시간 부여 / 적립
            </h3>
            <p className="text-xs text-slate-500">
              [{grantModalStaff.staffName}] 직원에게 입사 연차 또는 포상 연차 시간을 추가 부여합니다.
            </p>

            <form onSubmit={handleGrantHours} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  부여할 시간 (단위: 시간) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="160"
                  step="1"
                  value={hoursToGrant}
                  onChange={(e) => setHoursToGrant(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                부여 후 총 발생 시간: <strong>{grantModalStaff.totalAccruedHours + hoursToGrant}시간</strong>
                <br />
                부여 후 잔여 시간: <strong>{grantModalStaff.remainingHours + hoursToGrant}시간</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantModalStaff(null)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  부여 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
