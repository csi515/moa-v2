import React, { useState, useMemo } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  ArrowUp,
  ArrowDown,
  UserCheck,
  Phone,
  Plus,
  Trash2,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import {
  reorderCommuteStops,
  mapStaffToCommuteStops,
  isCommuteStopEmpty,
  filterCommuteRoutes,
  type CommuteRoute,
  type CommuteStop,
  type StaffRideRequest,
  type CommuteDirection,
} from '../domain/shuttleCommuteEngine';
import { updateStopSequence } from '../services/shuttleCommuteService';
import { StaffShuttleRideRequestModal } from './StaffShuttleRideRequestModal';
import { showToast } from '@/shared/feedback/uiFeedback';

interface ShuttleRouteScheduleManagerViewProps {
  routes: CommuteRoute[];
  requests: StaffRideRequest[];
  onRoutesUpdate: (updatedRoutes: CommuteRoute[]) => void;
  onRequestAdded: (newRequest: StaffRideRequest) => void;
}

export function ShuttleRouteScheduleManagerView({
  routes,
  requests,
  onRoutesUpdate,
  onRequestAdded,
}: ShuttleRouteScheduleManagerViewProps) {
  const [selectedDirection, setSelectedDirection] = useState<CommuteDirection>('commute_in');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopMinutes, setNewStopMinutes] = useState(15);
  const [isAddingStop, setIsAddingStop] = useState(false);

  // 현재 방향 노선 목록
  const directionRoutes = useMemo(() => {
    return filterCommuteRoutes(routes, selectedDirection);
  }, [routes, selectedDirection]);

  // 현재 선택된 노선
  const currentRoute = useMemo(() => {
    return (
      directionRoutes.find((r) => r.id === selectedRouteId) ||
      directionRoutes[0] ||
      routes[0]
    );
  }, [directionRoutes, selectedRouteId, routes]);

  // 임직원 매핑된 정류장 목록
  const stopsWithStaff = useMemo(() => {
    if (!currentRoute) return [];
    return mapStaffToCommuteStops(currentRoute.stops, requests);
  }, [currentRoute, requests]);

  // 정류장 순서 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index === 0 || !currentRoute) return;
    const reordered = reorderCommuteStops(currentRoute.stops, index, index - 1);
    const updatedRoutes = routes.map((r) =>
      r.id === currentRoute.id ? { ...r, stops: reordered } : r
    );
    onRoutesUpdate(updatedRoutes);
    await updateStopSequence(currentRoute.id, reordered);
    showToast('정류장 정차 순서가 변경되었습니다.', 'info');
  };

  // 정류장 순서 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (!currentRoute || index >= currentRoute.stops.length - 1) return;
    const reordered = reorderCommuteStops(currentRoute.stops, index, index + 1);
    const updatedRoutes = routes.map((r) =>
      r.id === currentRoute.id ? { ...r, stops: reordered } : r
    );
    onRoutesUpdate(updatedRoutes);
    await updateStopSequence(currentRoute.id, reordered);
    showToast('정류장 정차 순서가 변경되었습니다.', 'info');
  };

  // 새 정류장 추가
  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopName.trim() || !currentRoute) return;

    const newStop: CommuteStop = {
      id: `stop-${Date.now()}`,
      routeId: currentRoute.id,
      stopName: newStopName.trim(),
      sequenceOrder: currentRoute.stops.length + 1,
      scheduledMinutesFromStart: Number(newStopMinutes),
    };

    const updatedStops = [...currentRoute.stops, newStop];
    const updatedRoutes = routes.map((r) =>
      r.id === currentRoute.id ? { ...r, stops: updatedStops } : r
    );

    onRoutesUpdate(updatedRoutes);
    await updateStopSequence(currentRoute.id, updatedStops);
    setNewStopName('');
    setIsAddingStop(false);
    showToast(`'${newStop.stopName}' 정류장이 추가되었습니다.`, 'success');
  };

  // 정류장 삭제
  const handleDeleteStop = async (stopId: string) => {
    if (!currentRoute) return;
    const filtered = currentRoute.stops.filter((s) => s.id !== stopId);
    const reordered = filtered.map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));

    const updatedRoutes = routes.map((r) =>
      r.id === currentRoute.id ? { ...r, stops: reordered } : r
    );

    onRoutesUpdate(updatedRoutes);
    await updateStopSequence(currentRoute.id, reordered);
    showToast('정류장이 삭제되었습니다.', 'info');
  };

  // 전체 탑승 인원 집계
  const totalCommuters = useMemo(() => {
    return stopsWithStaff.reduce(
      (sum, s) => sum + (s.assignedStaff ? s.assignedStaff.length : 0),
      0
    );
  }, [stopsWithStaff]);

  return (
    <div className="space-y-6">
      {/* 1. 상단 통계 및 탭 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              임직원 셔틀 정차 순서 및 탑승 스케줄러
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              관리자 모드
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            출퇴근 셔틀 노선의 정류장 정차 순서를 드래그/버튼으로 스케줄링하고 정류장별 탑승 명단을 관제합니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>신규 탑승 신청 등록</span>
          </button>
        </div>
      </div>

      {/* 2. 출근 / 퇴근 노선 탭 및 노선 선택기 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 방향 탭 */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedDirection('commute_in');
              const firstIn = routes.find((r) => r.direction === 'commute_in');
              if (firstIn) setSelectedRouteId(firstIn.id);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedDirection === 'commute_in'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            출근 노선 (Commute In)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDirection('commute_out');
              const firstOut = routes.find((r) => r.direction === 'commute_out');
              if (firstOut) setSelectedRouteId(firstOut.id);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedDirection === 'commute_out'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            퇴근 노선 (Commute Out)
          </button>
        </div>

        {/* 노선 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {directionRoutes.map((route) => {
            const isSelected = route.id === currentRoute?.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                {route.routeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 선택된 노선 상세 요약 카드 */}
      {currentRoute && (
        <div className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-100 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {currentRoute.routeName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                  {currentRoute.vehicleName}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  출발 {currentRoute.departureTime}
                </span>
                <span>담당: {currentRoute.driverName} ({currentRoute.driverPhone})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">총 정류장</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {stopsWithStaff.length}개소
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">총 탑승 예정자</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {totalCommuters}명
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 정류장 순서 카드 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>정차 순서 및 정류장별 탑승자 명단</span>
            <span className="text-xs font-normal text-slate-400">
              (순서 변경 버튼으로 정차 순위를 손쉽게 조정하세요)
            </span>
          </h2>

          <button
            type="button"
            onClick={() => setIsAddingStop(!isAddingStop)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 정류장 추가</span>
          </button>
        </div>

        {/* 새 정류장 추가 폼 */}
        {isAddingStop && (
          <form
            onSubmit={handleAddStop}
            className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 animate-in fade-in"
          >
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="정류장 명칭 (예: 모란역 4번 출구 앞)"
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
            <div className="w-40">
              <input
                type="number"
                placeholder="출발 후 소요분"
                value={newStopMinutes}
                onChange={(e) => setNewStopMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
            >
              추가 저장
            </button>
            <button
              type="button"
              onClick={() => setIsAddingStop(false)}
              className="px-3 py-2 text-slate-500 text-sm"
            >
              취소
            </button>
          </form>
        )}

        {/* 정류장 리스트 */}
        <div className="space-y-3">
          {stopsWithStaff.map((stop, index) => {
            const isEmpty = isCommuteStopEmpty(stop);
            const isFirst = index === 0;
            const isLast = index === stopsWithStaff.length - 1;

            return (
              <div
                key={stop.id}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {/* 순서 뱃지 */}
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-blue-600 flex items-center justify-center font-bold text-sm">
                      {stop.sequenceOrder}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {stop.stopName}
                        </span>

                        {/* 무정차 통과 가능 뱃지 */}
                        {isEmpty ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            탑승자 없음 (무정차 통과 가능)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            탑승 예정 {stop.assignedStaff?.length}명
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5">
                        출발 후 약 +{stop.scheduledMinutesFromStart}분 도착 예정
                      </div>
                    </div>
                  </div>

                  {/* 순서 변경 및 삭제 액션 버튼 */}
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(index)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="위로 이동"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(index)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="아래로 이동"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStop(stop.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors ml-1"
                      title="정류장 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 해당 정류장 탑승 신청 임직원 명단 */}
                <div className="pt-3">
                  {!stop.assignedStaff || stop.assignedStaff.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">
                      현재 해당 정류장에 탑승 신청한 임직원이 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {stop.assignedStaff.map((staff) => (
                        <div
                          key={staff.requestId}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {staff.staffName}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm ${
                                  staff.rideType === 'regular'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                }`}
                              >
                                {staff.rideType === 'regular' ? '매일정기' : '1회탑승'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {staff.departmentName || '부서 미지정'}
                            </div>
                          </div>

                          <a
                            href={`tel:${staff.staffPhone}`}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="전화 연결"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 탑승 신청 모달 */}
      <StaffShuttleRideRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        routes={routes}
        onRequestSubmitted={(newReq) => {
          onRequestAdded(newReq);
        }}
      />
    </div>
  );
}
