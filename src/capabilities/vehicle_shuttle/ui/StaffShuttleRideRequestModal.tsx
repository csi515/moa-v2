import React, { useState } from 'react';
import {
  Bus,
  MapPin,
  Calendar,
  Clock,
  X,
  User,
  Phone,
  Building,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  validateCommuteRideRequest,
  type CommuteRoute,
  type CommuteRideType,
  type StaffRideRequest,
} from '../domain/shuttleCommuteEngine';
import { submitStaffRideRequest } from '../services/shuttleCommuteService';
import { showToast } from '@/shared/feedback/uiFeedback';

interface StaffShuttleRideRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: CommuteRoute[];
  currentStaff?: {
    staffId: string;
    staffName: string;
    staffPhone: string;
    departmentName: string;
  };
  onRequestSubmitted: (newRequest: StaffRideRequest) => void;
}

export function StaffShuttleRideRequestModal({
  isOpen,
  onClose,
  routes,
  currentStaff = {
    staffId: 'staff-1',
    staffName: '이지원 매니저',
    staffPhone: '010-9123-4567',
    departmentName: '플랫폼개발팀',
  },
  onRequestSubmitted,
}: StaffShuttleRideRequestModalProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [rideType, setRideType] = useState<CommuteRideType>('regular');
  const [rideDate, setRideDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [staffName, setStaffName] = useState(currentStaff.staffName);
  const [staffPhone, setStaffPhone] = useState(currentStaff.staffPhone);
  const [departmentName, setDepartmentName] = useState(currentStaff.departmentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const sortedStops = currentRoute
    ? [...currentRoute.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    : [];

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedStopId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateCommuteRideRequest({
      staffId: currentStaff.staffId,
      staffName,
      routeId: selectedRouteId,
      stopId: selectedStopId,
      rideType,
      rideDate: rideType === 'single' ? rideDate : undefined,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || '입력값을 확인해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitStaffRideRequest({
        organizationId: currentRoute?.organizationId || 'org-sample',
        staffId: currentStaff.staffId,
        staffName,
        staffPhone,
        departmentName,
        routeId: selectedRouteId,
        stopId: selectedStopId,
        rideType,
        rideDate: rideType === 'single' ? rideDate : undefined,
        status: 'active',
      });

      showToast('셔틀버스 탑승 신청이 완료되었습니다.', 'success');
      onRequestSubmitted(created);
      onClose();
    } catch {
      setErrorMessage('탑승 신청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                출퇴근 셔틀버스 탑승 신청
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                원하는 노선과 정류장을 선택하여 편리하게 출퇴근하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 신청자 기본 정보 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              신청 임직원 정보
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  성명
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  소속 부서
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                비상 연락처 (기사님 통화용)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. 셔틀 노선 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              (1) 이용 노선 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const isCommuteIn = route.direction === 'commute_in';

                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => handleRouteSelect(route.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-900/20 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isCommuteIn
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {isCommuteIn ? '출근 노선' : '퇴근 노선'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {route.departureTime} 출발
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {route.routeName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {route.vehicleName} · {route.driverName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 탑승/하차 희망 정류장 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              (2) 희망 정류장 선택 ({currentRoute?.routeName || '선택 노선'})
            </label>
            <div className="space-y-2">
              {sortedStops.map((stop) => {
                const isSelected = stop.id === selectedStopId;

                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {stop.sequenceOrder}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{stop.stopName}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          출발지 기준 +{stop.scheduledMinutesFromStart}분 소요 예정
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40 px-2.5 py-1 rounded-full">
                        선택됨
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 탑승 주기 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              (3) 탑승 주기
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRideType('regular')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  rideType === 'regular'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-sm">매일 정기 탑승</div>
                <div className="text-[11px] opacity-75 mt-0.5">평일 매일 고정 탑승</div>
              </button>
              <button
                type="button"
                onClick={() => setRideType('single')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  rideType === 'single'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-sm">특정 일자 1회 탑승</div>
                <div className="text-[11px] opacity-75 mt-0.5">지정일 단 1회 이용</div>
              </button>
            </div>

            {rideType === 'single' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  탑승 희망 일자
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* 풋터 */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting || !selectedStopId}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSubmitting ? '신청 처리 중...' : '탑승 신청 확정'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
