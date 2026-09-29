import type { SessionPass, SlotRecruitment } from '../../core/types/schedule';
import type { AcademySettings } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { DEFAULT_SETTINGS, getItem, setItem } from './helpers';
import { buildSlotKey, normalizeStaffId, UNASSIGNED_STAFF_TOKEN } from '@/core/schedules/bookingCapacity';
import { sessionPassService } from '@/core/schedules/sessionPassService';

/** 슬롯 모집 상태를 settings에도 기록해 다기기 sync */
function persistSlotRecruitments(list: SlotRecruitment[]): void {
  setItem(STORAGE_KEYS.SLOT_RECRUITMENTS, list);
  const settings = getItem<AcademySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  setItem(STORAGE_KEYS.SETTINGS, { ...settings, slotRecruitments: list });
}

/**
 * 이용권·슬롯 모집 persistence 어댑터.
 * 이용권 비즈니스 규칙(status 정규화·차감·복구)은 sessionPassService에 위임.
 * StorageService public API(consumeSessionPass 등)는 호환용 thin wrapper.
 */
export function createSessionPassStorage() {
  return {
    getSessionPasses(): SessionPass[] {
      return sessionPassService.list();
    },

    saveSessionPass(pass: Omit<SessionPass, 'id'> & { id?: string }): SessionPass {
      return sessionPassService.save(pass);
    },

    deleteSessionPass(id: string): boolean {
      return sessionPassService.delete(id);
    },

    /** @deprecated Domain: sessionPassService.consume — Storage API 호환 */
    consumeSessionPass(customerId: string): string | null {
      return sessionPassService.consume(customerId);
    },

    /** @deprecated Domain: sessionPassService.refund — Storage API 호환 */
    refundSessionPass(passId: string): boolean {
      return sessionPassService.refund(passId);
    },

    getSlotRecruitments(): SlotRecruitment[] {
      return getItem<SlotRecruitment[]>(STORAGE_KEYS.SLOT_RECRUITMENTS, []);
    },

    setSlotRecruitmentClosed(
      serviceId: string,
      staffId: string | null | undefined,
      startsAt: string,
      closedManually: boolean
    ): SlotRecruitment {
      const normalizedStaffId = normalizeStaffId(staffId);
      const id = buildSlotKey(serviceId, normalizedStaffId, startsAt);
      const list = this.getSlotRecruitments();
      const idx = list.findIndex((r) => r.id === id);
      const saved: SlotRecruitment = {
        id,
        serviceId,
        staffId: normalizedStaffId === UNASSIGNED_STAFF_TOKEN ? '' : normalizedStaffId,
        startsAt,
        closedManually,
      };
      if (idx >= 0) list[idx] = { ...list[idx], ...saved, maxCapacity: list[idx].maxCapacity };
      else list.unshift(saved);
      persistSlotRecruitments(list);
      return saved;
    },

    setSlotRecruitmentCapacity(
      serviceId: string,
      staffId: string | null | undefined,
      startsAt: string,
      maxCapacity: number
    ): SlotRecruitment {
      const normalizedStaffId = normalizeStaffId(staffId);
      const id = buildSlotKey(serviceId, normalizedStaffId, startsAt);
      const list = this.getSlotRecruitments();
      const idx = list.findIndex((r) => r.id === id);
      const saved: SlotRecruitment = {
        id,
        serviceId,
        staffId: normalizedStaffId === UNASSIGNED_STAFF_TOKEN ? '' : normalizedStaffId,
        startsAt,
        closedManually: idx >= 0 ? list[idx].closedManually : false,
        maxCapacity: Math.max(1, maxCapacity),
      };
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      persistSlotRecruitments(list);
      return saved;
    },
  };
}
