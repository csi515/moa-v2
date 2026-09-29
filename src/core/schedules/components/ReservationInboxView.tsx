import React, { useState, useEffect } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { reservationService } from '@/core/schedules';
import { Modal } from '@/shared/components/ui/Modal';
import type { ReservationDetail, ReservationStatus } from '@/types';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Filter,
} from 'lucide-react';

export const ReservationInboxView: React.FC<{
  embedded?: boolean;
  includeReservation?: (row: ReservationDetail) => boolean;
  emptyHint?: string;
}> = ({
  embedded = false,
  includeReservation,
  emptyHint,
}) => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('requested');
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState<ReservationDetail | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadReservations();
    }
  }, [currentOrganization, statusFilter, includeReservation]);

  const loadReservations = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoading(true);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await reservationService.getOrganizationReservations(
        currentOrganization.id,
        status
      );
      setReservations(includeReservation ? data.filter(includeReservation) : data);
    } catch (err) {
      setReservations([]);
      if (!includeReservation) showToast('예약 목록을 불러오는데 실패했습니다.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (reservation: ReservationDetail) => {
    openConfirmDialog({
      title: '예약 확정',
      message: `${reservation.applicant_name}님의 예약을 확정하시겠습니까?\n\n일정: ${reservation.schedule_title}\n시간: ${formatDateTime(reservation.schedule_starts_at)}`,
      confirmText: '확정하기',
      onConfirm: async () => {
        try {
          await reservationService.confirmReservation(reservation.id);
          showToast('예약이 확정되었습니다.', 'success');
          loadReservations();
        } catch (err: any) {
          const errorMsg = err?.message || '예약 확정에 실패했습니다.';
          showToast(errorMsg, 'error');
          console.error(err);
        }
      },
    });
  };

  const handleOpenCancelModal = (reservation: ReservationDetail) => {
    setCancellingReservation(reservation);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async () => {
    if (!cancellingReservation) return;

    try {
      await reservationService.cancelReservation(
        cancellingReservation.id,
        cancelReason || undefined
      );
      showToast('예약이 취소되었습니다.', 'info');
      setShowCancelModal(false);
      setCancellingReservation(null);
      loadReservations();
    } catch (err) {
      showToast('예약 취소에 실패했습니다.', 'error');
      console.error(err);
    }
  };

  const handleViewDetail = (reservation: ReservationDetail) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const badges = {
      requested: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        label: '신청됨',
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: '확정됨',
      },
      cancelled: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: '취소됨',
      },
    };

    const badge = badges[status];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} text-xs font-semibold rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const requestedCount = reservations.filter((r) => r.status === 'requested').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const cancelledCount = reservations.filter((r) => r.status === 'cancelled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-600">예약 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {/* Header */}
      {!embedded && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-600" />
            예약 관리
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            고객의 예약 신청을 확인하고 승인/취소합니다.
          </p>
        </div>
        {requestedCount > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl font-semibold">
            <Clock className="w-5 h-5" />
            {requestedCount}건의 신청 대기 중
          </div>
        )}
      </div>
      )}
      {embedded && requestedCount > 0 && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl font-semibold text-sm">
          <Clock className="w-4 h-4" />
          {requestedCount}건의 신청 대기 중
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('requested')}
          className={`p-3 sm:p-3.5 rounded-2xl border shadow-xs transition-all min-h-[44px] text-left ${
            statusFilter === 'requested'
              ? 'border-amber-300 bg-amber-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs text-amber-700 font-semibold">신청 대기</p>
          <p className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">{requestedCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('confirmed')}
          className={`p-3 sm:p-3.5 rounded-2xl border shadow-xs transition-all min-h-[44px] text-left ${
            statusFilter === 'confirmed'
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold">확정됨</p>
          <p className="text-lg sm:text-xl font-black text-emerald-900 mt-0.5">{confirmedCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('cancelled')}
          className={`p-3 sm:p-3.5 rounded-2xl border shadow-xs transition-all min-h-[44px] text-left ${
            statusFilter === 'cancelled'
              ? 'border-slate-400 bg-slate-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs text-slate-500">취소됨</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{cancelledCount}</p>
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-2">
          {(['all', 'requested', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'all' && '전체'}
              {status === 'requested' && '신청됨'}
              {status === 'confirmed' && '확정됨'}
              {status === 'cancelled' && '취소됨'}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation List */}
      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {emptyHint
              ? emptyHint
              : statusFilter === 'all'
                ? '예약 신청이 없습니다'
                : null}
            {!emptyHint && statusFilter === 'requested' && '신청 대기 중인 예약이 없습니다'}
            {!emptyHint && statusFilter === 'confirmed' && '확정된 예약이 없습니다'}
            {!emptyHint && statusFilter === 'cancelled' && '취소된 예약이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {reservation.schedule_title}
                        </h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(reservation.schedule_starts_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{reservation.applicant_name}</span>
                    </div>
                    {reservation.applicant_phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${reservation.applicant_phone}`} className="hover:text-indigo-600">
                          {reservation.applicant_phone}
                        </a>
                      </div>
                    )}
                    {reservation.applicant_email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${reservation.applicant_email}`} className="hover:text-indigo-600 truncate">
                          {reservation.applicant_email}
                        </a>
                      </div>
                    )}
                  </div>

                  {reservation.request_message && (
                    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg text-sm">
                      <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-700">{reservation.request_message}</p>
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    신청일시: {formatDate(reservation.created_at)}
                    {reservation.confirmed_at && (
                      <> • 확정일시: {formatDate(reservation.confirmed_at)}</>
                    )}
                    {reservation.cancelled_at && (
                      <> • 취소일시: {formatDate(reservation.cancelled_at)}</>
                    )}
                  </div>
                </div>

                {reservation.status === 'requested' && (
                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => handleConfirm(reservation)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      확정
                    </button>
                    <button
                      onClick={() => handleOpenCancelModal(reservation)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                )}

                {reservation.status !== 'requested' && (
                  <button
                    onClick={() => handleViewDetail(reservation)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    상세보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(showCancelModal && cancellingReservation)}
        onClose={() => setShowCancelModal(false)}
        title="예약 취소"
      >
        {cancellingReservation && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                <strong>{cancellingReservation.applicant_name}</strong>님의 예약을 취소하시겠습니까?
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  취소 사유 (선택)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="취소 사유를 입력하세요 (고객에게 전달될 수 있습니다)"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handleCancelSubmit}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  취소 확정
                </button>
              </div>
            </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(showDetailModal && selectedReservation)}
        onClose={() => setShowDetailModal(false)}
        title="예약 상세"
        maxWidth="lg"
      >
        {selectedReservation && (
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">예약 상태</div>
                  <div>{getStatusBadge(selectedReservation.status)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">일정</div>
                  <div className="font-medium text-slate-900">{selectedReservation.schedule_title}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">일시</div>
                  <div className="font-medium text-slate-900">
                    {formatDateTime(selectedReservation.schedule_starts_at)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">신청자</div>
                  <div className="font-medium text-slate-900">{selectedReservation.applicant_name}</div>
                </div>
                {selectedReservation.applicant_phone && (
                  <div>
                    <div className="text-slate-500 mb-1">연락처</div>
                    <div className="font-medium text-slate-900">{selectedReservation.applicant_phone}</div>
                  </div>
                )}
                {selectedReservation.applicant_email && (
                  <div>
                    <div className="text-slate-500 mb-1">이메일</div>
                    <div className="font-medium text-slate-900">{selectedReservation.applicant_email}</div>
                  </div>
                )}
                {selectedReservation.request_message && (
                  <div>
                    <div className="text-slate-500 mb-1">요청사항</div>
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-700">
                      {selectedReservation.request_message}
                    </div>
                  </div>
                )}
                {selectedReservation.cancel_reason && (
                  <div>
                    <div className="text-slate-500 mb-1">취소 사유</div>
                    <div className="p-3 bg-red-50 rounded-lg text-red-700">
                      {selectedReservation.cancel_reason}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
        )}
      </Modal>
    </div>
  );
};
