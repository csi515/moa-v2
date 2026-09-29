/**
 * 업종 sync capability 레지스트리.
 * 계약·조회·실행만 담당한다. 업종별 구현을 import하거나 직접 등록하지 않는다.
 *
 * 등록은 Industry bootstrap(`src/industries/<id>/sync/register*Sync.ts`)이 한다.
 * manifest `syncCapabilities`는 “이 업종이 어떤 id를 쓰는지”만 선언한다.
 */
import { getIndustryPlugin } from '@/core/industry/registry';
import type { StorageKey } from './storageKeys';
import type { PersistAbortGuard, SyncCache } from './sync/syncTypes';

export type IndustrySyncCapabilityId = string;

export type IndustrySyncCapability = {
  id: IndustrySyncCapabilityId;
  hydrate: (organizationId: string, cache: SyncCache) => Promise<void>;
  persist: (
    key: StorageKey,
    organizationId: string,
    cache: SyncCache,
    isAborted: PersistAbortGuard
  ) => Promise<boolean>;
  persistKeys: ReadonlySet<StorageKey>;
};

const CAPABILITIES = new Map<IndustrySyncCapabilityId, IndustrySyncCapability>();

/** 같은 id는 교체한다. HMR·재초기화에서 중복 등록해도 안전하다. */
export function registerIndustrySyncCapability(capability: IndustrySyncCapability): void {
  CAPABILITIES.set(capability.id, capability);
}

export function unregisterIndustrySyncCapability(id: IndustrySyncCapabilityId): void {
  CAPABILITIES.delete(id);
}

export function getIndustrySyncCapability(
  id: IndustrySyncCapabilityId
): IndustrySyncCapability | undefined {
  return CAPABILITIES.get(id);
}

export function listIndustrySyncCapabilities(): IndustrySyncCapability[] {
  return [...CAPABILITIES.values()];
}

/** 플러그인 매니페스트에 선언된 hydrate capability만 */
export function resolveIndustryHydrateCapabilities(
  industryType?: string | null
): IndustrySyncCapability[] {
  const declared = getIndustryPlugin(industryType).syncCapabilities ?? [];
  return declared
    .map((id) => CAPABILITIES.get(id))
    .filter((cap): cap is IndustrySyncCapability => Boolean(cap));
}

/** persist는 키 기준 — 등록된 capability 중 persistKeys에 포함된 것만 */
export async function persistRegisteredCapabilities(
  key: StorageKey,
  organizationId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  let ok = true;
  for (const capability of CAPABILITIES.values()) {
    if (!capability.persistKeys.has(key)) continue;
    ok = (await capability.persist(key, organizationId, cache, isAborted)) && ok;
    if (isAborted()) return false;
  }
  return ok;
}
