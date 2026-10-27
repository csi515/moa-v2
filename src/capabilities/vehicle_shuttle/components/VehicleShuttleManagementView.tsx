import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Play,
  Square,
  Users,
  UserCheck,
  UserX,
  Phone,
  Navigation,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  normalizeRouteStops,
  evaluateUpcomingArrivalNotice,
  summarizeRouteOperation,
  type ShuttleRoute,
  type ShuttleStop,
  type BoardingCheckRecord,
  type BoardingStatus,
} from '../domain/vehicleShuttleEngine';

const STORAGE_KEY_SHUTTLE_ROUTES = 'moa_vehicle_shuttle_routes';
const STORAGE_KEY_BOARDING_LOGS = 'moa_vehicle_shuttle_boarding_logs';

const DEFAULT_ROUTES: ShuttleRoute[] = [
  {
    id: 'route-1',
    vehicleName: '1호차 (스타리아)',
    routeName: 'A코스 (등원 1회차)',
    driverName: '김기사님',
    driverPhone: '010-8832-1920',
    departureTime: '14:30',
    stops: [
      {
        id: 'stop-101',
        name: '학원 출발지 (본관 앞)',
        sequenceOrder: 1,
        scheduledMinutesFromStart: 0,
        assignedStudentIds: [],
      },
      {
        id: 'stop-102',
        name: '푸르지오 아파트 104동 앞',
        sequenceOrder: 2,
        scheduledMinutesFromStart: 6,
        assignedStudentIds: ['std-김민수', 'std-이지은'],
      },
      {
        id: 'stop-103',
        name: '래미안 정문 버스정류장',
        sequenceOrder: 3,
        scheduledMinutesFromStart: 12,
        assignedStudentIds: ['std-박도현', 'std-최서아'],
      },
      {
        id: 'stop-104',
        name: '학원 도착 (하차)',
        sequenceOrder: 4,
        scheduledMinutesFromStart: 20,
        assignedStudentIds: [],
      },
    ],
  },
];

export function VehicleShuttleManagementView() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-1');
  const [routes, setRoutes] = useState<ShuttleRoute[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_SHUTTLE_ROUTES));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_ROUTES;
  });

  const [boardingLogs, setBoardingLogs] = useState<BoardingCheckRecord[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_BOARDING_LOGS));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { studentId: 'std-김민수', stopId: 'stop-102', status: 'BOARDED', timestamp: '2026-10-15 14:36' },
    ];
  });

  const [isDriving, setIsDriving] = useState(false);
  const [dispatchDone, setDispatchDone] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(1);
  const [elapsedMinutes, setElapsedMinutes] = useState(5);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_SHUTTLE_ROUTES), JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_BOARDING_LOGS), JSON.stringify(boardingLogs));
  }, [boardingLogs]);

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const sortedStops = useMemo(() => normalizeRouteStops(currentRoute.stops), [currentRoute.stops]);

  // 실시간 운행 요약 통계
  const stats = useMemo(() => {
    return summarizeRouteOperation({
      stops: sortedStops,
      boardingLogs,
      currentStopIndex,
    });
  }, [sortedStops, boardingLogs, currentStopIndex]);

  // 다음 정류장 도착 안내 대상 판정
  const arrivalNotice = useMemo(() => {
    return evaluateUpcomingArrivalNotice({
      stops: sortedStops,
      currentStopIndex,
      elapsedMinutesSinceDeparture: elapsedMinutes,
      noticeThresholdMinutes: 3,
    });
  }, [sortedStops, currentStopIndex, elapsedMinutes]);

  // 원생 승하차 상태 토글
  const handleCheckBoarding = (studentId: string, stopId: string, nextStatus: BoardingStatus) => {
    const updated = [
      ...boardingLogs.filter((l) => !(l.studentId === studentId && l.stopId === stopId)),
      {
        studentId,
        stopId,
        status: nextStatus,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      },
    ];
    setBoardingLogs(updated);

    const statusText = nextStatus === 'BOARDED' ? '탑승 완료' : nextStatus === 'ABSENT' ? '결석(미탑승)' : '하차 완료';
    showToast(`${studentId.replace('std-', '')} 원생이 [${statusText}] 처리되었습니다.`, 'success');
  };

  // 운행 시작/종료 토글
  const handleToggleDriving = () => {
    if (!isDriving) {
      setIsDriving(true);
      setDispatchDone(false);
      setCurrentStopIndex(0);
      setElapsedMinutes(0);
      showToast(`${currentRoute.vehicleName} 운행이 시작되었습니다. 학부모 포털에 운행 중 상태가 노출됩니다.`, 'info');
    } else {
      setIsDriving(false);
      setDispatchDone(true);
      showToast(`${currentRoute.vehicleName} 운행이 안전하게 종료되었습니다.`, 'success');
    }
  };

  // 다음 정류장 이동
  const handleNextStop = () => {
    if (currentStopIndex < sortedStops.length - 1) {
      const nextIdx = currentStopIndex + 1;
      setCurrentStopIndex(nextIdx);
      setElapsedMinutes(sortedStops[nextIdx].scheduledMinutesFromStart);
      showToast(`[${sortedStops[nextIdx].name}]에 도착하였습니다.`, 'info');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 헤더 바 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">안심 통학 & 셔틀 차량 운행 관제</h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isDriving ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <span data-testid="dispatch-status">{isDriving ? '운행 중' : dispatchDone ? '운행 완료' : '운행 대기'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                기사용 실시간 승하차 체크, 정류장 도착 3분 전 학부모 자동 안내 및 운행 관제 보드
              </p>
              <select
                data-testid="shuttle-route-select"
                className="mt-2 min-h-11 rounded-lg border border-slate-200 px-2 text-sm"
                value={selectedRouteId}
                onChange={(event) => setSelectedRouteId(event.target.value)}
              >
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.vehicleName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="btn-dispatch-advance"
              onClick={handleToggleDriving}
              className={`inline-flex items-center gap-1.5 min-h-11 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isDriving
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isDriving ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>운행 종료</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>운행 시작</span>
                </>
              )}
            </button>
            {isDriving && currentStopIndex < sortedStops.length - 1 && (
              <button
                onClick={handleNextStop}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>다음 정류장</span>
              </button>
            )}
          </div>
        </div>

        {/* 운행 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400">운행 차량 / 기사</span>
            <p className="text-sm font-black text-slate-800 mt-0.5">{currentRoute.vehicleName}</p>
            <p className="text-xs text-slate-500">{currentRoute.driverName} ({currentRoute.driverPhone})</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400">총 탑승 예정 원생</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.totalAssignedStudents}명</p>
            <span className="text-[10px] text-slate-400">전체 코스 합산</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400">현재 탑승 완료</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.boardedCount}명</p>
            <span className="text-[10px] text-emerald-600 font-bold">안전 탑승 확인</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400">결석(미탑승) 통보</span>
            <p className="text-xl font-black text-rose-500 mt-0.5">{stats.absentCount}명</p>
            <span className="text-[10px] text-rose-500 font-bold">대기 시간 절감</span>
          </div>
        </div>
      </div>

      {/* 도착 3분 전 학부모 알림 안내 배너 */}
      {arrivalNotice.shouldNotify && arrivalNotice.nextStop && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-amber-800">
                다음 정류장: [{arrivalNotice.nextStop.name}] 도착 {arrivalNotice.minutesRemainingToNextStop}분 전!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                해당 정류장 탑승 예정 원생({arrivalNotice.targetStudentIds.join(', ')}) 학부모님께 자동 알림톡이 전송되었습니다.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-200/60 text-amber-900 rounded-lg text-xs font-bold">
            자동 발송 완료
          </span>
        </div>
      )}

      {/* 정류장별 승하차 체크 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">노선별 정류장 순서 및 승하차 체크리스트</h2>

        <div className="space-y-4">
          {sortedStops.map((stop, idx) => {
            const isCurrentStop = idx === currentStopIndex;
            const isPassed = idx < currentStopIndex;

            return (
              <div
                key={stop.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentStop
                    ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-100'
                    : isPassed
                    ? 'border-slate-200 bg-slate-50/50 opacity-70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrentStop
                          ? 'bg-emerald-600 text-white'
                          : isPassed
                          ? 'bg-slate-300 text-slate-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {stop.sequenceOrder}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{stop.name}</h3>
                      <p className="text-xs text-slate-400">
                        출발 후 +{stop.scheduledMinutesFromStart}분 예정
                      </p>
                    </div>
                  </div>

                  {isCurrentStop && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      현재 위치
                    </span>
                  )}
                </div>

                {/* 정류장 배정 원생 목록 */}
                {stop.assignedStudentIds.length === 0 ? (
                  <p className="text-xs text-slate-400 pt-2">탑승/하차 예정 원생이 없는 경유지입니다.</p>
                ) : (
                  <div className="space-y-2 pt-3" data-testid="stop-roster">
                    {stop.assignedStudentIds.map((stdId) => {
                      const log = boardingLogs.find((l) => l.studentId === stdId && l.stopId === stop.id);
                      const currentStatus = log?.status || 'SCHEDULED';

                      return (
                        <div
                          key={stdId}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">
                              {stdId.replace('std-', '')}
                            </span>
                            {log?.timestamp && (
                              <span className="text-[10px] text-slate-400">({log.timestamp})</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              data-testid="btn-board-toggle"
                              onClick={() => handleCheckBoarding(stdId, stop.id, currentStatus === 'BOARDED' ? 'ABSENT' : 'BOARDED')}
                              className={`min-h-11 min-w-11 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                currentStatus === 'BOARDED'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              탑승
                            </button>
                            <button
                              onClick={() => handleCheckBoarding(stdId, stop.id, 'ABSENT')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              결석
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VehicleShuttleManagementView;
