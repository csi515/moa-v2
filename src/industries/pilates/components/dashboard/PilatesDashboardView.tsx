import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh, useStaffScope } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { useScheduleService } from '@/core/services/useScheduleService';
import {
  buildSlotKey,
  buildSlotOccupancyIndex,
  getSlotCapacityInfo,
  groupBookingsIntoSlots,
} from '@/capabilities/scheduling/capacity';
import { StorageService } from '@/services/storage';
import { PageHeader, SummaryMetricCard, EmptyState } from '@/shared/components';
import { formatKoreanDate } from '@/utils/formatters';
import { Activity, Calendar, Users, Dumbbell, Plus } from 'lucide-react';

/** 필라테스 강사 전용 축소 대시보드 */
const PilatesStaffDashboard: React.FC = () => {
  const { setActiveTab } = useApp();
  const refreshKey = useStorageRefresh('bookings');
  const { scopeBookings, scopeMembersForPilates, staffId } = useStaffScope();

  const today = new Date().toISOString().slice(0, 10);
  const scheduleService = useScheduleService();
  const allBookingsRaw = scheduleService.getBookings();
  const occupancyIndex = useMemo(
    () => buildSlotOccupancyIndex(allBookingsRaw),
    [allBookingsRaw, refreshKey]
  );
  const todayBookings = useMemo(
    () => scopeBookings(scheduleService.getBookingsByDate(today)),
    [today, scopeBookings, refreshKey]
  );
  const upcoming = useMemo(
    () => scopeBookings(scheduleService.getUpcomingBookings(5)),
    [scopeBookings, refreshKey]
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
        icon={<Activity className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title="강사 대시보드"
        description={`${formatKoreanDate(today)} · 내 예약과 담당 회원`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <SummaryMetricCard
          label="오늘 예약"
          value={`${todayBookings.length}건`}
          variant="teal"
          onClick={() => setActiveTab('bookings')}
        />
        <SummaryMetricCard label="확정/예약" value={`${confirmedToday}건`} variant="emerald" />
        <SummaryMetricCard
          label="담당 회원"
          value={`${members.length}명`}
          onClick={() => setActiveTab('members')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-teal-600" />
              오늘 예약
            </h3>
            <button type="button" onClick={() => setActiveTab('bookings')} className="text-xs font-bold text-teal-600 hover:underline min-h-[44px] px-1">
              전체
            </button>
          </div>
          {todayBookings.length === 0 &&
          !scheduleService.getSlotRecruitments().some(
            (item) =>
              item.maxCapacity &&
              item.staffId &&
              (!staffId || item.staffId === staffId) &&
              item.startsAt.startsWith(today)
          ) ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="오늘 예약이 없습니다"
              description="예약 캘린더에서 수업을 등록해 보세요."
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  예약 추가
                </button>
              }
              className="p-4 border-0 shadow-none bg-slate-50/50 rounded-xl"
            />
          ) : (
            <div className="space-y-1.5">
              {groupBookingsIntoSlots(todayBookings)
                .concat(
                  scheduleService.getSlotRecruitments()
                    .filter((item) => {
                      if (!item.serviceId || !item.staffId || !item.maxCapacity) return false;
                      if (staffId && item.staffId !== staffId) return false;
                      if (!item.startsAt.startsWith(today)) return false;
                      return !todayBookings.some(
                        (booking) =>
                          booking.serviceId &&
                          booking.staffId &&
                          buildSlotKey(booking.serviceId, booking.staffId, booking.startsAt) ===
                            buildSlotKey(item.serviceId, item.staffId, item.startsAt)
                      );
                    })
                    .map((item) => ({
                      key: buildSlotKey(item.serviceId, item.staffId, item.startsAt),
                      serviceId: item.serviceId,
                      staffId: item.staffId,
                      startsAt: item.startsAt,
                      serviceName:
                        scheduleService.getServiceOfferings().find((service) => service.id === item.serviceId)?.name ||
                        '수업',
                      staffName: '',
                      endsAt: '',
                      bookings: [],
                    }))
                )
                .map((group) => {
                const service = scheduleService.getServiceOfferings().find((s) => s.id === group.serviceId);
                const capacity =
                  service && group.staffId
                    ? getSlotCapacityInfo({
                        service,
                        staffId: group.staffId,
                        startsAt: group.startsAt,
                        bookings: allBookingsRaw,
                        recruitments: scheduleService.getSlotRecruitments(),
                        occupancyIndex,
                      })
                    : null;
                return (
                <div key={group.key} className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <p className="font-bold text-slate-900">
                    {group.startsAt.slice(11, 16)} · {group.serviceName || '수업'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {group.bookings.length > 0
                      ? group.bookings.map((b) => b.customerName).join(', ')
                      : '아직 등록된 회원이 없습니다'}
                    {capacity ? ` · 잔여 ${capacity.remaining}자리` : ''}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2.5 text-sm">
            <Users className="w-4 h-4 text-teal-600" />
            담당 회원
          </h3>
          {members.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="담당 회원이 없습니다"
              description="예약이 연결되면 담당 회원이 표시됩니다."
              className="p-4 border-0 shadow-none bg-slate-50/50 rounded-xl"
            />
          ) : (
            <div className="space-y-1.5">
              {members.slice(0, 6).map((m) => (
                <div key={m.id} className="px-2.5 py-2 rounded-xl bg-teal-50/50 border border-teal-100 text-sm font-bold text-slate-900">
                  {m.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {upcoming.some((b) => !b.startsAt.startsWith(today)) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <h3 className="font-bold text-slate-900 mb-2 text-sm">다가오는 예약</h3>
          <div className="space-y-1.5">
            {upcoming
              .filter((b) => !b.startsAt.startsWith(today))
              .map((b) => (
              <div key={b.id} className="flex justify-between px-2.5 py-2 rounded-xl bg-slate-50 text-sm">
                <span className="font-bold">{b.customerName}</span>
                <span className="text-[11px] text-teal-700">{b.startsAt.slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PilatesAdminDashboard: React.FC = () => {
  const scheduleService = useScheduleService();
  const { setActiveTab } = useApp();
  const refreshKey = useStorageRefresh('bookings');

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = useMemo(
    () => scheduleService.getBookingsByDate(today),
    [today, refreshKey]
  );
  const upcoming = useMemo(() => scheduleService.getUpcomingBookings(5), [refreshKey]);
  const members = StorageService.getStudents().filter((s) => s.status === 'active');
  const instructors = StorageService.getTeachers().filter((t) => t.status === 'active');
  const services = scheduleService.getActiveServiceOfferings();

  const confirmedToday = todayBookings.filter((b) => b.status === 'confirmed' || b.status === 'scheduled').length;

  return (
    <div className="space-y-4 pb-4" data-testid="director-home">
      <PageHeader
        density="compact"
        icon={<Activity className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title="필라테스 스튜디오"
        description={`${formatKoreanDate(today)} · 오늘의 예약과 운영 현황`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SummaryMetricCard
          label="오늘 예약"
          value={`${todayBookings.length}건`}
          variant="teal"
          onClick={() => setActiveTab('bookings')}
        />
        <SummaryMetricCard label="확정/예약" value={`${confirmedToday}건`} variant="emerald" />
        <SummaryMetricCard
          label="재적 회원"
          value={`${members.length}명`}
          onClick={() => setActiveTab('members')}
        />
        <SummaryMetricCard
          label="수업 종류"
          value={`${services.length}개`}
          variant="purple"
          onClick={() => setActiveTab('services')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-teal-600" />
              오늘 예약
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className="text-xs font-bold text-teal-600 hover:underline min-h-[44px] px-1"
            >
              전체
            </button>
          </div>
          {todayBookings.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="오늘 예약이 없습니다"
              description="예약 캘린더에서 수업을 등록해 보세요."
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
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
                    {b.startsAt.slice(11, 16)} · {b.serviceName || '수업'} · {b.staffName || '강사 미지정'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2.5 text-sm">
            <Dumbbell className="w-4 h-4 text-purple-600" />
            다가오는 예약
          </h3>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="예정된 예약이 없습니다"
              description="다가오는 수업 예약이 여기에 표시됩니다."
              className="p-4 border-0 shadow-none bg-slate-50/50 rounded-xl"
            />
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((b) => (
                <div key={b.id} className="flex justify-between px-2.5 py-2 rounded-xl bg-teal-50/50 border border-teal-100 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{b.customerName}</p>
                    <p className="text-[11px] text-slate-500">{b.serviceName}</p>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700">{b.startsAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 px-0.5">
        강사 {instructors.length}명 · 지표를 눌러 회원·수업 종류로 이동합니다.
      </p>
    </div>
  );
};

export const PilatesDashboardView: React.FC = () => {
  const { isStaff } = usePermissions();
  return isStaff ? <PilatesStaffDashboard /> : <PilatesAdminDashboard />;
};
