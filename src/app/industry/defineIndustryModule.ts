import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { IndustryType } from '@/core/industry/types';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';

export type IndustryAppComponent = LazyExoticComponent<ComponentType>;

export type IndustryModuleDefinition = {
  id: IndustryType;
  plugin: IndustryPluginManifest;
  loadApp: () => Promise<Record<string, ComponentType>>;
  appExport: string;
  loadLabels: () => Promise<{ ModuleLabelsProvider: ComponentType<{ children: ReactNode }> }>;
};

export function defineIndustryModule(module: IndustryModuleDefinition): IndustryModuleDefinition {
  if (module.plugin.id !== module.id) {
    throw new Error(`Industry module id mismatch: plugin=${module.plugin.id} module=${module.id}`);
  }
  return module;
}
