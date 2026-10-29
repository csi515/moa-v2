import { useState, type FC } from 'react';
import { CalendarPlus, MessageSquareText, QrCode } from 'lucide-react';
import { ConsultationRecordsView } from '@/capabilities/consultation';
import { ReservationInboxView } from '@/core/schedules/components/ReservationInboxView';
import { ConsultationQrModal } from '@/core/schedules/components/ConsultationQrModal';
import { CreateConsultationScheduleModal } from '@/core/schedules/components/CreateConsultationScheduleModal';
import { CustomerJoinRequestsPanel } from '@/core/customer/CustomerJoinRequestsPanel';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { ConsultationTodaySection } from './ConsultationTodaySection';

import { isConsultationWorkSegment, usePianoConsultationHub, type ConsultationSegment } from './usePianoConsultationHub';

function workDescription(
  segment: ConsultationSegment,
  pendingInquiryCount: number,
  pendingToday: number
): string | undefined {
  if (segment === 'inquiries' && pendingInquiryCount > 0) {
    return `대기 문의 ${pendingInquiryCount}건`;
  }
  if (segment === 'home' && pendingToday > 0) {
    return `오늘 대기 예약 ${pendingToday}건`;
  }
  return undefined;
}

/**
 * 피아노 상담 허브 — 문의·예약·기록·오늘.
 * 가입 신청은 학생「등록」, 가능시간은 설정→부가.
 */
export const PianoConsultationHubView: FC = () => {
  const [showQr, setShowQr] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const {
    currentOrganization,
    isScoped,
    segment,
    setSegment,
    options,
    todayRows,
    loadingToday,
    todayError,
    pendingInquiryCount,
    pendingToday,
    keepReservation,
    keepInquiry,
    loadToday,
  } = usePianoConsultationHub();

  const orgName = currentOrganization?.name || '사업장';
  const publicCode = currentOrganization?.public_code;
  const inWork = isConsultationWorkSegment(segment);
  /** 원장용 상담 QR·일정만 (가입·가능시간은 대표 진입점 분리) */
  const showOwnerTools = !isScoped;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<MessageSquareText className="w-6 h-6" />}
        title="상담"
        description={workDescription(segment, pendingInquiryCount, pendingToday)}
      />

      {inWork && (
        <SegmentedControl
          value={segment}
          options={options}
          onChange={setSegment}
          aria-label="상담 업무"
          fullWidth
          className="w-full"
        />
      )}

      {segment === 'inquiries' && (
        <CustomerJoinRequestsPanel
          embedded
          requestType="consultation"
          title="상담 문의"
          includeRequest={isScoped ? keepInquiry : undefined}
          emptyHint={isScoped ? '담당 상담 문의가 없습니다.' : undefined}
        />
      )}

      {segment === 'reservations' && (
        <ReservationInboxView
          embedded
          includeReservation={isScoped ? keepReservation : undefined}
          emptyHint={isScoped ? '담당 상담 예약이 없습니다.' : undefined}
        />
      )}

      {segment === 'records' && <ConsultationRecordsView embedded />}

      {segment === 'home' && (
        <ConsultationTodaySection
          loading={loadingToday}
          error={todayError}
          rows={todayRows}
          isScoped={isScoped}
          pendingInquiryCount={pendingInquiryCount}
          onOpenReservations={() => setSegment('reservations')}
          onOpenInquiries={() => setSegment('inquiries')}
          onRetry={() => void loadToday()}
        />
      )}

      {showOwnerTools && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">
            상담 도구
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              상담 QR
            </button>
            <button
              type="button"
              onClick={() => setShowCreateSchedule(true)}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-white"
            >
              <CalendarPlus className="w-4 h-4 text-indigo-600" />
              상담 일정
            </button>
          </div>
        </section>
      )}

      {showQr && (
        <ConsultationQrModal
          organizationName={orgName}
          publicCode={publicCode}
          onClose={() => setShowQr(false)}
        />
      )}
      {showCreateSchedule && (
        <CreateConsultationScheduleModal
          onClose={() => setShowCreateSchedule(false)}
          onCreated={() => {
            if (segment === 'home') void loadToday();
          }}
        />
      )}
    </div>
  );
};
