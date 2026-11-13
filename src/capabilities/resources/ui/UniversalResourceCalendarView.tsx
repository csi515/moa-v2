import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  DoorOpen,
  HeartPulse,
  Tv,
  Layers,
  Plus,
  Inbox,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  CalendarDays,
  CalendarRange,
  RotateCcw,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuth } from '@/core/auth/AuthProvider';
import { evaluateMemberAccess } from '@/domain/permissions';
import { useActiveUser } from '@/shared/session/useActiveUser';
import type {
  Resource,
  ResourceReservation,
  ResourceCategory,
} from '../types';
import {
  listResources,
} from '../resourceService';
import {
  cancelResourceReservation,
  listResourceReservations,
} from '../reservationService';
import { ResourceMasterSettingsModal } from './ResourceMasterSettingsModal';
import { ResourceReservationRequestModal } from './ResourceReservationRequestModal';
import { ResourceApprovalInboxView } from './ResourceApprovalInboxView';
import { showToast } from '@/shared/feedback/uiFeedback';
import { listApprovalOrgMembers } from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import { getResolvedPreset } from '@/core/presets/presetResolver';

export type UniversalResourceCalendarViewProps = {
  /** 임베드 시 헤더·승인함 축소 */
  compact?: boolean;
  /** v1: 승인 대기함 숨김 (기본 true) */
  hideApprovalInbox?: boolean;
  /** 자원 마스터 등록 버튼 숨김 (워크스페이스 카탈로그 탭 사용 시) */
  hideMasterButton?: boolean;
  defaultCategory?: ResourceCategory | 'all';
  bookingMode?: 'member' | 'customer';
};

function useCanManageResources(): boolean {
  const active = useActiveUser();
  try {

    return evaluateMemberAccess(
      {
        role: active?.role === 'owner' ? 'owner' : 'staff',
        customRole: { permissions: active?.customRole?.permissions ?? null },
      },
      'resources_manage',
      'write'
    );
  } catch {
    return false;
  }
}

type ViewMode = 'month' | 'week' | 'day';

const CATEGORY_TABS: Array<{
  id: ResourceCategory | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: '전체 자원', icon: Layers },
  { id: 'vehicle', label: '차량', icon: Car },
  { id: 'meeting_room', label: '회의실', icon: DoorOpen },
  { id: 'health_room', label: '보건실', icon: HeartPulse },
  { id: 'display', label: '디스플레이', icon: Tv },
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

export const UniversalResourceCalendarView: React.FC<UniversalResourceCalendarViewProps> = ({
  compact = false,
  hideApprovalInbox = true,
  hideMasterButton = false,
  defaultCategory = 'all',
  bookingMode = 'member',
}) => {
  const {
    currentOrganization,
    currentStaffId,
    currentRole,
    activeCapabilities = [],
  } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.id || '';
  const allowResourceWrite = useCanManageResources();

  const [activeTab, setActiveTab] = useState<'calendar' | 'inbox'>('calendar');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>(defaultCategory);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<ResourceReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [approvalMembers, setApprovalMembers] = useState<Array<{ userId: string; name: string }>>(
    []
  );

  const enableApprovalWorkflow = useMemo(() => {
    const preset = getResolvedPreset(currentOrganization?.industry_type ?? '');
    const caps = new Set([
      ...(preset?.capabilities ?? []),
      ...activeCapabilities,
    ]);
    return caps.has('approval_workflow');
  }, [currentOrganization?.industry_type, activeCapabilities]);

  // 모달 제어
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState<Resource | null>(null);
  const [prefilledTimeSlot, setPrefilledTimeSlot] = useState<string>('09:00');
  const [selectedBooking, setSelectedBooking] = useState<ResourceReservation | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const [resList, reservList] = await Promise.all([
        listResources({ organizationId: orgId, activeOnly: true }),
        listResourceReservations({ organizationId: orgId }),
      ]);
      setResources(resList);
      setReservations(reservList);
    } catch (err) {
      console.error('Failed to load universal resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !enableApprovalWorkflow) {
      setApprovalMembers([]);
      return;
    }
    void listApprovalOrgMembers(orgId)
      .then((rows) => setApprovalMembers(rows.map((r) => ({ userId: r.userId, name: r.name }))))
      .catch(() => setApprovalMembers([]));
  }, [orgId, enableApprovalWorkflow]);

  // 날짜 내비게이션
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 카테고리 필터링된 자원 목록
  const filteredResources = useMemo(() => {
    if (selectedCategory === 'all') return resources;
    return resources.filter((r) => {
      const meta = (r.metadata || {}) as Record<string, any>;
      return meta.category === selectedCategory;
    });
  }, [resources, selectedCategory]);

  // 자원별 카운트 맵
  const categoryCountMap = useMemo(() => {
    const counts: Record<string, number> = { all: resources.length };
    resources.forEach((r) => {
      const cat = (r.metadata as any)?.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [resources]);

  // 대기 중 예약 건수
  const pendingCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'pending').length;
  }, [reservations]);

  // 날짜 문자열 포맷터
  const dateString = useMemo(() => {
    return currentDate.toISOString().split('T')[0];
  }, [currentDate]);

  const yearMonthString = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    return `${y}년 ${m}월`;
  }, [currentDate]);

  // 슬롯 클릭 시 예약 신청 모달 열기
  const handleOpenBooking = (resource: Resource, time: string) => {
    setSelectedResourceForBooking(resource);
    setPrefilledTimeSlot(time);
    setIsRequestModalOpen(true);
  };

  const canCancelSelected = useMemo(() => {
    if (!selectedBooking || !user?.id) return false;
    if (selectedBooking.requested_by === user.id) return true;
    return allowResourceWrite;
  }, [selectedBooking, user?.id, allowResourceWrite]);

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setCancelBusy(true);
    try {
      await cancelResourceReservation(selectedBooking.id);
      showToast('예약을 취소했습니다.', 'success');
      setSelectedBooking(null);
      await loadData();
    } catch (err) {
      showToast.error(err, '취소에 실패했습니다.');
    } finally {
      setCancelBusy(false);
    }
  };

  const displayBookingLabel = (booked: ResourceReservation) =>
    booked.requesterName || booked.customerName || '예약 이용 중';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. 상단 글로벌 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>
                공용자원 예약
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                시간·자원을 선택해 예약합니다. 조직 구성원 모두가 예약자를 확인할 수 있으며, 취소는 본인(또는 총무)만 가능합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hideApprovalInbox ? (
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                예약 달력
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                  activeTab === 'inbox'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                승인 대기함
                {pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          ) : null}

          {allowResourceWrite && !hideMasterButton ? (
            <button
              type="button"
              onClick={() => setIsMasterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              새 자원 등록
            </button>
          ) : null}
        </div>
      </div>

      {activeTab === 'inbox' ? (
        /* 승인 대기함 뷰 */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <ResourceApprovalInboxView
            organizationId={orgId}
            currentUser={{
              userId: user?.id,
              staffId: currentStaffId,
              role: currentRole,
            }}
            onActionComplete={loadData}
          />
        </div>
      ) : (
        /* 예약 달력 메인 화면 */
        <div className="space-y-4">
          {/* 2. 카테고리 필터 탭 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.id;
              const count = categoryCountMap[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. 날짜 내비게이션 & 3-Way 뷰 모드 전환 바 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            {/* 날짜 조작 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="이전"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="다음"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                오늘
              </button>
              <div className="text-base font-black text-slate-900 ml-2">
                {viewMode === 'month' ? yearMonthString : dateString}
              </div>
            </div>

            {/* 3-Way 뷰 모드 토글 */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                주간
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'day'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                일간
              </button>
            </div>
          </div>

          {/* 4. 달력 본문 (선택된 뷰 모드에 따라 렌더링) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* 4-A. 일간 뷰 (Resource Columns 비교) */}
            {viewMode === 'day' && (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* 자원 컬럼 헤더 */}
                  <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] bg-slate-50 border-b border-slate-200">
                    <div className="p-3 text-[11px] font-bold text-slate-400 text-center border-r border-slate-200 flex items-center justify-center">
                      시간
                    </div>
                    {filteredResources.map((res) => {
                      const meta = (res.metadata || {}) as Record<string, any>;
                      return (
                        <div
                          key={res.id}
                          className="p-3 text-center border-r border-slate-200 last:border-r-0"
                        >
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {res.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                            <span>정원 {res.capacity}명</span>
                            {meta.require_approval && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                                승인제
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 시간대 슬롯 행들 */}
                  <div className="divide-y divide-slate-100">
                    {TIME_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] min-h-[52px]"
                      >
                        {/* 좌측 시간 컬럼 */}
                        <div className="p-2 text-center text-xs text-slate-400 font-mono border-r border-slate-100 flex items-center justify-center bg-slate-50/50">
                          {slot}
                        </div>

                        {/* 자원별 슬롯 셀 */}
                        {filteredResources.map((res) => {
                          const slotStart = `${dateString}T${slot}:00+09:00`;
                          // 해당 슬롯에 걸치는 예약 검색
                          const booked = reservations.find((r) => {
                            if (r.resourceId !== res.id) return false;
                            if (r.status === 'cancelled' || r.status === 'rejected') return false;
                            const rStart = r.starts_at;
                            const rEnd = r.ends_at;
                            return rStart <= slotStart && slotStart < rEnd;
                          });

                          if (booked) {
                            const isPending = booked.status === 'pending';
                            const isMine = user?.id && booked.requested_by === user.id;
                            return (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() => setSelectedBooking(booked)}
                                className={`p-1.5 border-r border-slate-100 last:border-r-0 flex flex-col justify-center text-left w-full ${
                                  isPending
                                    ? 'bg-amber-50/80 border-l-2 border-l-amber-500'
                                    : isMine
                                      ? 'bg-emerald-50/90 border-l-2 border-l-emerald-600'
                                      : 'bg-indigo-50/90 border-l-2 border-l-indigo-600'
                                }`}
                              >
                                <div className="text-[11px] font-bold truncate text-slate-800">
                                  {displayBookingLabel(booked)}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {booked.memo || (isPending ? '승인 대기 중' : '확정')}
                                </div>
                              </button>
                            );
                          }

                          // 빈 슬롯 -> 클릭하여 예약 신청
                          return (
                            <button
                              key={res.id}
                              onClick={() => handleOpenBooking(res, slot)}
                              className="p-1 border-r border-slate-100 last:border-r-0 hover:bg-indigo-50/40 transition-colors group flex items-center justify-center text-slate-300 hover:text-indigo-600"
                              title={`${res.name} ${slot} 예약 신청`}
                            >
                              <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4-B. 주간 뷰 (7개 요일 타임테이블) */}
            {viewMode === 'week' && (
              <div className="p-6 text-center text-slate-500 text-xs space-y-4">
                <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-800 mb-1">주간 타임테이블 뷰</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    선택된 주간의 요일별 점유 현황을 한눈에 파악할 수 있습니다. 특정 자원의 상세 슬롯은 일간 뷰를 통해 예약 신청하세요.
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={day} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="font-bold text-xs text-slate-700">{day}요일</div>
                      <div className="text-[11px] text-indigo-600 font-semibold mt-1">
                        예약 {reservations.filter((r) => r.status === 'approved').length}건
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4-C. 월간 뷰 (7x5 캘린더 그리드) */}
            {viewMode === 'month' && (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                    <div key={d} className="p-2 text-center text-xs font-bold text-slate-500">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isWithinMonth = dayNum <= 31;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isWithinMonth) {
                            const d = new Date(currentDate);
                            d.setDate(dayNum);
                            setCurrentDate(d);
                            setViewMode('day');
                          }
                        }}
                        className={`min-h-[70px] sm:min-h-[90px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isWithinMonth
                            ? 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20'
                            : 'bg-slate-50 border-transparent text-slate-300 pointer-events-none'
                        }`}
                      >
                        <span className="font-bold text-xs text-slate-700">{isWithinMonth ? dayNum : ''}</span>
                        {isWithinMonth && (
                          <div className="text-[10px] space-y-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold truncate max-w-full">
                              공용 예약 활성
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. 자원 마스터 설정 모달 */}
      <ResourceMasterSettingsModal
        organizationId={orgId}
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        onSaved={loadData}
        staffList={[
          { id: 'staff_1', name: '홍길동 과장', role: '배차관리' },
          { id: 'staff_2', name: '김간호 수간호사', role: '보건관리' },
          { id: 'staff_3', name: '이총무 팀장', role: '총무팀' },
        ]}
      />

      {/* 6. 예약 신청 모달 */}
      <ResourceReservationRequestModal
        organizationId={orgId}
        resource={selectedResourceForBooking}
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedResourceForBooking(null);
        }}
        onSuccess={loadData}
        existingReservations={reservations}
        defaultDate={dateString}
        defaultStartTime={prefilledTimeSlot}
        currentUserId={user?.id}
        bookingMode={bookingMode}
        approvalMembers={approvalMembers}
        enableApprovalWorkflow={enableApprovalWorkflow}
      />

      {/* 7. 예약 상세·취소 시트 */}
      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">예약 상세</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">예약자</dt>
                <dd className="font-medium">{displayBookingLabel(selectedBooking)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">시작</dt>
                <dd>{selectedBooking.starts_at.replace('T', ' ').slice(0, 16)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">종료</dt>
                <dd>{selectedBooking.ends_at.replace('T', ' ').slice(0, 16)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">상태</dt>
                <dd>{selectedBooking.status}</dd>
              </div>
              {selectedBooking.memo ? (
                <div>
                  <dt className="text-slate-500">메모</dt>
                  <dd className="mt-0.5 text-xs text-slate-600">{selectedBooking.memo}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              {canCancelSelected &&
              (selectedBooking.status === 'approved' || selectedBooking.status === 'pending') ? (
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => void handleCancelBooking()}
                  className="min-h-12 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {cancelBusy ? '취소 중…' : '예약 취소'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700"
              >
                닫기
              </button>
            </div>
            {!canCancelSelected ? (
              <p className="mt-2 text-xs text-slate-500">본인 예약만 취소할 수 있습니다. 총무·사업주는 예외입니다.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UniversalResourceCalendarView;
