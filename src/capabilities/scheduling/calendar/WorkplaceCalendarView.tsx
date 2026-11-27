import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import { useInRouterContext, useSearchParams } from 'react-router-dom';
import {
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Globe,
  Lock,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { usePermissions } from '@/core/auth/usePermissions';
import type { AcademyEvent, AcademyEventType, EventVisibility } from '@/core/events';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useStaffScope } from '@/hooks';
import { Button, FilterBar, FilterTabs, Modal, PageHeader } from '@/shared/components';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useAsyncLock } from '@/shared/hooks';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { todayIsoLocal } from '@/shared/utils/localDate';
import type { Student } from '@/types/customer';
import {
  listCalendarStaffMembers,
  type CalendarStaffMember,
} from './calendarMembersService';
import { holidaysForMonth, holidaysOnDate } from './services/publicHolidayService';
import { StaffFilterContent } from './StaffFilterContent';
import { usePublicHolidays } from './usePublicHolidays';

export interface CalendarEventTypeOption {
  value: AcademyEventType;
  label: string;
}

export interface WorkplaceCalendarViewProps {
  embedded?: boolean;
  eventTypeOptions?: CalendarEventTypeOption[];
  defaultEventType?: AcademyEventType;
  enableParticipationFee?: boolean;
  participationFeeHint?: string;
  filterVisibleEvents?: (
    events: AcademyEvent[],
    customers: Student[],
    isScoped: boolean
  ) => AcademyEvent[];
  hideBirthdays?: boolean;
}

type VisibilityFilter = 'all' | 'public' | 'private';

const DEFAULT_EVENT_TYPE_OPTIONS: CalendarEventTypeOption[] = [
  { value: 'personal', label: '개인 일정' },
  { value: 'event', label: '행사 · 이벤트' },
  { value: 'vacation', label: '휴무 · 휴가' },
  { value: 'maintenance', label: '시설 · 점검' },
  { value: 'other', label: '기타' },
];

const COLOR_SWATCHES = [
  { hex: '#0f172a', label: '슬레이트' },
  { hex: '#0d9488', label: '틸' },
  { hex: '#0284c7', label: '스카이' },
  { hex: '#059669', label: '에메랄드' },
  { hex: '#d97706', label: '앰버' },
  { hex: '#e11d48', label: '로즈' },
] as const;

function parseStaffParam(raw: string | null): { isAll: boolean; ids: string[] } {
  if (!raw || raw === 'all') return { isAll: true, ids: [] };
  if (raw === 'none') return { isAll: false, ids: [] };
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? { isAll: false, ids } : { isAll: true, ids: [] };
}

function useStaffUrlSync() {
  const inRouter = useInRouterContext();
  // Router 컨텍스트 밖(단독 테스트 등)에서는 로컬 상태로 안전 폴백
  const [fallbackParam, setFallbackParam] = useState<string | null>(null);
  const [searchParams, setSearchParams] = inRouter
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useSearchParams()
    : [null, null];

  const rawParam = inRouter ? searchParams?.get('staff') ?? null : fallbackParam;

  const setStaffQuery = useCallback(
    (next: { isAll: boolean; ids: string[] }) => {
      const encoded = next.isAll
        ? null
        : next.ids.length === 0
          ? 'none'
          : next.ids.join(',');

      if (inRouter && setSearchParams) {
        setSearchParams(
          (prev) => {
            const updated = new URLSearchParams(prev);
            if (!encoded) updated.delete('staff');
            else updated.set('staff', encoded);
            return updated;
          },
          { replace: true }
        );
      } else {
        setFallbackParam(encoded);
      }
    },
    [inRouter, setSearchParams]
  );

  return {
    ...parseStaffParam(rawParam),
    setStaffQuery,
  };
}

/**
 * 전 업종 공용 사업장 캘린더.
 * - 사업장 전체 공개('public') 일정과 내 개인 비공개('private') 일정을 함께 관리
 * - 작성자는 원할 때 개인 일정을 사업장에 공개하거나 다시 비공개로 전환 가능
 * - 매장 내 직원 목록(organization_members) 다중 선택 오버레이 및 URL 쿼리(?staff=) 동기화 지원
 */
export const WorkplaceCalendarView: React.FC<WorkplaceCalendarViewProps> = ({
  embedded = false,
  eventTypeOptions = DEFAULT_EVENT_TYPE_OPTIONS,
  defaultEventType = 'personal',
  enableParticipationFee = false,
  participationFeeHint,
  filterVisibleEvents,
  hideBirthdays = false,
}) => {
  const { showToast } = useApp();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { industry, isAdmin } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const scheduleLabel = `${placeLabel} 일정`;
  const { isScoped, scopeStudents } = useStaffScope();
  const currentUserId = user?.id ?? null;

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [staffMembers, setStaffMembers] = useState<CalendarStaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);

  const { isAll: isAllStaffSelected, ids: selectedStaffIds, setStaffQuery } = useStaffUrlSync();

  useEffect(() => {
    const orgId = currentOrganization?.id;
    if (!orgId) {
      setStaffMembers([]);
      return;
    }
    let cancelled = false;
    setStaffLoading(true);
    listCalendarStaffMembers(orgId)
      .then((list) => {
        if (!cancelled) setStaffMembers(list);
      })
      .catch(() => {
        if (!cancelled) setStaffMembers([]);
      })
      .finally(() => {
        if (!cancelled) setStaffLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id]);

  const staffById = useMemo(
    () => new Map(staffMembers.map((m) => [m.userId, m])),
    [staffMembers]
  );

  const handleSelectAllStaff = useCallback(() => {
    setStaffQuery({ isAll: true, ids: [] });
  }, [setStaffQuery]);

  const handleSelectMineOnly = useCallback(() => {
    if (!currentUserId) return;
    setStaffQuery({ isAll: false, ids: [currentUserId] });
  }, [currentUserId, setStaffQuery]);

  const handleToggleStaff = useCallback(
    (userId: string) => {
      const allIds = staffMembers.map((m) => m.userId);
      const currentSet = isAllStaffSelected ? new Set(allIds) : new Set(selectedStaffIds);
      if (currentSet.has(userId)) {
        currentSet.delete(userId);
      } else {
        currentSet.add(userId);
      }
      if (allIds.length > 0 && allIds.every((id) => currentSet.has(id))) {
        setStaffQuery({ isAll: true, ids: [] });
      } else {
        setStaffQuery({ isAll: false, ids: Array.from(currentSet) });
      }
    },
    [staffMembers, isAllStaffSelected, selectedStaffIds, setStaffQuery]
  );

  const { withLock, isLocked: isMutating } = useAsyncLock();

  const customersList = useList<any>({
    resource: 'customers',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    queryOptions: { enabled: !!currentOrganization?.id && !hideBirthdays },
  });
  const allCustomers =
    (customersList as unknown as { data?: { data?: Student[] } }).data?.data ?? [];
  const customers = useMemo(
    () => (isScoped ? scopeStudents(allCustomers) : allCustomers),
    [allCustomers, isScoped, scopeStudents]
  );

  const eventsList = useList<any>({
    resource: 'events',
    meta: { schema: 'core' },
    queryOptions: { enabled: !!currentOrganization?.id },
  });
  const eventsLoading = Boolean(
    (eventsList as unknown as { isLoading?: boolean }).isLoading
  );
  const rawEvents =
    (eventsList as unknown as { data?: { data?: Record<string, unknown>[] } }).data?.data ?? [];

  const dbEvents = useMemo<AcademyEvent[]>(
    () =>
      rawEvents.map((r: any) => ({
        id: r.id,
        title: r.title,
        startDate: r.start_date,
        endDate: r.end_date || undefined,
        type: (r.event_type || 'other') as AcademyEventType,
        description: r.description || undefined,
        color: r.color || '#0f172a',
        participationFee: r.metadata?.participationFee,
        studentIds: r.metadata?.studentIds,
        participantIds: r.metadata?.participantIds,
        ownerUserId: r.owner_user_id ?? null,
        visibility: (r.visibility === 'private' ? 'private' : 'public') as EventVisibility,
      })),
    [rawEvents]
  );

  const visibleEvents = useMemo(() => {
    // 1. 프론트엔드 방어 필터: 비공개 일정은 본인 것만 표시 (DB RLS 이중 방어)
    const privacyFiltered = dbEvents.filter((ev) => {
      if (ev.visibility === 'private') {
        return Boolean(currentUserId && ev.ownerUserId === currentUserId);
      }
      return true;
    });

    // 2. 업종 커스텀 스코프 (예: 피아노 강사 스코프) — 개인 비공개 일정은 항상 보존
    const scoped = filterVisibleEvents
      ? (() => {
          const ownPrivate = privacyFiltered.filter(
            (ev) => ev.visibility === 'private' && ev.ownerUserId === currentUserId
          );
          const publicOnly = privacyFiltered.filter((ev) => ev.visibility !== 'private');
          const filteredPublic = filterVisibleEvents(publicOnly, allCustomers, isScoped);
          const seen = new Set<string>();
          return [...ownPrivate, ...filteredPublic].filter((ev) => {
            if (seen.has(ev.id)) return false;
            seen.add(ev.id);
            return true;
          });
        })()
      : privacyFiltered;

    // 3. 상단 공개 범위 필터 적용
    const byVisibility =
      visibilityFilter === 'private'
        ? scoped.filter((ev) => ev.visibility === 'private')
        : visibilityFilter === 'public'
          ? scoped.filter((ev) => ev.visibility !== 'private')
          : scoped;

    // 4. 직원 멀티 선택 필터 (?staff= URL 쿼리 동기화)
    if (isAllStaffSelected) return byVisibility;
    const selectedSet = new Set(selectedStaffIds);
    return byVisibility.filter(
      (ev) => Boolean(ev.ownerUserId && selectedSet.has(ev.ownerUserId))
    );
  }, [
    dbEvents,
    currentUserId,
    filterVisibleEvents,
    allCustomers,
    isScoped,
    visibilityFilter,
    isAllStaffSelected,
    selectedStaffIds,
  ]);

  const publicHolidays = usePublicHolidays(currentYear);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    startDate: string;
    type: AcademyEventType;
    description: string;
    color: string;
    participationFee: number;
    visibility: EventVisibility;
  }>({
    title: '',
    startDate: todayIsoLocal(),
    type: defaultEventType,
    description: '',
    color: '#0f172a',
    participationFee: 0,
    visibility: defaultEventType === 'personal' ? 'private' : 'public',
  });

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
  const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const monthEvents = useMemo(
    () => visibleEvents.filter((e) => e.startDate.startsWith(currentYearMonthStr)),
    [visibleEvents, currentYearMonthStr]
  );

  const monthHolidays = useMemo(
    () => holidaysForMonth(publicHolidays, currentYear, currentMonth),
    [publicHolidays, currentYear, currentMonth]
  );

  const birthdayCustomers = useMemo(() => {
    if (hideBirthdays || visibilityFilter === 'private') return [];
    return customers.filter((s) => {
      if (!s.birthDate) return false;
      const m = parseInt(s.birthDate.split('-')[1], 10);
      return m === currentMonth;
    });
  }, [customers, currentMonth, hideBirthdays, visibilityFilter]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) {
      return {
        dayEvents: [] as AcademyEvent[],
        dayBdays: [] as Student[],
        dayHolidays: [] as typeof publicHolidays,
      };
    }
    const dateStr = `${currentYearMonthStr}-${String(selectedDay).padStart(2, '0')}`;
    return {
      dayEvents: visibleEvents.filter((ev) => ev.startDate === dateStr),
      dayBdays: birthdayCustomers.filter((s) => {
        const bDay = parseInt(s.birthDate.split('-')[2], 10);
        return bDay === selectedDay;
      }),
      dayHolidays: holidaysOnDate(publicHolidays, dateStr),
    };
  }, [selectedDay, currentYearMonthStr, visibleEvents, birthdayCustomers, publicHolidays]);

  const { mutateAsync: createEventAsync } = useCreate() as unknown as {
    mutateAsync: (args: unknown) => Promise<unknown>;
  };
  const { mutateAsync: updateEventAsync } = useUpdate() as unknown as {
    mutateAsync: (args: unknown) => Promise<unknown>;
  };
  const { mutateAsync: deleteEventAsync } = useDelete() as unknown as {
    mutateAsync: (args: unknown) => Promise<unknown>;
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !currentOrganization?.id) return;

    void withLock(async () => {
      try {
        const participationFee =
          enableParticipationFee &&
          (newEvent.type === 'concert' || newEvent.type === 'competition')
            ? Number(newEvent.participationFee) || undefined
            : undefined;

        await createEventAsync({
          resource: 'events',
          meta: { schema: 'core' },
          values: {
            organization_id: currentOrganization.id,
            title: newEvent.title.trim(),
            start_date: newEvent.startDate,
            event_type: newEvent.type,
            description: newEvent.description.trim() || null,
            color: newEvent.color,
            owner_user_id: currentUserId,
            visibility: newEvent.visibility,
            metadata: participationFee ? { participationFee } : {},
          },
        });
        showToast(
          newEvent.visibility === 'private'
            ? `'${newEvent.title.trim()}' 개인 일정이 등록되었습니다.`
            : `'${newEvent.title.trim()}' 공개 일정이 등록되었습니다.`,
          'success'
        );
        setIsModalOpen(false);
      } catch {
        showToast('일정 등록에 실패했습니다.', 'error');
      }
    });
  };

  const handleToggleVisibility = (ev: AcademyEvent) => {
    const nextVisibility: EventVisibility = ev.visibility === 'private' ? 'public' : 'private';
    void withLock(async () => {
      try {
        await updateEventAsync({
          resource: 'events',
          id: ev.id,
          meta: { schema: 'core' },
          values: { visibility: nextVisibility },
        });
        showToast(
          nextVisibility === 'public'
            ? '사업장 전체에 공개되었습니다.'
            : '내 개인 일정(비공개)으로 전환되었습니다.',
          'success'
        );
      } catch {
        showToast('공개 설정 변경에 실패했습니다.', 'error');
      }
    });
  };

  const handleDeleteEvent = (id: string) => {
    void withLock(async () => {
      try {
        await deleteEventAsync({
          resource: 'events',
          id,
          meta: { schema: 'core' },
        });
        showToast('일정이 삭제되었습니다.', 'info');
      } catch {
        showToast('삭제에 실패했습니다.', 'error');
      }
    });
  };

  const canManageEvent = (ev: AcademyEvent): boolean => {
    const isOwner = Boolean(currentUserId && ev.ownerUserId === currentUserId);
    if (ev.visibility === 'private') return isOwner;
    return isOwner || isAdmin;
  };

  const canToggleVisibility = (ev: AcademyEvent): boolean => {
    if (currentUserId && ev.ownerUserId === currentUserId) return true;
    return !ev.ownerUserId && isAdmin;
  };

  const openCreateModal = () => {
    const dayStr = String(selectedDay ?? 15).padStart(2, '0');
    const defaultType =
      visibilityFilter === 'private'
        ? 'personal'
        : eventTypeOptions[0]?.value ?? defaultEventType;
    setNewEvent({
      title: '',
      startDate: `${currentYearMonthStr}-${dayStr}`,
      type: defaultType,
      description: '',
      color: '#0f172a',
      participationFee: 0,
      visibility:
        visibilityFilter === 'private' || defaultType === 'personal' ? 'private' : 'public',
    });
    setIsModalOpen(true);
  };

  const renderDayDetailList = (
    dayEvents: AcademyEvent[],
    dayBdays: Student[],
    dayHolidays: typeof publicHolidays = []
  ) => {
    if (dayEvents.length === 0 && dayBdays.length === 0 && dayHolidays.length === 0) {
      return <p className="text-xs text-slate-400 py-4 text-center">등록된 일정이 없습니다.</p>;
    }

    return (
      <div className="space-y-2">
        {dayHolidays.map((h) => (
          <div
            key={`holiday-${h.date}-${h.name}`}
            className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-sm font-bold text-rose-700"
          >
            <Flag className="w-4 h-4 shrink-0" />
            {h.name}
          </div>
        ))}
        {dayEvents.map((ev) => {
          const isPrivate = ev.visibility === 'private';
          const manageable = canManageEvent(ev);
          const toggleable = canToggleVisibility(ev);
          const ownerMember = ev.ownerUserId ? staffById.get(ev.ownerUserId) : undefined;
          const accentColor = ownerMember?.color || ev.color || '#0f172a';

          return (
            <div
              key={ev.id}
              className="p-3 rounded-xl border border-slate-200/80 bg-white flex flex-col gap-2"
              style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ownerMember && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ownerMember.color }}
                        />
                        {ownerMember.name}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isPrivate
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {isPrivate ? (
                        <>
                          <Lock className="w-2.5 h-2.5" />
                          나만 보기
                        </>
                      ) : (
                        <>
                          <Globe className="w-2.5 h-2.5" />
                          공개
                        </>
                      )}
                    </span>
                    <p className="font-bold text-sm text-slate-900 truncate">{ev.title}</p>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-slate-500 mt-1">{ev.description}</p>
                  )}
                </div>
                {manageable && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg shrink-0 disabled:opacity-40"
                    aria-label="일정 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {toggleable && (
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleToggleVisibility(ev)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isPrivate ? (
                      <>
                        <Globe className="w-3 h-3 text-teal-600" />
                        <span>사업장에 공개하기</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-slate-600" />
                        <span>비공개(개인)로 전환</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {dayBdays.map((s) => (
          <div
            key={s.id}
            className="p-3 rounded-xl bg-pink-50 border border-pink-100 flex items-center gap-2 text-sm font-bold text-pink-700"
          >
            <Cake className="w-4 h-4 shrink-0" />
            {s.name} 생일
          </div>
        ))}
      </div>
    );
  };

  const filterOptions: Array<{ id: VisibilityFilter; label: string }> = [
    { id: 'all', label: '전체 일정' },
    { id: 'public', label: '사업장 공개' },
    { id: 'private', label: '내 개인 일정' },
  ];

  return (
    <div className={embedded ? 'space-y-4 pb-2 max-w-7xl mx-auto' : 'space-y-4 pb-4 max-w-7xl mx-auto'}>
      {!embedded ? (
        <PageHeader
          density="compact"
          icon={<CalendarDays className="w-6 h-6" />}
          title={`${scheduleLabel} 및 캘린더`}
          description="사업장 공용 일정과 내 개인 일정을 관리하고, 원하는 일정만 선택해 공개할 수 있습니다"
          actions={
            <Button onClick={openCreateModal} size="md">
              <Plus className="w-4 h-4" />
              일정 등록
            </Button>
          }
        />
      ) : (
        <div className="flex justify-end no-print">
          <Button onClick={openCreateModal} size="md">
            <Plus className="w-4 h-4" />
            일정 등록
          </Button>
        </div>
      )}

      <FilterBar className="flex-wrap justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-lg font-black text-slate-900 tabular-nums min-w-[110px] text-center">
            {currentYear}년 {currentMonth}월
          </h3>

          <button
            type="button"
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <FilterTabs
          tabs={filterOptions}
          active={visibilityFilter}
          onChange={(v: VisibilityFilter) => setVisibilityFilter(v)}
        />
      </FilterBar>

      {eventsLoading ? (
        <PageListSkeleton rows={4} message="일정을 불러오는 중입니다..." />
      ) : (
        <>
          {/* 모바일: 상단 직원 선택 칩 바 + 날짜 선택 + 해당 일 일정 */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setStaffDrawerOpen(true)}
                className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs"
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  직원 {isAllStaffSelected ? `전체(${staffMembers.length})` : `${selectedStaffIds.length}명`}
                </span>
              </button>
              <button
                type="button"
                disabled={!currentUserId}
                onClick={handleSelectMineOnly}
                className={`shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border disabled:opacity-40 ${
                  Boolean(currentUserId) &&
                  !isAllStaffSelected &&
                  selectedStaffIds.length === 1 &&
                  selectedStaffIds[0] === currentUserId
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                내 일정만
              </button>
              <button
                type="button"
                onClick={handleSelectAllStaff}
                className={`shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  isAllStaffSelected
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                전체 선택
              </button>
              {!isAllStaffSelected &&
                selectedStaffIds.map((uid) => {
                  const m = staffById.get(uid);
                  if (!m) return null;
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => handleToggleStaff(uid)}
                      className="shrink-0 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span>{m.name}</span>
                    </button>
                  );
                })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYearMonthStr}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = visibleEvents.filter((ev) => ev.startDate === dateStr);
                const dayBdays = birthdayCustomers.filter((s) => {
                  const bDay = parseInt(s.birthDate.split('-')[2], 10);
                  return bDay === dayNum;
                });
                const dayHolidays = holidaysOnDate(publicHolidays, dateStr);
                const hasItems =
                  dayEvents.length > 0 || dayBdays.length > 0 || dayHolidays.length > 0;
                const isSelected = selectedDay === dayNum;
                const isSunday = new Date(currentYear, currentMonth - 1, dayNum).getDay() === 0;
                const isHoliday = dayHolidays.length > 0;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`shrink-0 min-w-[44px] min-h-[44px] rounded-2xl flex flex-col items-center justify-center text-xs font-bold tabular-nums transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md'
                        : hasItems
                          ? isHoliday
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                          : isSunday || isHoliday
                            ? 'bg-white text-rose-600 border border-slate-200'
                            : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasItems && !isSelected && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          isHoliday ? 'bg-rose-500' : 'bg-slate-900'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDay && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="font-bold text-sm text-slate-900 tabular-nums">
                  {currentMonth}월 {selectedDay}일 일정
                </h4>
                {renderDayDetailList(
                  selectedDayEvents.dayEvents,
                  selectedDayEvents.dayBdays,
                  selectedDayEvents.dayHolidays
                )}
              </div>
            )}
          </div>

          {/* 데스크탑: 좌측 직원 필터 + 중앙 캘린더 + 우측 선택일 사이드 패널 */}
          <div className="hidden md:flex md:min-h-[calc(100dvh-14rem)] gap-4 items-stretch">
            <aside className="w-60 lg:w-64 shrink-0 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col">
              <StaffFilterContent
                members={staffMembers}
                currentUserId={currentUserId}
                selectedStaffIds={selectedStaffIds}
                isAllSelected={isAllStaffSelected}
                onSelectAll={handleSelectAllStaff}
                onSelectMineOnly={handleSelectMineOnly}
                onToggleStaff={handleToggleStaff}
                loading={staffLoading}
              />
            </aside>

            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold py-2.5 shrink-0">
                <span className="text-rose-500">일</span>
                <span>월</span>
                <span>화</span>
                <span>수</span>
                <span>목</span>
                <span>금</span>
                <span className="text-slate-800">토</span>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-xs flex-1 auto-rows-fr">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[72px] p-1.5 bg-slate-50/40" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYearMonthStr}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = visibleEvents.filter((ev) => ev.startDate === dateStr);
                  const dayBdays = birthdayCustomers.filter((s) => {
                    const bDay = parseInt(s.birthDate.split('-')[2], 10);
                    return bDay === dayNum;
                  });
                  const dayHolidays = holidaysOnDate(publicHolidays, dateStr);
                  const isSunday = new Date(currentYear, currentMonth - 1, dayNum).getDay() === 0;
                  const isHoliday = dayHolidays.length > 0;

                  return (
                    <div
                      key={dayNum}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`min-h-[72px] p-1.5 hover:bg-slate-50/30 transition-colors cursor-pointer space-y-0.5 ${
                        selectedDay === dayNum ? 'bg-slate-50/50 ring-2 ring-slate-900 ring-inset' : ''
                      }`}
                    >
                      <span
                        className={`font-bold tabular-nums ${
                          isHoliday || isSunday ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {dayHolidays.map((h) => (
                        <div
                          key={`${h.date}-${h.name}`}
                          className="p-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 truncate"
                          title={h.name}
                        >
                          {h.name}
                        </div>
                      ))}

                      {dayEvents.map((ev) => {
                        const ownerMember = ev.ownerUserId
                          ? staffById.get(ev.ownerUserId)
                          : undefined;
                        const chipBg = ownerMember?.color || ev.color || '#0f172a';
                        return (
                          <div
                            key={ev.id}
                            className="px-1 py-0.5 rounded-md text-[10px] font-bold text-white truncate shadow-2xs flex items-center gap-1"
                            style={{ backgroundColor: chipBg }}
                            title={ownerMember ? `[${ownerMember.name}] ${ev.title}` : ev.title}
                          >
                            {ev.visibility === 'private' && (
                              <Lock className="w-2.5 h-2.5 shrink-0 opacity-90" />
                            )}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}

                      {dayBdays.map((s) => (
                        <div
                          key={s.id}
                          className="p-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700 truncate flex items-center gap-1"
                        >
                          <Cake className="w-3 h-3 text-pink-500 shrink-0" />
                          <span>{s.name} 생일</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="w-72 lg:w-80 shrink-0 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-4 overflow-hidden">
              <div className="space-y-3 min-h-0 flex-1 overflow-y-auto">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 sticky top-0 bg-white pb-1 tabular-nums">
                  <Clock className="w-4 h-4 text-slate-800" />
                  {selectedDay ? `${currentMonth}월 ${selectedDay}일` : `${currentMonth}월 일정`}
                </h4>
                {selectedDay ? (
                  renderDayDetailList(
                    selectedDayEvents.dayEvents,
                    selectedDayEvents.dayBdays,
                    selectedDayEvents.dayHolidays
                  )
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">날짜를 선택하세요.</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 shrink-0 max-h-48 overflow-y-auto">
                <p className="text-[11px] font-bold text-slate-500 tabular-nums">
                  이달 전체 · 일정 {monthEvents.length}건
                  {monthHolidays.length > 0 ? ` · 공휴일 ${monthHolidays.length}일` : ''}
                </p>
                {monthHolidays.map((h) => (
                  <button
                    key={`month-holiday-${h.date}`}
                    type="button"
                    onClick={() => {
                      const day = parseInt(h.date.split('-')[2], 10);
                      setSelectedDay(day);
                    }}
                    className="w-full text-left p-2 rounded-xl border border-rose-100 bg-rose-50/70 hover:bg-rose-50 flex items-center gap-2 min-h-[44px]"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-rose-700 tabular-nums">
                        {h.date.slice(8)}일
                      </span>
                      <p className="font-bold text-xs text-rose-800 truncate">{h.name}</p>
                    </div>
                  </button>
                ))}
                {monthEvents.length === 0 && monthHolidays.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">일정 없음</p>
                ) : (
                  monthEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        const day = parseInt(ev.startDate.split('-')[2], 10);
                        setSelectedDay(day);
                      }}
                      className="w-full text-left p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 flex items-center gap-2 min-h-[44px]"
                    >
                      <div
                        className="w-1.5 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: ev.color || '#0f172a' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-700 tabular-nums">
                            {ev.startDate.slice(8)}일
                          </span>
                          {ev.visibility === 'private' && (
                            <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          )}
                        </div>
                        <p className="font-bold text-xs text-slate-900 truncate">{ev.title}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      <Modal
        isOpen={staffDrawerOpen}
        onClose={() => setStaffDrawerOpen(false)}
        title="직원별 일정 선택"
      >
        <div className="p-4 space-y-4">
          <StaffFilterContent
            members={staffMembers}
            currentUserId={currentUserId}
            selectedStaffIds={selectedStaffIds}
            isAllSelected={isAllStaffSelected}
            onSelectAll={handleSelectAllStaff}
            onSelectMineOnly={handleSelectMineOnly}
            onToggleStaff={handleToggleStaff}
            loading={staffLoading}
          />
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button type="button" onClick={() => setStaffDrawerOpen(false)}>
              적용
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="일정 등록">
        <form onSubmit={handleAddEvent} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              공개 범위
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, visibility: 'private' })}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  newEvent.visibility === 'private'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>나만 보기 (개인)</span>
              </button>
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, visibility: 'public' })}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  newEvent.visibility === 'public'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>사업장 전체 공개</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {newEvent.visibility === 'private'
                ? '비공개 일정은 본인만 볼 수 있으며, 등록 후에도 언제든 공개로 전환할 수 있습니다.'
                : '공개 일정은 같은 사업장의 모든 멤버가 캘린더에서 함께 확인할 수 있습니다.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              일정명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 개인 미팅, 정기 점검, 매장 행사"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">일정 일자</label>
              <input
                type="date"
                required
                value={newEvent.startDate}
                onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">분류 유형</label>
              <select
                value={newEvent.type}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, type: e.target.value as AcademyEventType })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
              >
                {eventTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              상세 내용 및 장소
            </label>
            <textarea
              rows={2}
              placeholder="장소, 메모, 준비사항 등..."
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {enableParticipationFee &&
            (newEvent.type === 'concert' || newEvent.type === 'competition') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  참가비 (₩) · 월 청구 합산용
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={newEvent.participationFee || ''}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      participationFee: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold min-h-[44px]"
                />
                {participationFeeHint && (
                  <p className="text-[10px] text-slate-400 mt-1">{participationFeeHint}</p>
                )}
              </div>
            )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">표시 색상</label>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setNewEvent({ ...newEvent, color: c.hex })}
                  aria-label={c.label}
                  className={`w-8 h-8 rounded-xl border-2 transition-transform cursor-pointer ${
                    newEvent.color === c.hex ? 'scale-110 border-slate-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
