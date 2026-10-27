import React, { useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  AlertCircle,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import {
  applyLeaveApproval,
  LEAVE_TYPE_LABELS,
  type StaffLeaveBalance,
  type StaffLeaveRequest,
} from '../domain/leaveManagementEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface LeaveApprovalInboxViewProps {
  currentApproverId?: string;
  requests: StaffLeaveRequest[];
  balances: StaffLeaveBalance[];
  onRequestStatusChange: (
    updatedRequest: StaffLeaveRequest,
    updatedBalance?: StaffLeaveBalance,
    scheduleTag?: string
  ) => void;
}

export const LeaveApprovalInboxView: React.FC<LeaveApprovalInboxViewProps> = ({
  currentApproverId = 'staff-3',
  requests,
  balances,
  onRequestStatusChange,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [rejectionModalReq, setRejectionModalReq] = useState<StaffLeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'pending') return req.status === 'pending';
    if (filterStatus === 'resolved') return req.status === 'approved' || req.status === 'rejected';
    return true;
  });

  const handleApprove = (req: StaffLeaveRequest) => {
    const targetBalance = balances.find((b) => b.staffId === req.staffId);
    if (!targetBalance) {
      showToast('해당 직원의 휴가 잔여 정보를 찾을 수 없습니다.', 'error', '결재 실패');
      return;
    }

    if (targetBalance.remainingHours < req.deductionHours) {
      showToast(
        `직원의 잔여 휴가 시간(${targetBalance.remainingHours}h)이 부족하여 승인할 수 없습니다.`,
        'error',
        '잔여 시간 초과'
      );
      return;
    }

    const { updatedBalance, updatedRequest, scheduleTag } = applyLeaveApproval(
      targetBalance,
      req,
      {
        approverId: currentApproverId,
        isApproved: true,
      }
    );

    onRequestStatusChange(updatedRequest, updatedBalance, scheduleTag);
    showToast(
      `[${req.staffName}] ${req.deductionHours}시간 휴가가 승인되었습니다. (근무표 태그: ${scheduleTag})`,
      'success',
      '휴가 승인 완료'
    );
  };

  const handleOpenReject = (req: StaffLeaveRequest) => {
    setRejectionModalReq(req);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectionModalReq) return;

    const targetBalance = balances.find((b) => b.staffId === rejectionModalReq.staffId);
    const balanceToPass = targetBalance || {
      staffId: rejectionModalReq.staffId,
      staffName: rejectionModalReq.staffName,
      totalAccruedHours: 120,
      usedHours: 0,
      remainingHours: 120,
    };

    const { updatedRequest } = applyLeaveApproval(balanceToPass, rejectionModalReq, {
      approverId: currentApproverId,
      isApproved: false,
      rejectionReason: rejectionReason.trim() || '승인권자에 의해 결재 반려되었습니다.',
    });

    onRequestStatusChange(updatedRequest);
    showToast(`[${rejectionModalReq.staffName}] 휴가 신청이 반려되었습니다.`, 'info', '결재 반려');
    setRejectionModalReq(null);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              휴가 결재 수신함
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Inbox className="h-3 w-3" />
              결재 대기: {requests.filter((r) => r.status === 'pending').length}건
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            소속 팀원들이 상신한 시간 단위 휴가 신청을 검토하고 원자적으로 잔여 시간을 차감 승인합니다.
          </p>
        </div>

        {/* 상태 필터 버튼 */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filterStatus === 'pending'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            대기 중 ({requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('resolved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filterStatus === 'resolved'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            결재 완료 ({requests.filter((r) => r.status !== 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            전체 보기
          </button>
        </div>
      </div>

      {/* 결재 카드 리스트 */}
      <div className="space-y-3">
        {filteredRequests.map((req) => {
          const isPending = req.status === 'pending';
          const isApproved = req.status === 'approved';
          const isRejected = req.status === 'rejected';

          const targetBalance = balances.find((b) => b.staffId === req.staffId);

          return (
            <div
              key={req.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition-all dark:bg-slate-900 ${
                isPending
                  ? 'border-indigo-200 dark:border-indigo-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {req.staffName}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {LEAVE_TYPE_LABELS[req.leaveType]}
                    </span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {req.deductionHours}시간 차감
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      일자: <strong className="text-slate-700 dark:text-slate-200">{req.requestDate}</strong>
                    </span>
                    {req.startTime && req.endTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        시간: {req.startTime} ~ {req.endTime}
                      </span>
                    )}
                    {targetBalance && (
                      <span className="text-[11px] text-slate-400">
                        (현재 잔여: {targetBalance.remainingHours}h)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                    <strong>신청 사유:</strong> {req.reason}
                  </p>

                  {isRejected && req.rejectionReason && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>반려 사유: {req.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* 상태 배지 또는 결재 액션 버튼 */}
                <div className="flex items-center gap-2 shrink-0">
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReject(req)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        반려
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        승인 및 차감
                      </button>
                    </div>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      승인 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      <XCircle className="h-3.5 w-3.5" />
                      반려됨
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <Inbox className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold">결재 대기 중인 휴가 신청 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 반려 사유 작성 모달 */}
      {rejectionModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              휴가 신청 반려 사유 작성
            </h3>
            <p className="text-xs text-slate-500">
              [{rejectionModalReq.staffName}] 직원에게 전달될 반려 사유를 구체적으로 작성하세요.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="예: 당일 납품 프로젝트 집중 일정으로 인해 승인이 어렵습니다."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 resize-none h-24 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalReq(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
