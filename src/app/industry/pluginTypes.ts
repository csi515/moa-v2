export type { IndustryPluginManifest, IndustryPluginManifest as IndustryPlugin } from '@/core/industry/pluginTypes';
export type {
  IndustryPluginAdapter,
  IndustryFeatureKey,
  IndustryLabelKey,
} from '@/core/industry/IndustryAdapter';
export {
  IndustryAdapter,
  DefaultFallbackPluginAdapter,
  StandardIndustryPluginAdapter,
  getIndustryPluginAdapter,
} from '@/core/industry/IndustryAdapter';
