/**
 * 전용 모듈 업종 → Sidebar / BottomNav / theme.
 * GenericIndustryShell(external viewMap)에서 ModuleAppShell에 연결한다.
 */
import type { ComponentType } from 'react';
import type { ModuleIndustryId } from '@/core/industry/types';
import type { ModuleTheme } from '@/shared/components/layout/moduleTheme';
import { PianoSidebar } from '@/industries/piano/layout/PianoSidebar';
import { PianoBottomNav } from '@/industries/piano/layout/PianoBottomNav';
import { RetailSidebar } from '@/industries/retail/layout/RetailSidebar';
import { RetailBottomNav } from '@/industries/retail/layout/RetailBottomNav';
import { PilatesSidebar } from '@/industries/pilates/layout/PilatesSidebar';
import { PilatesBottomNav } from '@/industries/pilates/layout/PilatesBottomNav';
import { GymSidebar } from '@/industries/gym/layout/GymSidebar';
import { GymBottomNav } from '@/industries/gym/layout/GymBottomNav';
import { DaycareSidebar } from '@/industries/daycare/layout/DaycareSidebar';
import { DaycareBottomNav } from '@/industries/daycare/layout/DaycareBottomNav';
import { SkinSidebar } from '@/industries/skin/layout/SkinSidebar';
import { SkinBottomNav } from '@/industries/skin/layout/SkinBottomNav';
import { BathSidebar } from '@/industries/bath/layout/BathSidebar';
import { BathBottomNav } from '@/industries/bath/layout/BathBottomNav';

export type ModuleChrome = {
  theme: ModuleTheme;
  Sidebar: ComponentType;
  BottomNav: ComponentType;
};

const MODULE_CHROME: Record<ModuleIndustryId, ModuleChrome> = {
  piano: { theme: 'indigo', Sidebar: PianoSidebar, BottomNav: PianoBottomNav },
  pilates: { theme: 'teal', Sidebar: PilatesSidebar, BottomNav: PilatesBottomNav },
  gym: { theme: 'orange', Sidebar: GymSidebar, BottomNav: GymBottomNav },
  daycare: { theme: 'sky', Sidebar: DaycareSidebar, BottomNav: DaycareBottomNav },
  skin_clinic: { theme: 'rose', Sidebar: SkinSidebar, BottomNav: SkinBottomNav },
  retail: { theme: 'teal', Sidebar: RetailSidebar, BottomNav: RetailBottomNav },
  sauna_jjimjilbang: { theme: 'orange', Sidebar: BathSidebar, BottomNav: BathBottomNav },
};

export function getModuleChrome(moduleId: ModuleIndustryId): ModuleChrome {
  return MODULE_CHROME[moduleId];
}
