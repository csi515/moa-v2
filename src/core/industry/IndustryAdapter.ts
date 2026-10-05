import { getActiveIndustryContext, type IndustryContext } from './contextResolver';
import type { IndustryPluginManifest } from './pluginTypes';

export class IndustryAdapter {
  static getContext(): IndustryContext {
    return getActiveIndustryContext();
  }

  static getManifest<K extends keyof IndustryPluginManifest>(key: K): IndustryPluginManifest[K] {
    const ctx = IndustryAdapter.getContext();
    return ctx.plugin[key];
  }

  static getLabel(labelKey: keyof IndustryContext['labels'], fallback = ''): string {
    const ctx = IndustryAdapter.getContext();
    return ctx.labels[labelKey] ?? fallback;
  }
}
