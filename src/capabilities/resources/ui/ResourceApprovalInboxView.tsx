import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type { Resource, ResourceReservation } from '../types';
import {
  listPendingReservations,
  reviewResourceReservation,
} from '../reservationService';
import { listResources, canUserApproveReservation } from '../resourceService';

interface ResourceApprovalInboxViewProps {
  organizationId: string;
  currentUser: {
    userId?: string | null;
    staffId?: string | null;
    role?: string | null;
  };
  onActionComplete?: () => void;
}

export const ResourceApprovalInboxView: React.FC<ResourceApprovalInboxViewProps> = ({
  organizationId,
  currentUser,
  onActionComplete,
}) => {
  const [pendingList, setPendingList] = useState<ResourceReservation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 반려 사유 모달 상태
  const [rejectingItem, setRejectingItem] = useState<ResourceReservation | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resList, reservations] = await Promise.all([
        listResources({ organizationId }),
        listPendingReservations(organizationId),
      ]);
      setResources(resList);
      setPendingList(reservations);
    } catch (err) {
      console.error('Failed to load pending resource approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      void loadData();
    }
  }, [organizationId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  // 현재 사용자에게 승인 권한이 있는 대기 건만 필터링
  const myActionableList = useMemo(() => {
    return pendingList.filter((item) => {
      const res = resourceMap.get(item.resourceId);
      if (!res) return true; // 자원 정보 미매칭 시 안전하게 표시
      return canUserApproveReservation(res, currentUser);
    });
  }, [pendingList, resourceMap, currentUser]);

  // 1. 승인 처리
  const handleApprove = async (reservation: ResourceReservation) => {
    try {
      setProcessingId(reservation.id);
      await reviewResourceReservation(reservation.id, true);
      setPendingList((prev) => prev.filter((p) => p.id !== reservation.id));
      showToast(`'${reservation.resourceName || '자원'}' 예약 신청을 승인했습니다.`);
      onActionComplete?.();
    } catch (err) {
      console.error('Failed to approve reservation:', err);
      showToast(err instanceof Error ? err.message : '예약 승인 처리에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  // 2. 반려 처리
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setProcessingId(rejectingItem.id);
      await reviewResourceReservation(
        rejectingItem.id,
        false,
        rejectReason.trim() || '관리자 사유에 의한 반려'
      );
      setPendingList((prev) => prev.filter((p) => p.id !== rejectingItem.id));
      showToast(`'${rejectingItem.resourceName || '자원'}' 예약 신청을 반려했습니다.`);
      setRejectingItem(null);
      setRejectReason('');
      onActionComplete?.();
    } catch (err) {
      console.error('Failed to reject reservation:', err);
      showToast(err instanceof Error ? err.message : '예약 반려 처리에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 헤더 바 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              내 승인 대기함 ({myActionableList.length}건)
            </h3>
            <p className="text-xs text-slate-500">
              내가 승인권자로 지정된 자원의 결재 요청을 검토하고 승인 또는 반려합니다.
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 목록 컨텐츠 */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          결재 대기 목록을 불러오는 중...
        </div>
      ) : myActionableList.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          현재 검토가 필요한 예약 승인 대기 건이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {myActionableList.map((item) => {
            const isProcessing = processingId === item.id;
            const res = resourceMap.get(item.resourceId);
            const metadata = (res?.metadata || {}) as Record<string, any>;

            const starts = item.starts_at ? item.starts_at.replace('T', ' ').substring(0, 16) : '';
            const endsTime = item.ends_at ? item.ends_at.substring(11, 16) : '';

            return (
              <div
                key={item.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[11px] font-bold">
                        {metadata.category === 'vehicle'
                          ? '차량'
                          : metadata.category === 'meeting_room'
                          ? '회의실'
                          : metadata.category === 'health_room'
                          ? '보건실'
                          : '공용자원'}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">
                        {item.resourceName || res?.name || '자원'}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      승인 대기
                    </span>
                  </div>

                  {/* 시간 및 목적 정보 */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{starts} ~ {endsTime}</span>
                    </div>
                    {item.memo && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                        <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="line-clamp-2">{item.memo}</span>
                      </div>
                    )}
                    {item.customerName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>신청자: {item.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 하단 결재 버튼 */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRejectingItem(item);
                      setRejectReason('');
                    }}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    반려
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    승인 확정
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 반려 사유 입력 모달 */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">예약 신청 반려</h3>
            <p className="text-xs text-slate-500">
              '{rejectingItem.resourceName}' 신청을 반려하시겠습니까? 신청자에게 전달될 반려 사유를 입력하세요.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="예: 긴급 외근 배차로 인한 일정 조정 필요, 회의실 정기 점검 시간"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                반려 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceApprovalInboxView;
