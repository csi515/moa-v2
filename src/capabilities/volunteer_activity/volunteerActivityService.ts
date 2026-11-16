import { getCoreClient } from '@/lib/supabase';
import { callRpc } from '@/shared/kernel';

export type VolunteerActivityRow = {
  id: string;
  organization_id: string;
  title: string;
  activity_type: string;
  description: string | null;
  capacity: number;
  event_date: string | null;
  status: 'open' | 'closed' | 'cancelled';
  created_by_member_id: string | null;
  created_at: string;
};

export type VolunteerSignupRow = {
  id: string;
  organization_id: string;
  activity_id: string;
  member_id: string;
  created_at: string;
  checked_in_at?: string | null;
};

export async function listVolunteerActivities(
  organizationId: string
): Promise<VolunteerActivityRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('volunteer_activities')
    .select('*')
    .eq('organization_id', organizationId)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VolunteerActivityRow[];
}

export async function listVolunteerSignups(
  organizationId: string,
  activityId?: string
): Promise<VolunteerSignupRow[]> {
  const client = getCoreClient();
  let q = client
    .from('volunteer_signups')
    .select('*')
    .eq('organization_id', organizationId);
  if (activityId) q = q.eq('activity_id', activityId);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VolunteerSignupRow[];
}

export async function createVolunteerActivity(input: {
  organizationId: string;
  title: string;
  activityType: string;
  description?: string;
  capacity: number;
  eventDate?: string | null;
  createdByMemberId?: string | null;
}): Promise<VolunteerActivityRow> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('volunteer_activities')
    .insert({
      organization_id: input.organizationId,
      title: input.title.trim(),
      activity_type: input.activityType.trim() || 'general',
      description: input.description?.trim() || null,
      capacity: input.capacity,
      event_date: input.eventDate || null,
      status: 'open',
      created_by_member_id: input.createdByMemberId ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as VolunteerActivityRow;
}

export async function updateVolunteerActivityStatus(
  activityId: string,
  status: 'open' | 'closed' | 'cancelled'
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('volunteer_activities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', activityId);
  if (error) throw new Error(error.message);
}

export async function joinVolunteerActivity(activityId: string): Promise<Record<string, unknown>> {
  const client = getCoreClient();
  const { data, error } = await callRpc<Record<string, unknown>>(client, 'join_volunteer_activity', {
    p_activity_id: activityId,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function cancelVolunteerSignup(activityId: string): Promise<Record<string, unknown>> {
  const client = getCoreClient();
  const { data, error } = await callRpc<Record<string, unknown>>(client, 'cancel_volunteer_signup', {
    p_activity_id: activityId,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function setVolunteerSignupCheckin(input: {
  organizationId: string;
  activityId: string;
  memberId: string;
  checkedIn: boolean;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await callRpc(client, 'set_volunteer_signup_checkin', {
    p_organization_id: input.organizationId,
    p_activity_id: input.activityId,
    p_member_id: input.memberId,
    p_checked_in: input.checkedIn,
  });
  if (error) throw new Error(error.message);
}
