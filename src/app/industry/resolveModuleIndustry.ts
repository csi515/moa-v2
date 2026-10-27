/**
 * industry_type(카탈로그 id · 프리셋 id) → 전용 모듈 id 해석.
 * apparel/convenience 등 파생 프리셋은 retail 모듈을 공유한다.
 * 기업형 Generic 프리셋은 모듈 id 없이 ModuleAppShell 크로뮴만 사용한다.
 */
import {
  hasIndustryModule,
  isBlankIndustryInput,
  parseIndustryType,
  type ModuleIndustryId,
} from '@/core/industry/types';
import {
  SHARED_MODULE_BY_INDUSTRY,
  resolveSharedModuleId,
} from '@/core/industry/sharedModuleBindings';

/** @deprecated Core SHARED_MODULE_BY_INDUSTRY 사용 */
export const PRESET_MODULE_BINDINGS = SHARED_MODULE_BY_INDUSTRY;

/** GenericIndustryShell + ModuleAppShell (Refine 독 숨김) */
export const CORPORATE_CHROME_PRESETS: ReadonlySet<string> = new Set([
  'personal_plant_ops',
  'personal_plant',
  'plant_ops',
  'general_enterprise',
  'corporate_general_affairs',
  'rnd_lab_management',
  'rnd_lab',
  'iso_ims_enterprise',
  'iso_human_capital',
  'manufacturing_light',
  'procurement_distribution',
]);

export function isCorporateChromePreset(
  industryType?: string | null
): boolean {
  const raw = industryType?.trim() ?? '';
  if (!raw) return false;
  if (CORPORATE_CHROME_PRESETS.has(raw)) return true;
  return false;
}

export function resolveModuleIndustryId(
  industryType?: string | null
): ModuleIndustryId | null {
  const raw = industryType?.trim() ?? '';
  if (!raw) {
    return null; // 빈 값·미로드는 piano로 위장하지 않는다 (core/industry/resolveIndustry.ts)
  }

  const shared = resolveSharedModuleId(raw);
  if (shared && hasIndustryModule(shared)) {
    return shared as ModuleIndustryId;
  }

  const parsed = parseIndustryType(raw);
  if (parsed && hasIndustryModule(parsed)) {
    return parsed as ModuleIndustryId;
  }
  return null;
}

export function shouldUseModuleChrome(
  industryType: string | null | undefined,
  pathname: string
): boolean {
  const onWorkspace =
    pathname === '/' ||
    pathname === '' ||
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/rnd');
  if (!onWorkspace) return false;
  if (resolveModuleIndustryId(industryType)) return true;
  return isCorporateChromePreset(industryType);
}
