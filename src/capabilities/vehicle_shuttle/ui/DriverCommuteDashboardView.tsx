import React, { useState, useMemo } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Phone,
  ArrowRight,
  RotateCcw,
  Users,
  Navigation,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  normalizeCommuteStops,
  mapStaffToCommuteStops,
  summarizeCommuteOperation,
  type CommuteRoute,
  type StaffRideRequest,
  type CommuteBoardingStatus,
} from '../domain/shuttleCommuteEngine';
import { recordBoardingStatus } from '../services/shuttleCommuteService';
import { showToast } from '@/shared/feedback/uiFeedback';

interface DriverCommuteDashboardViewProps {
  route: CommuteRoute;
  requests: StaffRideRequest[];
  onBoardingChange?: (requestId: string, status: CommuteBoardingStatus) => void;
}

export function DriverCommuteDashboardView({
  route,
  requests,
  onBoardingChange,
}: DriverCommuteDashboardViewProps) {
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [boardingMap, setBoardingMap] = useState<Record<string, CommuteBoardingStatus>>({});

  // 정류장에 임직원 및 탑승 상태 매핑
  const stopsWithStaff = useMemo(() => {
    return mapStaffToCommuteStops(route.stops, requests, boardingMap);
  }, [route.stops, requests, boardingMap]);

  // 운행 요약 통계
  const summary = useMemo(() => {
    return summarizeCommuteOperation(stopsWithStaff, currentStopIndex);
  }, [stopsWithStaff, currentStopIndex]);

  // 현재 정차 정류장
  const currentStop = stopsWithStaff[currentStopIndex] || stopsWithStaff[0];
  const isFirstStop = currentStopIndex === 0;
  const isLastStop = currentStopIndex >= stopsWithStaff.length - 1;

  // 정류장이 없는 노선은 운행표를 그릴 수 없으므로 빈 상태를 보여준다
  if (!currentStop) {
    return (
      <div className="max-w-md mx-auto text-center py-12 text-slate-400" data-testid="driver-commute-empty-stops">
        등록된 정류장이 없습니다.
      </div>
    );
  }

  // 탑승 체크 토글
  const handleToggleBoarding = async (requestId: string, staffName: string) => {
    const currentStatus = boardingMap[requestId] || 'SCHEDULED';
    const nextStatus: CommuteBoardingStatus =
      currentStatus === 'BOARDED' ? 'SCHEDULED' : 'BOARDED';

    const nextMap = {
      ...boardingMap,
      [requestId]: nextStatus,
    };
    setBoardingMap(nextMap);
    await recordBoardingStatus(requestId, nextStatus);

    if (nextStatus === 'BOARDED') {
      showToast(`${staffName}님 탑승 확인 완료`, 'success');
    }
    if (onBoardingChange) {
      onBoardingChange(requestId, nextStatus);
    }
  };

  // 다음 정류장으로 이동
  const handleNextStop = () => {
    if (currentStopIndex < stopsWithStaff.length - 1) {
      const nextIndex = currentStopIndex + 1;
      setCurrentStopIndex(nextIndex);
      const nextStop = stopsWithStaff[nextIndex];
      showToast(`'${nextStop.stopName}' 정류장으로 운행을 시작합니다.`, 'info');
    }
  };

  // 이전 정류장으로 되돌리기
  const handlePrevStop = () => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(currentStopIndex - 1);
    }
  };

  // 운행 리셋
  const handleResetTrip = () => {
    setCurrentStopIndex(0);
    setBoardingMap({});
    showToast('셔틀 운행이 처음 출발지로 초기화되었습니다.', 'info');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* 1. 기사용 상단 헤더 카드 */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white">
              <Bus className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs text-slate-400 font-semibold tracking-wide">
                기사용 모바일 운행표
              </div>
              <div className="text-base font-bold text-white line-clamp-1">
                {route.routeName}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-blue-300 font-bold border border-slate-700">
              {route.vehicleName}
            </span>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              출발 {route.departureTime}
            </div>
          </div>
        </div>

        {/* 운행 진행 바 및 집계 */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-300">
            <Users className="w-4 h-4 text-blue-400" />
            <span>총 탑승 예정: </span>
            <span className="font-bold text-white">{summary.totalAssignedStaff}명</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">
              탑승 {summary.boardedCount}명
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-amber-300 font-bold">
              대기 {summary.scheduledCount}명
            </span>
          </div>
        </div>

        {/* 정류장 스텝 인디케이터 바 */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{
              width: `${((currentStopIndex + 1) / stopsWithStaff.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 2. 현재 정차지 메인 카드 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        {/* 정차지 라벨 및 순번 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {currentStop.sequenceOrder}
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                현재 정차지 (Stop {currentStop.sequenceOrder}/{stopsWithStaff.length})
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{currentStop.stopName}</span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              출발지 기준 +{currentStop.scheduledMinutesFromStart}분 소요 예정 지점
            </div>
          </div>

          {/* 무정차 통과 가능 배지 */}
          {(!currentStop.assignedStaff || currentStop.assignedStaff.length === 0) && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
              탑승자 없음 (통과 가능)
            </span>
          )}
        </div>

        {/* 해당 정류장 탑승 대상자 리스트 */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            탑승 예정 임직원 명단 ({currentStop.assignedStaff?.length || 0}명)
          </div>

          {!currentStop.assignedStaff || currentStop.assignedStaff.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center text-xs text-slate-400">
              이 정류장에서 탑승하는 임직원이 없습니다. 신속히 다음 정류장으로 이동하세요.
            </div>
          ) : (
            currentStop.assignedStaff.map((staff) => {
              const isBoarded = staff.boardingStatus === 'BOARDED';

              return (
                <div
                  key={staff.requestId}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isBoarded
                      ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleBoarding(staff.requestId, staff.staffName)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isBoarded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      {isBoarded ? <Check className="w-5 h-5 stroke-[3]" /> : <Circle className="w-5 h-5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {staff.staffName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isBoarded
                              ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}
                        >
                          {isBoarded ? '탑승 완료' : '대기중'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {staff.departmentName || '부서'} · {staff.staffPhone}
                      </div>
                    </div>
                  </div>

                  {/* 직통 전화걸기 버튼 */}
                  <a
                    href={`tel:${staff.staffPhone}`}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 transition-colors shrink-0"
                    title="기사님 직통 전화연결"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. 하단 네비게이션 및 액션 바 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleNextStop}
          disabled={isLastStop}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {isLastStop ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              종점 도착 (운행 완료)
            </span>
          ) : (
            <>
              <span>다음 정류장으로 출발</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={handlePrevStop}
            disabled={isFirstStop}
            className="hover:text-slate-700 disabled:opacity-30 p-1 flex items-center gap-1"
          >
            <span>← 이전 정류장</span>
          </button>

          <button
            type="button"
            onClick={handleResetTrip}
            className="hover:text-slate-700 p-1 flex items-center gap-1 text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>운행 처음부터 다시 시작</span>
          </button>
        </div>
      </div>

      {/* 4. 운행 완료 알림 배너 */}
      {isLastStop && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
          <div className="text-xs">
            <span className="font-bold">오늘의 셔틀 운행이 성공적으로 완료되었습니다!</span>
            <div className="opacity-80 mt-0.5">
              총 {summary.totalAssignedStaff}명 중 {summary.boardedCount}명이 정상 탑승하였습니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
