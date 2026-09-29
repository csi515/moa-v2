import { lazy } from 'react';
import { pianoPluginManifest } from '@/industries/piano/plugin';
import { pilatesPluginManifest } from '@/industries/pilates/plugin';
import { gymPluginManifest } from '@/industries/gym/plugin';
import { daycarePluginManifest } from '@/industries/daycare/plugin';
import { skinPluginManifest } from '@/industries/skin/plugin';
import { retailPluginManifest } from '@/industries/retail/plugin';
import { bathPluginManifest } from '@/industries/bath/plugin';
import { isStaleChunkError, reloadOnceForStaleAssets } from '@/shared/pwa/reloadOnStaleChunk';
import {
  defineIndustryModule,
  type IndustryAppComponent,
  type IndustryModuleDefinition,
} from './defineIndustryModule';

function wrapIndustryApp(module: IndustryModuleDefinition): IndustryAppComponent {
  return lazy(async () => {
    try {
      const [appMod, labelsMod] = await Promise.all([module.loadApp(), module.loadLabels()]);
      const App = appMod[module.appExport];
      const { ModuleLabelsProvider } = labelsMod;
      function IndustryApp() {
        return (
          <ModuleLabelsProvider>
            <App />
          </ModuleLabelsProvider>
        );
      }
      return { default: IndustryApp };
    } catch (error) {
      if (isStaleChunkError(error)) {
        reloadOnceForStaleAssets();
      }
      throw error;
    }
  });
}

/**
 * 전용 모듈 업종 단일 등록부.
 * 라우터·로더·플러그인 설치는 이 목록만 본다.
 */
export const INDUSTRY_MODULES: readonly IndustryModuleDefinition[] = [
  defineIndustryModule({
    id: 'piano',
    plugin: pianoPluginManifest,
    appExport: 'PianoAppContent',
    loadApp: () => import('@/industries/piano/PianoAppContent'),
    loadLabels: () => import('@/industries/piano/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'pilates',
    plugin: pilatesPluginManifest,
    appExport: 'PilatesAppContent',
    loadApp: () => import('@/industries/pilates/PilatesAppContent'),
    loadLabels: () => import('@/industries/pilates/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'gym',
    plugin: gymPluginManifest,
    appExport: 'GymAppContent',
    loadApp: () => import('@/industries/gym/GymAppContent'),
    loadLabels: () => import('@/industries/gym/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'daycare',
    plugin: daycarePluginManifest,
    appExport: 'DaycareAppContent',
    loadApp: () => import('@/industries/daycare/DaycareAppContent'),
    loadLabels: () => import('@/industries/daycare/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'skin_clinic',
    plugin: skinPluginManifest,
    appExport: 'SkinAppContent',
    loadApp: () => import('@/industries/skin/SkinAppContent'),
    loadLabels: () => import('@/industries/skin/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'retail',
    plugin: retailPluginManifest,
    appExport: 'RetailAppContent',
    loadApp: () => import('@/industries/retail/RetailAppContent'),
    loadLabels: () => import('@/industries/retail/config/ModuleLabelsProvider'),
  }),
  defineIndustryModule({
    id: 'sauna_jjimjilbang',
    plugin: bathPluginManifest,
    appExport: 'BathAppContent',
    loadApp: () => import('@/industries/bath/BathAppContent'),
    loadLabels: () => import('@/industries/bath/config/ModuleLabelsProvider'),
  }),
];

const MODULE_BY_ID = new Map(INDUSTRY_MODULES.map((m) => [m.id, m]));

export function getIndustryModule(id: string): IndustryModuleDefinition | undefined {
  return MODULE_BY_ID.get(id as IndustryModuleDefinition['id']);
}

export function listIndustryModules(): readonly IndustryModuleDefinition[] {
  return INDUSTRY_MODULES;
}

export const APP_BY_INDUSTRY: Record<string, IndustryAppComponent> = Object.fromEntries(
  INDUSTRY_MODULES.map((m) => [m.id, wrapIndustryApp(m)])
);
