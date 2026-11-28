/**
 * Phase 3c: 예약(booking) 도메인 라이프사이클 카탈로그.
 * 기본값은 reservationMachine과 동일. DB에서 is_enabled / side_effects 토글.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  RESERVATION_MACHINE,
  type ReservationCommand,
  type ReservationMachineStatus,
} from '@/core/schedules/reservationMachine';
import {
  applyTransition,
  canTransition,
  type StateMachine,
} from '@/core/domain/stateMachine';

export interface LifecycleSideEffect {
  effectKey: string;
  isEnabled: boolean;
}

export interface BookingLifecycleCatalog {
  machine: StateMachine<ReservationMachineStatus, ReservationCommand>;
  sideEffects: Record<ReservationCommand, LifecycleSideEffect[]>;
}

const DEFAULT_SIDE: Record<ReservationCommand, LifecycleSideEffect[]> = {
  confirm: [{ effectKey: 'notify', isEnabled: true }],
  cancel: [{ effectKey: 'notify', isEnabled: false }],
};

export function defaultBookingLifecycleCatalog(): BookingLifecycleCatalog {
  return {
    machine: RESERVATION_MACHINE,
    sideEffects: DEFAULT_SIDE,
  };
}

export async function seedBookingLifecycle(organizationId: string): Promise<void> {
  if (!organizationId || !isSupabaseConfigured()) return;
  try {
    await getCoreClient().rpc('seed_booking_lifecycle', { p_org_id: organizationId });
  } catch {
    // 미배포 skip
  }
}

export async function loadBookingLifecycleCatalog(
  organizationId: string | null | undefined
): Promise<BookingLifecycleCatalog> {
  const fallback = defaultBookingLifecycleCatalog();
  if (!organizationId || !isSupabaseConfigured()) return fallback;

  try {
    const client = getCoreClient();
    const [transitionsRes, effectsRes] = await Promise.all([
      client
        .from('lifecycle_transitions')
        .select('from_status, command, to_status, is_enabled')
        .eq('organization_id', organizationId)
        .eq('domain', 'booking'),
      client
        .from('lifecycle_side_effects')
        .select('transition_command, effect_key, is_enabled')
        .eq('organization_id', organizationId)
        .eq('domain', 'booking'),
    ]);

    if (transitionsRes.error || !transitionsRes.data?.length) {
      await seedBookingLifecycle(organizationId);
      return fallback;
    }

    const transitions = (transitionsRes.data ?? [])
      .filter((row) => row.is_enabled)
      .map((row) => ({
        from: row.from_status as ReservationMachineStatus,
        command: row.command as ReservationCommand,
        to: row.to_status as ReservationMachineStatus,
      }));

    const machine: StateMachine<ReservationMachineStatus, ReservationCommand> = {
      name: 'reservation',
      states: RESERVATION_MACHINE.states,
      initial: RESERVATION_MACHINE.initial,
      transitions: transitions.length > 0 ? transitions : RESERVATION_MACHINE.transitions,
    };

    const sideEffects: Record<ReservationCommand, LifecycleSideEffect[]> = {
      confirm: [],
      cancel: [],
    };
    for (const row of effectsRes.data ?? []) {
      const cmd = row.transition_command as ReservationCommand;
      if (cmd !== 'confirm' && cmd !== 'cancel') continue;
      sideEffects[cmd].push({
        effectKey: row.effect_key,
        isEnabled: row.is_enabled,
      });
    }
    if (sideEffects.confirm.length === 0) sideEffects.confirm = DEFAULT_SIDE.confirm;
    if (sideEffects.cancel.length === 0) sideEffects.cancel = DEFAULT_SIDE.cancel;

    return { machine, sideEffects };
  } catch {
    return fallback;
  }
}

export function canApplyBookingCommand(
  catalog: BookingLifecycleCatalog,
  status: ReservationMachineStatus,
  command: ReservationCommand
): boolean {
  return canTransition(catalog.machine, status, command);
}

export function applyBookingCommand(
  catalog: BookingLifecycleCatalog,
  status: ReservationMachineStatus,
  command: ReservationCommand
): ReservationMachineStatus {
  return applyTransition(catalog.machine, status, command);
}

export function isBookingSideEffectEnabled(
  catalog: BookingLifecycleCatalog,
  command: ReservationCommand,
  effectKey: string
): boolean {
  const list = catalog.sideEffects[command] ?? [];
  const found = list.find((e) => e.effectKey === effectKey);
  return found?.isEnabled === true;
}

export async function setBookingSideEffectEnabled(
  organizationId: string,
  command: ReservationCommand,
  effectKey: string,
  isEnabled: boolean
): Promise<void> {
  const { error } = await getCoreClient()
    .from('lifecycle_side_effects')
    .upsert(
      {
        organization_id: organizationId,
        domain: 'booking',
        transition_command: command,
        effect_key: effectKey,
        is_enabled: isEnabled,
      },
      { onConflict: 'organization_id,domain,transition_command,effect_key' }
    );
  if (error) throw error;
}
