import { useMemo, useState } from 'react';
import type { Booking, SlotRecruitment } from '@/core/types/schedule';
import { isUnassignedCustomerRequest } from '@/industries/skin/bookingRooms';
import type { FilterTabItem } from '@/shared/components';

export type BookingFilter = 'today' | 'upcoming' | 'all';

export const BOOKING_TIME_FILTERS: FilterTabItem<BookingFilter>[] = [
  { id: 'today', label: '오늘' },
  { id: 'upcoming', label: '예정' },
  { id: 'all', label: '전체' },
];

export function filterBookings(params: {
  bookings: Booking[];
  filter: BookingFilter;
  instructorFilter: string;
  today: string;
  skin: boolean;
  nowIso?: string;
}): Booking[] {
  const nowIso = params.nowIso ?? new Date().toISOString();
  let sorted = [...params.bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (params.instructorFilter !== 'all') {
    sorted = sorted.filter(
      (b) =>
        b.staffId === params.instructorFilter ||
        (params.skin && b.requestedBy === 'customer' && !b.staffId && b.status === 'scheduled')
    );
  }
  if (params.filter === 'today') return sorted.filter((b) => b.startsAt.startsWith(params.today));
  if (params.filter === 'upcoming') return sorted.filter((b) => b.startsAt >= nowIso);
  return sorted;
}

export function filterPresetRecruitments(params: {
  skin: boolean;
  recruitments: SlotRecruitment[];
  isScoped: boolean;
  staffId: string | null | undefined;
  instructorFilter: string;
  filter: BookingFilter;
  today: string;
  nowIso?: string;
}): SlotRecruitment[] {
  if (params.skin) return [];
  const now = params.nowIso ?? new Date().toISOString();
  return params.recruitments.filter((item) => {
    if (!item.serviceId || !item.staffId || !item.maxCapacity) return false;
    if (params.isScoped && params.staffId && item.staffId !== params.staffId) return false;
    if (params.instructorFilter !== 'all' && item.staffId !== params.instructorFilter) return false;
    if (params.filter === 'today') return item.startsAt.startsWith(params.today);
    if (params.filter === 'upcoming') return item.startsAt >= now;
    return true;
  });
}

export function useBookingFilters(opts: {
  skin: boolean;
  isScoped: boolean;
  staffId: string | null | undefined;
  staffLabel: string;
  instructors: Array<{ id: string; name: string }>;
  allBookings: Booking[];
  recruitments: SlotRecruitment[];
}) {
  const [filter, setFilter] = useState<BookingFilter>('today');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const today = new Date().toISOString().slice(0, 10);

  const instructorTabs: FilterTabItem<string>[] = useMemo(() => {
    const tabs: FilterTabItem<string>[] = [{ id: 'all', label: `전체 ${opts.staffLabel}` }];
    for (const i of opts.instructors) {
      tabs.push({ id: i.id, label: i.name });
    }
    return tabs;
  }, [opts.instructors, opts.staffLabel]);

  const filtered = useMemo(
    () =>
      filterBookings({
        bookings: opts.allBookings,
        filter,
        instructorFilter,
        today,
        skin: opts.skin,
      }),
    [opts.allBookings, filter, instructorFilter, today, opts.skin]
  );

  const presetRecruitments = useMemo(
    () =>
      filterPresetRecruitments({
        skin: opts.skin,
        recruitments: opts.recruitments,
        isScoped: opts.isScoped,
        staffId: opts.staffId,
        instructorFilter,
        filter,
        today,
      }),
    [
      opts.skin,
      opts.recruitments,
      opts.isScoped,
      opts.staffId,
      instructorFilter,
      filter,
      today,
    ]
  );

  return {
    filter,
    setFilter,
    instructorFilter,
    setInstructorFilter,
    today,
    instructorTabs,
    filtered,
    presetRecruitments,
    timeFilters: BOOKING_TIME_FILTERS,
  };
}

/** 스코프 스태프 + 미배정 고객 신청 병합 (피부과) */
export function mergeScopedBookingsWithInbox(params: {
  scoped: Booking[];
  allRaw: Booking[];
  skin: boolean;
  isScoped: boolean;
}): Booking[] {
  if (!params.skin || !params.isScoped) return params.scoped;
  const inbox = params.allRaw.filter(isUnassignedCustomerRequest);
  const seen = new Set(params.scoped.map((b) => b.id));
  return [...params.scoped, ...inbox.filter((b) => !seen.has(b.id))];
}
