import type { IndustryPluginManifest } from './pluginTypes';
import { normalizeIndustryType, type IndustryType } from './types';
import { getIndustryPlugin } from './registry';

export interface IndustryContext {
  id: IndustryType;
  plugin: IndustryPluginManifest;
  capabilities: string[];
  labels: Record<string, string>;
  source: 'user' | 'org' | 'default';
  isResolved: boolean;
}

let activeContext: IndustryContext | null = null;

export function resolveIndustryContext(
  raw: string | null | undefined,
  source: 'user' | 'org' | 'default' = 'default'
): IndustryContext {
  const normalizedId = normalizeIndustryType(raw) ?? 'piano';
  const plugin = getIndustryPlugin(normalizedId);

  const context: IndustryContext = {
    id: plugin.id,
    plugin,
    capabilities: plugin.syncCapabilities ? [...plugin.syncCapabilities] : [],
    labels: {
      placeLabel: plugin.placeLabel ?? '학원',
      customerLabel: plugin.customerLabel ?? '원생',
      ownerLabel: plugin.ownerLabel ?? '원장',
      feeLabel: plugin.feeLabel ?? '수강료',
      levelLabel: plugin.levelLabel ?? '레벨',
    },
    source,
    isResolved: Boolean(normalizedId),
  };

  activeContext = context;
  (globalThis as any).__industryContext = context;
  return context;
}

export function getActiveIndustryContext(): IndustryContext {
  if (!activeContext) {
    return resolveIndustryContext(null);
  }
  return activeContext;
}
