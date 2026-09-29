import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  Phone, 
  MessageSquare,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import type { CustomerJoinRequest, JoinRequestType } from '@/types';
import { customerJoinService } from './services/customerJoinService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { Modal } from '@/shared/components/ui';

function getStatusLabel(
  status: string,
  requestType?: string
): { label: string; color: string } {
  const isJoin = requestType === 'membership' || requestType === 'trial';
  const labels: Record<string, { label: string; color: string }> = {
    pending: {
      label: isJoin ? '승인 대기' : '문의 대기',
      color: 'bg-yellow-100 text-yellow-700',
    },
    approved: {
      label: isJoin ? '승인됨' : '처리 완료',
      color: 'bg-green-100 text-green-700',
    },
    rejected: { label: '반려됨', color: 'bg-red-100 text-red-700' },
    cancelled: { label: '취소됨', color: 'bg-slate-100 text-slate-700' },
  };
  return labels[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
}

interface RequestCardProps {
  request: CustomerJoinRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  key?: string; // React key prop
}

function RequestCard({ request, onApprove, onReject }: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const statusInfo = getStatusLabel(request.status, request.request_type);

  const handleApprove = async () => {
    if (!confirm(`${request.applicant_name}님의 가입을 승인하시겠습니까?`)) return;
    
    setProcessing(true);
    try {
      await onApprove(request.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해주세요');
      return;
    }

    setProcessing(true);
    try {
      await onReject(request.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 text-lg">{request.applicant_name}</h4>
              <p className="text-sm text-slate-600 mt-1">
                신청일: {new Date(request.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            {request.applicant_phone && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${request.applicant_phone}`} className="hover:text-indigo-600">
                  {request.applicant_phone}
                </a>
              </div>
            )}
            {request.applicant_email && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${request.applicant_email}`} className="hover:text-indigo-600">
                  {request.applicant_email}
                </a>
              </div>
            )}
          </div>

          {request.message && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-3 flex items-center justify-between text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                소개 메시지
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {expanded && request.message && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
              {request.message}
            </div>
          )}

          {request.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                승인
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="flex-1 py-2.5 bg-white text-red-600 border-2 border-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                반려
              </button>
            </div>
          )}

          {request.status === 'rejected' && request.reject_reason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>반려 사유:</strong> {request.reject_reason}
              </p>
            </div>
          )}

          {request.status === 'approved' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>승인 완료 ({new Date(request.reviewed_at!).toLocaleDateString('ko-KR')})</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          if (processing) return;
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="가입 신청 반려"
        maxWidth="sm"
      >
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            반려 사유를 입력해주세요. 신청자에게 전달됩니다.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            placeholder="예: 현재 신규 회원 모집을 하지 않고 있습니다"
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
              disabled={processing}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={processing}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {processing ? '처리 중...' : '반려'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function CustomerJoinRequestsPanel({
  embedded = false,
  requestType,
  title = '고객 가입 신청',
  description,
  hideWhenEmpty = false,
  includeRequest,
  emptyHint,
}: {
  embedded?: boolean;
  requestType?: JoinRequestType;
  title?: string;
  description?: string;
  /** 대기 건이 없을 때 학생 목록 등에서 숨김 */
  hideWhenEmpty?: boolean;
  includeRequest?: (row: CustomerJoinRequest) => boolean;
  emptyHint?: string;
} = {}) {
  const { currentOrganization } = useOrganization();
  const [requests, setRequests] = useState<CustomerJoinRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      loadRequests();
    }
  }, [currentOrganization, filter, requestType, includeRequest]);

  const loadRequests = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const data = await customerJoinService.getOrgJoinRequests(
        currentOrganization.id,
        filter === 'pending' ? 'pending' : undefined,
        requestType
      );
      setRequests(includeRequest ? data.filter(includeRequest) : data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await customerJoinService.approveJoinRequest(requestId);
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인에 실패했습니다');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await customerJoinService.rejectJoinRequest(requestId, reason);
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : '반려에 실패했습니다');
    }
  };

  if (hideWhenEmpty && (loading || requests.length === 0)) {
    return null;
  }

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">조직을 선택해주세요</p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const subtitle =
    description ||
    (pendingCount > 0
      ? `${pendingCount}건의 대기 중인 신청이 있습니다`
      : '대기 중인 신청이 없습니다');

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              {title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          </div>
        </div>
      )}
      {embedded && (
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          대기
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">{pendingCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          전체
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
          <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {emptyHint || '신청 내역이 없습니다'}
          </h3>
          {!emptyHint && (
          <p className="text-sm text-slate-600">
            {filter === 'pending' ? '대기 중인 신청이 없습니다' : '아직 신청이 없습니다'}
          </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: CustomerJoinRequest) => (
            <RequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
