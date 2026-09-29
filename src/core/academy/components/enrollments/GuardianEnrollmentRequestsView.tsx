import React, { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import {
  getOrgEnrollmentRequests,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  type GuardianEnrollmentRequest,
} from '@/core/parent/services/enrollmentRequestService';
import { GuardianEnrollmentRequestCard } from './GuardianEnrollmentRequestCard';
import { useModuleLabels } from '@/core/labels';

export const GuardianEnrollmentRequestsView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { showToast } = useApp();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;
  const [requests, setRequests] = useState<GuardianEnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const loadRequests = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const data = await getOrgEnrollmentRequests(currentOrganization.id, filter);
      setRequests(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '요청 목록을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [currentOrganization?.id, filter]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveEnrollmentRequest(requestId);
      showToast('등록 요청을 승인했습니다', 'success');
      await loadRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승인에 실패했습니다', 'error');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await rejectEnrollmentRequest(requestId, reason);
      showToast('등록 요청을 거절했습니다', 'success');
      await loadRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '거절 처리에 실패했습니다', 'error');
      throw err;
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div id="guardian-enrollment-inbox" className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div id="guardian-enrollment-inbox" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{contactLabel} 자녀 등록</h2>
          <p className="text-xs text-slate-500 mt-1">
            {contactLabel}가 자녀를 이 사업장에 연결 요청한 건입니다. 성인 자가가입과는 별도입니다.
            이미 {customerLabel}으로 등록된 경우는 {customerLabel} 상세의 {contactLabel} 연결 QR을
            사용하세요.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors min-h-[44px] ${
              filter === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            연결 요청 중
          </button>
          <button
            type="button"
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors min-h-[44px] ${
              filter === 'approved'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            연결 완료
          </button>
          <button
            type="button"
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors min-h-[44px] ${
              filter === 'rejected'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            연결 거절
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {filter === 'pending' && '대기중인 등록 요청이 없습니다'}
            {filter === 'approved' && '승인된 등록 요청이 없습니다'}
            {filter === 'rejected' && '거절된 등록 요청이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <GuardianEnrollmentRequestCard
              key={request.id}
              request={request}
              onApprove={() => void handleApprove(request.id)}
              onReject={(reason) => handleReject(request.id, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
