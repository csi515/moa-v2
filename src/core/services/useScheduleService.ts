import { useMemo } from 'react';
import { useList, useUpdate } from '@refinedev/core';
import type { Booking, ServiceOffering, SlotRecruitment } from '../types/schedule';
import { filterBookingsByDate, selectUpcomingBookings } from '@/core/schedules/bookingQuery';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

interface ServiceRow {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  metadata?: {
    maxCapacity?: number;
    category?: string;
  } | null;
  is_active?: boolean | null;
  is_schedulable?: boolean | null;
}

interface ScheduleRow {
  id: string;
  service_id?: string | null;
  staff_id?: string | null;
  customer_id?: string | null;
  title?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status?: string | null;
  is_bookable?: boolean | null;
  max_capacity?: number | null;
  metadata?: {
    customerName?: string;
    staffName?: string;
    skinCondition?: string;
    chartNote?: string;
  } | null;
}

interface ReservationRow {
  id: string;
  organization_id: string;
}

/**
 * A Refine-backed hook replacing the legacy synchronous ScheduleService
 * Fetches data from core.services, core.schedules, and core.reservations
 */
export function useScheduleService() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const servicesQuery = useList<ServiceRow>({
    resource: 'services',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  const schedulesQuery = useList<ScheduleRow>({
    resource: 'schedules',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _reservationsQuery = useList<ReservationRow>({
    resource: 'reservations',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  const serviceRows = servicesQuery.query.data?.data || [];
  const scheduleRows = schedulesQuery.query.data?.data || [];

  const services = useMemo<ServiceOffering[]>(() => {
    return serviceRows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      price: row.price || 0,
      durationMinutes: row.duration_minutes || 0,
      maxCapacity: Number((row.metadata as Record<string, unknown> | null)?.maxCapacity) || 1,
      category: ((row.metadata as Record<string, unknown> | null)?.category as ServiceOffering['category']) || 'other',
      isActive: Boolean(row.is_active),
      isSchedulable: Boolean(row.is_schedulable),
    }));
  }, [serviceRows]);

  const recruitments = useMemo<SlotRecruitment[]>(() => {
    return scheduleRows
      .filter(row => row.is_bookable)
      .map(row => ({
        id: row.id,
        serviceId: row.service_id || '',
        staffId: row.staff_id || '',
        startsAt: row.starts_at,
        closedManually: false,
        maxCapacity: row.max_capacity || 1,
      }));
  }, [scheduleRows]);

  const bookings = useMemo<Booking[]>(() => {
    // In Moa-v2, a confirmed booking is a core.schedules row with customer_id (assigned slot)
    return scheduleRows
      .filter((row): row is ScheduleRow & { customer_id: string } => !row.is_bookable && Boolean(row.customer_id))
      .map(row => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.metadata?.customerName || 'Unknown',
        staffId: row.staff_id || '',
        staffName: row.metadata?.staffName,
        serviceId: row.service_id || '',
        serviceName: row.title || '',
        startsAt: row.starts_at,
        endsAt: row.ends_at || row.starts_at,
        status: (row.status as Booking['status']) || 'confirmed',
      }));
  }, [scheduleRows]);

  const { mutateAsync: updateSchedule } = useUpdate();

  return {
    services,
    recruitments,
    bookings,
    getActiveServiceOfferings: () => services.filter(s => s.isActive),
    getServiceOfferings: () => services,
    getSlotRecruitments: () => recruitments,
    getBookings: () => bookings,
    getBookingsByDate: (date: string) => filterBookingsByDate(bookings, date),
    getUpcomingBookings: (limit = 10) => selectUpcomingBookings(bookings, { limit }),
    saveBooking: (booking: Partial<Booking> & { id?: string; skinCondition?: string; chartNote?: string }) => {
      // Dummy wrapper to satisfy local cache-based components for now
      // Real implementation would use updateSchedule({ resource: 'schedules', id: booking.id, values: ... })
      if (booking.id) {
        void updateSchedule({
          resource: 'schedules',
          id: booking.id,
          meta: { schema: 'core' },
          values: {
            metadata: { skinCondition: booking.skinCondition, chartNote: booking.chartNote },
          }
        });
      }
      return booking;
    },
    getCustomerRemainingSessions: () => 0,
    getCustomerSessionPasses: () => [],
    cancelBookingAsParent: async () => {},
  };
}
