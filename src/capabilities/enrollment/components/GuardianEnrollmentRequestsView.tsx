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

  const handleApprove = async (request: GuardianEnrollmentRequest) => {
    try {
      await approveEnrollmentRequest(request.id);
      showToast(
        `${request.studentName} ${customerLabel}이(가) 등록되고 ${contactLabel}과(와) 연결되었습니다.`,
        'success'
      );
      await loadRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승인 처리에 실패했습니다', 'error');
    }
  };

  const handleReject = async (request: GuardianEnrollmentRequest, reason: string) => {
    try {
      await rejectEnrollmentRequest(request.id, reason);
      showToast('등록 요청을 거절했습니다', 'info');
      await loadRequests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '거절 처리에 실패했습니다', 'error');
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">{contactLabel} 자녀 등록 요청</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            포털에서 {contactLabel}이(가) 제출한 자녀 등록 요청을 검토하고 승인합니다.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'pending'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            대기중
          </button>
          <button
            type="button"
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'approved'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            승인됨
          </button>
          <button
            type="button"
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'rejected'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            거절됨
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">
            {filter === 'pending'
              ? '대기 중인 등록 요청이 없습니다'
              : filter === 'approved'
              ? '승인된 등록 요청이 없습니다'
              : '거절된 등록 요청이 없습니다'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {filter === 'pending' && `${contactLabel}이(가) 포털에서 자녀를 등록하면 여기에 표시됩니다.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <GuardianEnrollmentRequestCard
              key={request.id}
              request={request}
              onApprove={() => handleApprove(request)}
              onReject={(reason) => handleReject(request, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
