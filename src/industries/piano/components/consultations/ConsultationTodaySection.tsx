import type { FC } from 'react';
import { Clock, Loader2, Phone, User } from 'lucide-react';
import type { ReservationDetail } from '@/types';
import { consultationStatusLabel, formatConsultationTime } from './usePianoConsultationHub';

/** 상담 허브 「오늘」세그먼트 — loading / error / empty 일관 처리 */
export const ConsultationTodaySection: FC<{
  loading: boolean;
  error?: boolean;
  rows: ReservationDetail[];
  isScoped: boolean;
  pendingInquiryCount: number;
  onOpenReservations: () => void;
  onOpenInquiries: () => void;
  onRetry?: () => void;
}> = ({
  loading,
  error = false,
  rows,
  isScoped,
  pendingInquiryCount,
  onOpenReservations,
  onOpenInquiries,
  onRetry,
}) => (
  <section className="space-y-3">
    <h3 className="text-sm font-bold text-slate-900">오늘 상담</h3>
    {loading ? (
      <div className="py-10 flex justify-center" role="status" aria-label="불러오는 중">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    ) : error ? (
      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-4 py-8 text-center space-y-2">
        <p className="text-sm font-bold text-rose-800">오늘 상담을 불러오지 못했습니다</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] px-3 text-xs font-bold text-indigo-600"
          >
            다시 시도
          </button>
        )}
      </div>
    ) : rows.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-bold text-slate-700">오늘 예정된 상담이 없습니다</p>
        <p className="text-xs text-slate-500 mt-1">
          {isScoped
            ? '담당 학생이거나 본인 상담만 표시됩니다.'
            : '설정에서 가능시간을 지정하거나 상담 일정을 추가하세요.'}
        </p>
      </div>
    ) : (
      <ul className="space-y-2">
        {rows.map((row) => {
          const badge = consultationStatusLabel(row.status);
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            >
              <div className="flex items-center gap-2 shrink-0">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatConsultationTime(row.schedule_starts_at)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {row.applicant_name}
                </p>
                {row.applicant_phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {row.applicant_phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenReservations}
                className="text-xs font-bold text-indigo-600 min-h-[44px] px-2 self-start sm:self-center"
              >
                예약에서 보기
              </button>
            </li>
          );
        })}
      </ul>
    )}

    {pendingInquiryCount > 0 && (
      <button
        type="button"
        onClick={onOpenInquiries}
        className="w-full min-h-[44px] rounded-xl border border-violet-200 bg-violet-50 text-sm font-bold text-violet-800"
      >
        상담 문의 {pendingInquiryCount}건
      </button>
    )}

    <div className="pt-2">
      <button
        type="button"
        onClick={onOpenReservations}
        className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        전체 상담 신청 보기
      </button>
    </div>
  </section>
);
