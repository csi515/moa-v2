import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService } from '@/core/schedules';
import type { MyReservation, ReservationStatus } from '@/types';
import { 
  Calendar, 
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export interface ParentBookingsViewProps {
  student?: any; // Optional for compatibility with parent portal tabs
}

export const MyReservationsView: React.FC<ParentBookingsViewProps> = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');

  useEffect(() => {
    loadReservations();
  }, [statusFilter]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await reservationService.getMyReservations(status);
      setReservations(data);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservation: MyReservation) => {
    if (!window.confirm(`'${reservation.schedule_title}' 예약을 취소하시겠습니까?`)) {
      return;
    }

    try {
      await reservationService.cancelReservation(reservation.id);
      alert('예약이 취소되었습니다.');
      loadReservations();
    } catch (err: any) {
      alert(err?.message || '예약 취소에 실패했습니다.');
    }
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
        icon: HelpCircle,
        label: '신청됨',
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: CheckCircle2,
        label: '확정됨',
      },
      cancelled: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        icon: XCircle,
        label: '취소됨',
      },
    };

    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${badge.bg} ${badge.text} text-sm font-semibold rounded-full`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const upcomingReservations = reservations.filter(
    (r) => r.status !== 'cancelled' && new Date(r.schedule_starts_at) > new Date()
  );
  const pastReservations = reservations.filter(
    (r) => r.status !== 'cancelled' && new Date(r.schedule_starts_at) <= new Date()
  );
  const cancelledReservations = reservations.filter((r) => r.status === 'cancelled');

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-7 h-7 text-indigo-600" />
              내 예약
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              나의 예약 현황을 확인하고 관리합니다
            </p>
          </div>
          <button
            onClick={loadReservations}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl sm:text-3xl font-black text-yellow-600">{reservations.filter(r => r.status === 'requested').length}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">신청 대기</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl sm:text-3xl font-black text-green-600">{reservations.filter(r => r.status === 'confirmed').length}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">확정됨</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-2xl sm:text-3xl font-black text-slate-600">{reservations.filter(r => r.status === 'cancelled').length}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">취소됨</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'requested', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status === 'all' && '전체'}
              {status === 'requested' && '신청됨'}
              {status === 'confirmed' && '확정됨'}
              {status === 'cancelled' && '취소됨'}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {reservations.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium mb-4">예약 내역이 없습니다</p>
            <button
              onClick={() => navigate('/')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
            >
              예약 가능한 조직 찾기
            </button>
          </div>
        )}

        {/* Upcoming Reservations */}
        {statusFilter === 'all' && upcomingReservations.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">다가오는 예약</h2>
            <div className="space-y-3">
              {upcomingReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={handleCancelReservation}
                  formatDateTime={formatDateTime}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Reservations */}
        {statusFilter === 'all' && pastReservations.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">지난 예약</h2>
            <div className="space-y-3">
              {pastReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={handleCancelReservation}
                  formatDateTime={formatDateTime}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  isPast
                />
              ))}
            </div>
          </section>
        )}

        {/* Cancelled Reservations */}
        {statusFilter === 'all' && cancelledReservations.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">취소된 예약</h2>
            <div className="space-y-3">
              {cancelledReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={handleCancelReservation}
                  formatDateTime={formatDateTime}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  isCancelled
                />
              ))}
            </div>
          </section>
        )}

        {/* Filtered Results */}
        {statusFilter !== 'all' && (
          <section>
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={handleCancelReservation}
                  formatDateTime={formatDateTime}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  isPast={new Date(reservation.schedule_starts_at) <= new Date()}
                  isCancelled={reservation.status === 'cancelled'}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

interface ReservationCardProps {
  reservation: MyReservation;
  onCancel: (reservation: MyReservation) => void;
  formatDateTime: (isoString: string) => string;
  formatDate: (isoString: string) => string;
  getStatusBadge: (status: ReservationStatus) => React.ReactNode;
  isPast?: boolean;
  isCancelled?: boolean;
}

const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onCancel,
  formatDateTime,
  formatDate,
  getStatusBadge,
  isPast,
  isCancelled,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border p-4 sm:p-6 transition-all ${
        isCancelled ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-slate-900 truncate">
                {reservation.schedule_title}
              </h3>
              {getStatusBadge(reservation.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{reservation.organization_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatDateTime(reservation.schedule_starts_at)}</span>
            </div>
          </div>

          {reservation.request_message && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
              <strong>요청사항:</strong> {reservation.request_message}
            </div>
          )}

          {reservation.cancel_reason && (
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <strong>취소 사유:</strong> {reservation.cancel_reason}
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

        {reservation.status === 'requested' && !isPast && (
          <button
            onClick={() => onCancel(reservation)}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            취소
          </button>
        )}
      </div>
    </div>
  );
};

// Export alias for parent portal compatibility
export const ParentBookingsView = MyReservationsView;
