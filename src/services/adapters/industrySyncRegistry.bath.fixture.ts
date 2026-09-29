/**
 * 가상 bath sync capability — production 등록 없음.
 * `industrySyncRegistry.test.ts` self-test 전용.
 *
 * 실제 bath plugin(`sauna_jjimjilbang`)은 syncCapabilities가 없다.
 * 새 Industry sync는 register 모듈 + plugin 선언만으로 붙는다는 것을 여기서 증명한다.
 */
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import {
  registerIndustrySyncCapability,
  unregisterIndustrySyncCapability,
} from './industrySyncRegistry';
import type { StorageKey } from './storageKeys';

export const VIRTUAL_BATH_SYNC_ID = 'bath';
/** 카탈로그에 있는 bath 업종 id. parseIndustryType이 인식해야 resolve가 동작한다. */
export const VIRTUAL_BATH_INDUSTRY_TYPE = 'sauna_jjimjilbang';
export const VIRTUAL_BATH_PERSIST_KEY = '__virtual_bath_key__' as StorageKey;

const fixturePlugin: IndustryPluginManifest = {
  id: VIRTUAL_BATH_INDUSTRY_TYPE,
  option: {
    value: VIRTUAL_BATH_INDUSTRY_TYPE,
    label: 'virtual-bath-sync',
    description: 'virtual-bath-sync',
  },
  theme: 'orange',
  accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '이용 등급',
  adminTabs: [],
  staffTabs: [],
  syncCapabilities: [VIRTUAL_BATH_SYNC_ID],
};

export type VirtualBathSyncFixture = {
  hydrateCalls: number;
  persistCalls: number;
};

export function installVirtualBathSyncFixture(): VirtualBathSyncFixture {
  const state: VirtualBathSyncFixture = { hydrateCalls: 0, persistCalls: 0 };
  installIndustryPlugin(fixturePlugin);
  registerIndustrySyncCapability({
    id: VIRTUAL_BATH_SYNC_ID,
    hydrate: async () => {
      state.hydrateCalls += 1;
    },
    persist: async () => {
      state.persistCalls += 1;
      return true;
    },
    persistKeys: new Set([VIRTUAL_BATH_PERSIST_KEY]),
  });
  return state;
}

export function uninstallVirtualBathSyncFixture(): void {
  unregisterIndustrySyncCapability(VIRTUAL_BATH_SYNC_ID);
  installIndustryPlugin({
    ...fixturePlugin,
    syncCapabilities: undefined,
  });
}
