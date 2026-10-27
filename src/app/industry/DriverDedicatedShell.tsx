import React, { useState, useEffect } from 'react';
import { Bus, LogOut, RefreshCw } from 'lucide-react';
import {
  DriverCommuteDashboardView,
  fetchCommuteRoutes,
  fetchCommuteRideRequests,
  INITIAL_COMMUTE_ROUTES,
  INITIAL_STAFF_RIDE_REQUESTS,
  type CommuteRoute,
  type StaffRideRequest,
} from '@/capabilities/vehicle_shuttle';
import { useAuth } from '@/core/auth/AuthProvider';

/**
 * Driver Dedicated Fullscreen Shell
 *
 * driver 역할 로그인 시 좌측 사이드바 및 상단 헤더 없이
 * 오직 운전석 거치대에 최적화된 풀스크린 모바일 운행표 화면만 렌더링
 */
export function DriverDedicatedShell() {
  const [routes, setRoutes] = useState<CommuteRoute[]>(INITIAL_COMMUTE_ROUTES);
  const [requests, setRequests] = useState<StaffRideRequest[]>(INITIAL_STAFF_RIDE_REQUESTS);
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [r, req] = await Promise.all([
          fetchCommuteRoutes(),
          fetchCommuteRideRequests(),
        ]);
        if (r && r.length > 0) setRoutes(r);
        if (req && req.length > 0) setRequests(req);
      } catch {
        // fallback to initial
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* 운전석 전용 최소 상단 바 */}
      <header className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
            <Bus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>셔틀 기사 전용 모드</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-blue-900/60 text-blue-300 font-semibold border border-blue-700/50">
                운전석 거치용
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {routes[0]?.routeName || '출퇴근 셔틀 운행 관제'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
          <button
            type="button"
            onClick={() => signOut()}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 메인 풀스크린 운행표 컨텐츠 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {routes.length > 0 ? (
          <DriverCommuteDashboardView
            route={routes[0]}
            requests={requests}
          />
        ) : (
          <div className="text-center py-20 text-slate-400">등록된 셔틀 노선이 없습니다.</div>
        )}
      </main>
    </div>
  );
}
