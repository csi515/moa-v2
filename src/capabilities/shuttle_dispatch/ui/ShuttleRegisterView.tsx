import React, { useEffect, useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { useCreate, useList, useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { normalizeDriverPhoneForTel } from '../domain/shuttleRosterEngine';

type RouteRow = {
  id: string;
  tenant_id: string;
  name: string;
  direction: string;
  departure_time: string;
  capacity: number;
  is_active: boolean;
  driver_name: string | null;
  driver_phone: string | null;
};

type StopRow = {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  pickup_time: string | null;
  dropoff_time: string | null;
  is_pickup: boolean;
  is_dropoff: boolean;
};

type RegistrationRow = {
  id: string;
  tenant_id: string;
  member_id: string;
  route_id: string | null;
  pickup_stop_id: string | null;
  dropoff_stop_id: string | null;
  is_active: boolean;
};

function formatClock(time: string | null | undefined, suffix: string): string {
  if (!time) return '';
  const short = time.slice(0, 5);
  return ` (${short} ${suffix})`;
}

export const ShuttleRegisterView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const memberId = selectedMembership?.id ?? null;

  const [useShuttle, setUseShuttle] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');

  const { query: routesQuery } = useList<RouteRow>({
    resource: 'shuttle_routes',
    meta: { schema: 'core' },
    filters: orgId
      ? [{ field: 'tenant_id', operator: 'eq', value: orgId }, { field: 'is_active', operator: 'eq', value: true }]
      : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const { query: regQuery } = useList<RegistrationRow>({
    resource: 'shuttle_registrations',
    meta: { schema: 'core' },
    filters:
      orgId && memberId
        ? [
            { field: 'tenant_id', operator: 'eq', value: orgId },
            { field: 'member_id', operator: 'eq', value: memberId },
          ]
        : [],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: Boolean(orgId && memberId) },
  });

  const { query: stopsQuery } = useList<StopRow>({
    resource: 'shuttle_stops',
    meta: { schema: 'core' },
    filters: routeId ? [{ field: 'route_id', operator: 'eq', value: routeId }] : [],
    sorters: [{ field: 'stop_order', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(routeId) },
  });

  const routes = (routesQuery.data?.data as RouteRow[]) ?? [];
  const existing = (regQuery.data?.data as RegistrationRow[])?.[0] ?? null;
  const stops = (stopsQuery.data?.data as StopRow[]) ?? [];

  const pickupOptions = useMemo(
    () => stops.filter((s) => s.is_pickup),
    [stops],
  );
  const dropoffOptions = useMemo(
    () => stops.filter((s) => s.is_dropoff),
    [stops],
  );

  useEffect(() => {
    if (!existing) return;
    setUseShuttle(existing.is_active);
    setRouteId(existing.route_id ?? '');
    setPickupStopId(existing.pickup_stop_id ?? '');
    setDropoffStopId(existing.dropoff_stop_id ?? '');
  }, [existing?.id, existing?.is_active, existing?.route_id, existing?.pickup_stop_id, existing?.dropoff_stop_id]);

  const { mutate: createReg, mutation: createMutation } = useCreate();
  const { mutate: updateReg, mutation: updateMutation } = useUpdate();
  const saving = createMutation.isPending || updateMutation.isPending;

  function save() {
    if (!orgId || !memberId) return;
    if (useShuttle && (!routeId || !pickupStopId || !dropoffStopId)) {
      showToast('노선과 승·하차 정류장을 모두 선택하세요.', 'error');
      return;
    }
    const values = {
      tenant_id: orgId,
      member_id: memberId,
      route_id: useShuttle ? routeId : null,
      pickup_stop_id: useShuttle ? pickupStopId : null,
      dropoff_stop_id: useShuttle ? dropoffStopId : null,
      is_active: useShuttle,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      updateReg(
        { resource: 'shuttle_registrations', id: existing.id, values, meta: { schema: 'core' } },
        {
          onSuccess: () => showToast('셔틀 이용 설정이 저장되었습니다.', 'success'),
          onError: (e) => showToast(e.message ?? '저장 실패', 'error'),
        },
      );
      return;
    }

    createReg(
      { resource: 'shuttle_registrations', values, meta: { schema: 'core' } },
      {
        onSuccess: () => showToast('셔틀 이용 설정이 저장되었습니다.', 'success'),
        onError: (e) => showToast(e.message ?? '저장 실패', 'error'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">내 통근 셔틀 설정</h1>
        <p className="text-sm text-slate-500">한 번만 설정하면 매일 동일하게 적용됩니다.</p>
      </header>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        aria-labelledby="shuttle-driver-contacts-heading"
      >
        <h2 id="shuttle-driver-contacts-heading" className="text-sm font-bold text-slate-900">
          노선별 기사 연락처
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">전직원이 확인할 수 있습니다. 통화 버튼으로 바로 연결하세요.</p>
        {routes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">등록된 활성 노선이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {routes.map((route) => {
              const tel = normalizeDriverPhoneForTel(route.driver_phone);
              const selected = route.id === routeId;
              return (
                <li
                  key={route.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    selected
                      ? 'border-indigo-300 bg-slate-50/80'
                      : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {route.name}
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                          ({route.direction === 'TO_WORK' ? '출근' : '퇴근'})
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {route.driver_name?.trim() || '담당자 미등록'}
                        {route.driver_phone?.trim() ? ` · ${route.driver_phone.trim()}` : ''}
                      </p>
                    </div>
                    {tel ? (
                      <a
                        href={`tel:${tel}`}
                        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                        aria-label={`${route.name} 기사에게 전화`}
                      >
                        <Phone className="h-4 w-4" aria-hidden />
                        전화
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-800">셔틀 이용 여부</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="shuttle-use"
              checked={useShuttle}
              onChange={() => setUseShuttle(true)}
            />
            통근 셔틀 이용함
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="shuttle-use"
              checked={!useShuttle}
              onChange={() => setUseShuttle(false)}
            />
            이용 안 함 (자차/대중교통)
          </label>
        </fieldset>

        <div className={`mt-4 space-y-3 ${useShuttle ? '' : 'pointer-events-none opacity-40'}`}>
          <label className="block text-sm">
            이용 노선
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={routeId}
              onChange={(e) => {
                setRouteId(e.target.value);
                setPickupStopId('');
                setDropoffStopId('');
              }}
            >
              <option value="">선택</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} ({route.direction === 'TO_WORK' ? '출근' : '퇴근'})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            승차 정류장
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={pickupStopId}
              onChange={(e) => setPickupStopId(e.target.value)}
              disabled={!routeId}
            >
              <option value="">선택</option>
              {pickupOptions.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.stop_name}
                  {formatClock(stop.pickup_time, '승차')}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            하차 정류장
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={dropoffStopId}
              onChange={(e) => setDropoffStopId(e.target.value)}
              disabled={!routeId}
            >
              <option value="">선택</option>
              {dropoffOptions.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.stop_name}
                  {formatClock(stop.dropoff_time, '하차')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50"
          disabled={saving || !orgId || !memberId}
          onClick={() => save()}
        >
          설정 저장하기
        </button>
      </div>
    </div>
  );
};
