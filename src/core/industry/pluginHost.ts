import type { IndustryPluginManifest } from './pluginTypes';
import { buildGenericPluginManifest } from './genericPlugin';
import { getIndustryDefinition, INDUSTRY_DEFINITIONS } from './catalog';
import { isBlankIndustryInput, parseIndustryType } from './types';

const installed = new Map<string, IndustryPluginManifest>();

export function installIndustryPlugin(plugin: IndustryPluginManifest): void {
  installed.set(plugin.id, plugin);
}

export function installIndustryPlugins(plugins: readonly IndustryPluginManifest[]): void {
  for (const plugin of plugins) {
    installIndustryPlugin(plugin);
  }
}

export function getInstalledIndustryPlugin(id: string): IndustryPluginManifest | undefined {
  return installed.get(id);
}

export function listInstalledIndustryPluginIds(): string[] {
  return [...installed.keys()].sort();
}

export function listIndustryPlugins(): IndustryPluginManifest[] {
  return [...installed.values()];
}

function unknownIndustryPlugin(): IndustryPluginManifest {
  return buildGenericPluginManifest(INDUSTRY_DEFINITIONS.academy);
}

/**
 * 설치된 전용 플러그인 → 카탈로그 Generic → unknown Generic.
 * 빈 값은 레거시 미설정으로 piano 플러그인을 쓴다.
 * 카탈로그에 없는 업종은 piano로 위장하지 않는다.
 */
export function getIndustryPlugin(
  industry: string | null | undefined
): IndustryPluginManifest {
  if (isBlankIndustryInput(industry)) {
    return installed.get('piano') ?? buildGenericPluginManifest(INDUSTRY_DEFINITIONS.piano);
  }
  const parsed = parseIndustryType(industry);
  if (!parsed) {
    return unknownIndustryPlugin();
  }
  const installedPlugin = installed.get(parsed);
  if (installedPlugin) return installedPlugin;
  const definition = getIndustryDefinition(parsed);
  if (definition) return buildGenericPluginManifest(definition);
  return unknownIndustryPlugin();
}

export function listIndustryIds(): string[] {
  return listInstalledIndustryPluginIds();
}
