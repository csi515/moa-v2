import { useMemo } from 'react';
import { useList, useUpdate } from '@refinedev/core';
import type { Booking, ServiceOffering, SlotRecruitment } from '../types/schedule';
import { filterBookingsByDate, selectUpcomingBookings } from '@/core/schedules/bookingQuery';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

/**
 * A Refine-backed hook replacing the legacy synchronous ScheduleService
 * Fetches data from core.services, core.schedules, and core.reservations
 */
export function useScheduleService() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const servicesQuery = useList<any>({
    resource: 'services',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  const schedulesQuery = useList<any>({
    resource: 'schedules',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const reservationsQuery = useList<any>({
    resource: 'reservations',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: orgId }],
    queryOptions: { enabled: !!orgId },
  });

  const services = useMemo<ServiceOffering[]>(() => {
    return ((servicesQuery as any).data?.data || (servicesQuery as any).data || (servicesQuery as any).query?.data?.data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      durationMinutes: row.duration_minutes,
      maxCapacity: row.metadata?.maxCapacity || 1,
      category: row.metadata?.category || 'other',
      isActive: row.is_active,
      isSchedulable: row.is_schedulable,
    }));
  }, [servicesQuery]);

  const recruitments = useMemo<SlotRecruitment[]>(() => {
    return ((schedulesQuery as any).data?.data || (schedulesQuery as any).data || (schedulesQuery as any).query?.data?.data || [])
      .filter(row => row.is_bookable)
      .map(row => ({
        id: row.id,
        serviceId: row.service_id,
        staffId: row.staff_id,
        startsAt: row.starts_at,
        closedManually: false,
        maxCapacity: row.max_capacity,
      }));
  }, [schedulesQuery]);

  const bookings = useMemo<Booking[]>(() => {
    // In Moa-v2, a confirmed booking is a core.schedules row with customer_id (assigned slot)
    return ((schedulesQuery as any).data?.data || (schedulesQuery as any).data || (schedulesQuery as any).query?.data?.data || [])
      .filter(row => !row.is_bookable && row.customer_id)
      .map(row => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.metadata?.customerName || 'Unknown',
        staffId: row.staff_id,
        staffName: row.metadata?.staffName,
        serviceId: row.service_id,
        serviceName: row.title,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status as any,
      }));
  }, [schedulesQuery]);

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
    saveBooking: (booking: any) => {
      // Dummy wrapper to satisfy local cache-based components for now
      // Real implementation would use updateSchedule({ resource: 'schedules', id: booking.id, values: ... })
      updateSchedule({
        resource: 'schedules',
        id: booking.id,
        meta: { schema: 'core' },
        values: {
          metadata: { skinCondition: booking.skinCondition, chartNote: booking.chartNote },
        }
      }, {
        onSuccess: () => {
          // Success
        }
      });
      return booking;
    },
    getCustomerRemainingSessions: () => 0,
    getCustomerSessionPasses: () => [],
    cancelBookingAsParent: async () => {},
  };
}
