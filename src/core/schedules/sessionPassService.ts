/**
 * 이용권 Domain Service — 규칙 적용 + SESSION_PASSES persistence.
 * StorageService의 consume/save는 이 서비스를 위임 호출한다(God logic 방지).
 */
import type { SessionPass } from '@/core/types/schedule';
import { STORAGE_KEYS } from '@/services/adapters';
import { generateEntityId, getItem, setItem } from '@/services/storage/helpers';
import {
  applyConsumeToPassList,
  applyRefundToPassList,
  hasNonCancelledPassEntitlement,
  withDerivedSessionPassStatus,
} from './sessionPassRules';

function readPasses(): SessionPass[] {
  return getItem<SessionPass[]>(STORAGE_KEYS.SESSION_PASSES, []);
}

function writePasses(list: SessionPass[]): void {
  setItem(STORAGE_KEYS.SESSION_PASSES, list);
}

export const sessionPassService = {
  list(): SessionPass[] {
    return readPasses();
  },

  /** 고객 1명 이용권 — 전체 list 후 UI filter 대신 서비스에서 좁힘 */
  listByCustomer(customerId: string): SessionPass[] {
    if (!customerId) return [];
    const out: SessionPass[] = [];
    for (const pass of readPasses()) {
      if (pass.customerId === customerId) out.push(pass);
    }
    return out;
  },

  hasEntitlement(customerId: string): boolean {
    return hasNonCancelledPassEntitlement(readPasses(), customerId);
  },

  /** status는 잔여 횟수로 정규화 후 저장 */
  save(pass: Omit<SessionPass, 'id'> & { id?: string }): SessionPass {
    const list = readPasses();
    let saved: SessionPass;

    if (pass.id) {
      const idx = list.findIndex((entry) => entry.id === pass.id);
      if (idx >= 0) {
        saved = withDerivedSessionPassStatus({ ...list[idx], ...pass, id: pass.id });
        list[idx] = saved;
      } else {
        saved = withDerivedSessionPassStatus({ ...pass, id: pass.id } as SessionPass);
        list.unshift(saved);
      }
    } else {
      saved = withDerivedSessionPassStatus({
        ...pass,
        id: generateEntityId('pass'),
      } as SessionPass);
      list.unshift(saved);
    }

    writePasses(list);
    return saved;
  },

  delete(id: string): boolean {
    const list = readPasses();
    const next = list.filter((p) => p.id !== id);
    if (next.length === list.length) return false;
    writePasses(next);
    return true;
  },

  /** 이용권 1회 차감. 성공 시 passId */
  consume(customerId: string): string | null {
    const result = applyConsumeToPassList(readPasses(), customerId);
    if (!result) return null;
    writePasses(result.list);
    return result.passId;
  },

  /** 완료 취소 시 1회 복구 */
  refund(passId: string): boolean {
    const result = applyRefundToPassList(readPasses(), passId);
    if (!result.ok) return false;
    writePasses(result.list);
    return true;
  },
};
