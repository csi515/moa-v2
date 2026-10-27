import React, { useState, useEffect } from 'react';
import {
  Bus,
  Calendar,
  Smartphone,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { ShuttleRouteScheduleManagerView } from './ShuttleRouteScheduleManagerView';
import { DriverCommuteDashboardView } from './DriverCommuteDashboardView';
import { VehicleShuttleManagementView as StudentShuttleManagementView } from '../components/VehicleShuttleManagementView';
import {
  fetchCommuteRoutes,
  fetchCommuteRideRequests,
  INITIAL_COMMUTE_ROUTES,
  INITIAL_STAFF_RIDE_REQUESTS,
} from '../services/shuttleCommuteService';
import {
  type CommuteRoute,
  type StaffRideRequest,
} from '../domain/shuttleCommuteEngine';

export type CommuteTabMode = 'schedule_manager' | 'driver_dashboard' | 'student_shuttle';

export function VehicleShuttleCommuteView() {
  const [activeTab, setActiveTab] = useState<CommuteTabMode>('schedule_manager');
  const [routes, setRoutes] = useState<CommuteRoute[]>(INITIAL_COMMUTE_ROUTES);
  const [requests, setRequests] = useState<StaffRideRequest[]>(INITIAL_STAFF_RIDE_REQUESTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedRoutes, fetchedRequests] = await Promise.all([
          fetchCommuteRoutes(),
          fetchCommuteRideRequests(),
        ]);
        if (fetchedRoutes && fetchedRoutes.length > 0) {
          setRoutes(fetchedRoutes);
        }
        if (fetchedRequests && fetchedRequests.length > 0) {
          setRequests(fetchedRequests);
        }
      } catch {
        // fallback to initial
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRoutesUpdate = (updatedRoutes: CommuteRoute[]) => {
    setRoutes(updatedRoutes);
  };

  const handleRequestAdded = (newRequest: StaffRideRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 최상단 모드 탭 네비게이션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('schedule_manager')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'schedule_manager'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>임직원 셔틀 스케줄러</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('driver_dashboard')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'driver_dashboard'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>기사용 모바일 운행표</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('student_shuttle')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'student_shuttle'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>원생 안심통학 셔틀</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 px-3">
          <Bus className="w-4 h-4 text-blue-500" />
          <span>등록 노선 {routes.length}개</span>
        </div>
      </div>

      {/* 탭 본문 내용 */}
      {activeTab === 'schedule_manager' && (
        <ShuttleRouteScheduleManagerView
          routes={routes}
          requests={requests}
          onRoutesUpdate={handleRoutesUpdate}
          onRequestAdded={handleRequestAdded}
        />
      )}

      {activeTab === 'driver_dashboard' && (
        <div className="pt-2">
          {routes.length > 0 ? (
            <DriverCommuteDashboardView
              route={routes[0]}
              requests={requests}
            />
          ) : (
            <div className="text-center py-12 text-slate-400">등록된 셔틀 노선이 없습니다.</div>
          )}
        </div>
      )}

      {activeTab === 'student_shuttle' && (
        <div className="pt-2">
          <StudentShuttleManagementView />
        </div>
      )}
    </div>
  );
}
