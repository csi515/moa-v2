import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh, useStaffScope } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { useScheduleService } from '@/core/services/useScheduleService';
import { isUnassignedCustomerRequest } from '@/industries/skin/bookingRooms';
import { StorageService } from '@/services/storage';
import { PageHeader, SummaryMetricCard, EmptyState } from '@/shared/components';
import { formatKoreanDate } from '@/utils/formatters';
import { Calendar, Plus, Sparkles, Users } from 'lucide-react';

const SkinStaffDashboard: React.FC = () => {
  const { setActiveTab } = useApp();
  const labels = useModuleLabels();
  const refreshKey = useStorageRefresh('bookings');
  const { scopeBookings, scopeMembersForPilates } = useStaffScope();
  const staff = labels.staff.singular;
  const customer = labels.customer.singular;
  const service = labels.service.singular;

  const today = new Date().toISOString().slice(0, 10);
  const scheduleService = useScheduleService();
  const allBookingsRaw = scheduleService.getBookings();
  const todayBookings = useMemo(() => {
    const scoped = scopeBookings(scheduleService.getBookingsByDate(today));
    const inbox = allBookingsRaw.filter(
      (b) => isUnassignedCustomerRequest(b) && b.startsAt.startsWith(today)
    );
    const seen = new Set(scoped.map((b) => b.id));
    return [...scoped, ...inbox.filter((b) => !seen.has(b.id))];
  }, [today, scopeBookings, allBookingsRaw, refreshKey]);
  const pendingRequests = useMemo(
    () => allBookingsRaw.filter(isUnassignedCustomerRequest),
    [allBookingsRaw, refreshKey]
  );
  const members = useMemo(
    () =>
      scopeMembersForPilates(
        StorageService.getStudents().filter((s) => s.status === 'active'),
        allBookingsRaw
      ),
    [allBookingsRaw, scopeMembersForPilates, refreshKey]
  );
  const confirmedToday = todayBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'scheduled'
  ).length;

  return (
    <div className="space-y-4 pb-4" data-testid="staff-home">
      <PageHeader
        density="compact"
        icon={<Sparkles className="w-5 h-5" />}
        iconClassName="text-rose-600"
        title={`${staff} 홈`}
        description={`${formatKoreanDate(today)} · 내 예약과 담당 ${customer}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SummaryMetricCard
          label="오늘 예약"
          value={`${todayBookings.length}건`}
          variant="rose"
          onClick={() => setActiveTab('bookings')}
        />
        <SummaryMetricCard
          label="가져갈 신청"
          value={`${pendingRequests.length}건`}
          variant="rose"
          onClick={() => setActiveTab('bookings')}
        />
        <SummaryMetricCard label="확정/예약" value={`${confirmedToday}건`} variant="emerald" />
        <SummaryMetricCard
          label={`담당 ${customer}`}
          value={`${members.length}명`}
          onClick={() => setActiveTab('members')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-rose-600" />
            오늘 예약
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className="text-xs font-bold text-rose-600 hover:underline min-h-[44px] px-1"
          >
            전체
          </button>
        </div>
        {todayBookings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="오늘 예약이 없습니다"
            description={`예약 캘린더에서 ${service}을 등록해 보세요.`}
            action={
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                예약 추가
              </button>
            }
            className="p-4 border-0 shadow-none bg-slate-50/50 rounded-xl"
          />
        ) : (
          <div className="space-y-1.5">
            {todayBookings.map((b) => (
              <div key={b.id} className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                <p className="font-bold text-slate-900">{b.customerName}</p>
                <p className="text-[11px] text-slate-500">
                  {b.startsAt.slice(11, 16)} · {b.serviceName || service}
                  {isUnassignedCustomerRequest(b) ? ' · 신청' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SkinAdminDashboard: React.FC = () => {
  const scheduleService = useScheduleService();
  const { setActiveTab } = useApp();
  const labels = useModuleLabels();
  const refreshKey = useStorageRefresh('bookings');
  const customer = labels.customer.singular;
  const staff = labels.staff.singular;
  const service = labels.service.management;

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = useMemo(
    () => scheduleService.getBookingsByDate(today),
    [today, refreshKey]
  );
  const upcoming = useMemo(() => scheduleService.getUpcomingBookings(5), [refreshKey]);
  const members = StorageService.getStudents().filter((s) => s.status === 'active');
  const staffCount = StorageService.getTeachers().filter((t) => t.status === 'active').length;
  const services = scheduleService.getActiveServiceOfferings();
  const confirmedToday = todayBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'scheduled'
  ).length;
  const pendingRequests = todayBookings.filter(
    (b) => b.requestedBy === 'customer' && b.status === 'scheduled'
  ).length;
  const revisit = useMemo(() => {
    const latest = new Map<string, { name: string; startsAt: string; serviceId?: string }>();
    for (const booking of scheduleService.getBookings()) {
      if (booking.status !== 'completed' || booking.waitlist) continue;
      const prev = latest.get(booking.customerId);
      if (!prev || booking.startsAt > prev.startsAt) {
        latest.set(booking.customerId, {
          name: booking.customerName,
          startsAt: booking.startsAt,
          serviceId: booking.serviceId,
        });
      }
    }
    const dueList: Array<{ id: string; name: string; due: string }> = [];
    for (const [id, last] of latest) {
      const offering = services.find((item) => item.id === last.serviceId);
      if (!offering?.careIntervalDays) continue;
      const due = new Date(last.startsAt);
      due.setDate(due.getDate() + offering.careIntervalDays);
      const dueIso = due.toISOString().slice(0, 10);
      if (dueIso <= today) dueList.push({ id, name: last.name, due: dueIso });
    }
    return dueList.slice(0, 8);
  }, [services, today, refreshKey]);

  return (
    <div className="space-y-4 pb-4" data-testid="director-home">
      <PageHeader
        density="compact"
        icon={<Sparkles className="w-5 h-5" />}
        iconClassName="text-rose-600"
        title="피부관리"
        description={`${formatKoreanDate(today)} · 오늘의 예약과 운영 현황`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SummaryMetricCard
          label="오늘 예약"
          value={`${todayBookings.length}건`}
          variant="rose"
          onClick={() => setActiveTab('bookings')}
        />
        <SummaryMetricCard label="오늘 신청" value={`${pendingRequests}건`} variant="rose" />
        <SummaryMetricCard label="확정/예약" value={`${confirmedToday}건`} variant="emerald" />
        <SummaryMetricCard
          label={`재적 ${customer}`}
          value={`${members.length}명`}
          onClick={() => setActiveTab('members')}
        />
        <SummaryMetricCard
          label={service}
          value={`${services.length}개`}
          onClick={() => setActiveTab('services')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2.5 text-sm">
          <Users className="w-4 h-4 text-rose-600" />
          다가오는 예약
        </h3>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="예정된 예약이 없습니다"
            description="예약 캘린더에서 시술을 등록해 보세요."
            className="p-4 border-0 shadow-none bg-slate-50/50 rounded-xl"
          />
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="flex justify-between px-2.5 py-2 rounded-xl bg-rose-50/50 border border-rose-100 text-sm"
              >
                <div>
                  <p className="font-bold text-slate-900">{b.customerName}</p>
                  <p className="text-[11px] text-slate-500">{b.serviceName}</p>
                </div>
                <span className="text-[11px] font-bold text-rose-700">
                  {b.startsAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {revisit.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <h3 className="font-bold text-slate-900 text-sm mb-2">다시 올 시기</h3>
          <div className="space-y-1.5">
            {revisit.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab('members')}
                className="w-full text-left px-2.5 py-2 rounded-xl bg-rose-50/50 border border-rose-100 text-sm min-h-[44px]"
              >
                <span className="font-bold text-slate-900">{item.name}</span>
                <span className="block text-[11px] text-slate-500">권장일 {item.due}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500 px-0.5">
        {staff} {staffCount}명 · 지표를 눌러 {customer}·{service}로 이동합니다.
      </p>
    </div>
  );
};

export const SkinDashboardView: React.FC = () => {
  const { isStaff } = usePermissions();
  return isStaff ? <SkinStaffDashboard /> : <SkinAdminDashboard />;
};
