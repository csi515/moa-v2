import { getCoreClient } from '@/lib/supabase';
import type {
  CoreSchedule,
  BookableSchedule,
  ScheduleFormData,
} from '@/types';

/**
 * Core Schedule Service
 * 예약 가능 시간·운영 슬롯 (core.schedules).
 * 고객 신청 원장은 reservationService, 배정 Booking은 ScheduleService.
 */
export const coreScheduleService = {
  /**
   * 조직의 일정 목록 조회
   */
  async getOrganizationSchedules(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<CoreSchedule[]> {
    let query = getCoreClient()
      .from('schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('starts_at', { ascending: true });

    if (fromDate) {
      query = query.gte('starts_at', fromDate);
    }
    if (toDate) {
      query = query.lte('starts_at', toDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as CoreSchedule[];
  },

  /**
   * 예약 가능한 일정 목록 조회 (공개)
   */
  async listBookableSchedules(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
    limit = 50
  ): Promise<BookableSchedule[]> {
    const from = fromDate ? fromDate.toISOString() : new Date().toISOString();
    const to = toDate ? toDate.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await getCoreClient()
      .rpc('list_bookable_schedules' as any, {
        p_org_id: organizationId,
        p_from_date: from,
        p_to_date: to,
        p_limit: limit,
      });

    if (error) throw error;
    return (data ?? []) as BookableSchedule[];
  },

  /**
   * 일정 생성
   */
  async createSchedule(
    organizationId: string,
    scheduleData: ScheduleFormData
  ): Promise<CoreSchedule> {
    const { data, error } = await getCoreClient()
      .from('schedules')
      .insert({
        organization_id: organizationId,
        title: scheduleData.title,
        description: scheduleData.description ?? null,
        starts_at: scheduleData.starts_at,
        ends_at: scheduleData.ends_at,
        is_bookable: scheduleData.is_bookable,
        max_capacity: scheduleData.max_capacity,
        service_id: scheduleData.service_id ?? null,
        staff_id: scheduleData.staff_id ?? null,
        memo: scheduleData.memo ?? null,
        status: 'scheduled',
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as CoreSchedule;
  },

  /**
   * 일정 수정
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleFormData>
  ): Promise<CoreSchedule> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description ?? null;
    if (updates.starts_at !== undefined) updateData.starts_at = updates.starts_at;
    if (updates.ends_at !== undefined) updateData.ends_at = updates.ends_at;
    if (updates.is_bookable !== undefined) updateData.is_bookable = updates.is_bookable;
    if (updates.max_capacity !== undefined) updateData.max_capacity = updates.max_capacity;
    if (updates.service_id !== undefined) updateData.service_id = updates.service_id ?? null;
    if (updates.staff_id !== undefined) updateData.staff_id = updates.staff_id ?? null;
    if (updates.memo !== undefined) updateData.memo = updates.memo ?? null;

    const { data, error } = await getCoreClient()
      .from('schedules')
      .update(updateData as any)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data as CoreSchedule;
  },

  /**
   * 일정 삭제
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await getCoreClient()
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  },

  /**
   * 일정 예약 가능 여부 토글
   */
  async toggleBookable(scheduleId: string, isBookable: boolean): Promise<CoreSchedule> {
    const { data, error } = await getCoreClient()
      .from('schedules')
      .update({ is_bookable: isBookable } as any)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data as CoreSchedule;
  },
};
