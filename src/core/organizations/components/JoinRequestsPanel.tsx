import React, { useState, useEffect, useCallback } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  getOrganizationJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  type OrganizationJoinRequest,
} from '../services/joinRequestService';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
} from 'lucide-react';

export const JoinRequestsPanel: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const data = await getOrganizationJoinRequests(currentOrganization.id, 'pending');
      setRequests(data);
    } catch (err) {
      console.error('Failed to load join requests:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (request: OrganizationJoinRequest) => {
    openConfirmDialog({
      title: '가입 승인',
      message: `${request.userName || request.userEmail}님의 가입 신청을 승인하시겠습니까?`,
      confirmText: '승인',
      onConfirm: async () => {
        setProcessingId(request.id);
        try {
          await approveJoinRequest(request.id);
          showToast(`${request.userName || request.userEmail}님을 강사로 추가했습니다.`, 'success');
          await loadRequests();
        } catch (err) {
          const message = err instanceof Error ? err.message : '승인에 실패했습니다.';
          showToast(message, 'error');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleReject = async (request: OrganizationJoinRequest) => {
    openConfirmDialog({
      title: '가입 반려',
      message: `${request.userName || request.userEmail}님의 가입 신청을 반려하시겠습니까?`,
      isDestructive: true,
      confirmText: '반려',
      onConfirm: async () => {
        setProcessingId(request.id);
        try {
          await rejectJoinRequest(request.id);
          showToast('가입 신청을 반려했습니다.', 'info');
          await loadRequests();
        } catch (err) {
          const message = err instanceof Error ? err.message : '반려에 실패했습니다.';
          showToast(message, 'error');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">가입 신청</h3>
          <p className="text-xs text-slate-600">
            {requests.length}건의 대기 중인 가입 신청이 있습니다
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const isProcessing = processingId === request.id;
          const displayName = request.userName || '이름 없음';
          const displayEmail = request.userEmail || '';

          return (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-amber-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-900">{displayName}</p>
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                      <Clock className="w-3 h-3" />
                      대기중
                    </span>
                  </div>
                  {displayEmail && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{displayEmail}</span>
                    </div>
                  )}
                  {request.message && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                      <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <p className="line-clamp-2">{request.message}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    신청일: {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(request)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl min-h-[44px] transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      승인
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(request)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-rose-700 bg-white border-2 border-rose-200 hover:bg-rose-50 disabled:opacity-50 rounded-xl min-h-[44px] transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  반려
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
