import React, { useState } from 'react';
import {
  Clock,
  Inbox,
  Table,
  Plus,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import {
  INITIAL_STAFF_BALANCES,
  INITIAL_LEAVE_REQUESTS,
} from '../services/leaveManagementService';
import {
  type StaffLeaveBalance,
  type StaffLeaveRequest,
} from '../domain/leaveManagementEngine';
import { LeaveRequestModal } from './LeaveRequestModal';
import { LeaveApprovalInboxView } from './LeaveApprovalInboxView';
import { LeaveManagementLedgerView } from './LeaveManagementLedgerView';

export const LeaveManagementDashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'inbox'>('ledger');
  const [balances, setBalances] = useState<StaffLeaveBalance[]>(INITIAL_STAFF_BALANCES);
  const [requests, setRequests] = useState<StaffLeaveRequest[]>(INITIAL_LEAVE_REQUESTS);

  // 모달 상태
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [targetBalanceForRequest, setTargetBalanceForRequest] = useState<StaffLeaveBalance>(
    balances[0]
  );

  // 신규 휴가 신청 상신 처리
  const handleCreateRequest = (
    data: Omit<StaffLeaveRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    const newRequest: StaffLeaveRequest = {
      ...data,
      id: `req-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
  };

  // 결재 완료/반려 상태 전이 처리
  const handleRequestStatusChange = (
    updatedRequest: StaffLeaveRequest,
    updatedBalance?: StaffLeaveBalance
  ) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );

    if (updatedBalance) {
      setBalances((prev) =>
        prev.map((b) => (b.staffId === updatedBalance.staffId ? updatedBalance : b))
      );
    }
  };

  // 잔여 시간 변경 (수동 연차 부여 등)
  const handleBalanceUpdate = (updatedBalance: StaffLeaveBalance) => {
    setBalances((prev) =>
      prev.map((b) => (b.staffId === updatedBalance.staffId ? updatedBalance : b))
    );
  };

  const handleOpenModal = (staff?: StaffLeaveBalance) => {
    setTargetBalanceForRequest(staff || balances[0]);
    setIsRequestModalOpen(true);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 최상단 타이틀 & 탭 네비게이션 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-1.5 dark:bg-indigo-950 dark:text-indigo-300">
            <Clock className="w-3.5 h-3.5" />
            <span>유연근무 맞춤형 시간(Hour) 단위 휴가 관리</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight dark:text-white">
            시간제 휴가 & 근태 차감 센터
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            9-9-9-9-4제 및 단축·파트타임 스케줄에 맞춰 필요한 시간만 정확하게 차감하고 전자결재와 연동합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 상단 탭 전환 버튼 */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ledger'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>전사 휴가 대장</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inbox'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>결재 수신함</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* 휴가 신청 버튼 */}
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            휴가 신청
          </button>
        </div>
      </div>

      {/* 탭 1: 사내 휴가 대장 뷰 */}
      {activeTab === 'ledger' && (
        <LeaveManagementLedgerView
          balances={balances}
          requests={requests}
          onBalanceUpdate={handleBalanceUpdate}
          onOpenRequestModal={handleOpenModal}
        />
      )}

      {/* 탭 2: 결재 수신함 뷰 */}
      {activeTab === 'inbox' && (
        <LeaveApprovalInboxView
          requests={requests}
          balances={balances}
          onRequestStatusChange={handleRequestStatusChange}
        />
      )}

      {/* 시간 단위 휴가 신청 모달 */}
      <LeaveRequestModal
        isOpen={isRequestModalOpen}
        currentBalance={targetBalanceForRequest}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
};
