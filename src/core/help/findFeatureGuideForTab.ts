import type { IndustryType } from '@/core/industry/types';
import { getIndustryFeatureGuide, type FeatureGuideItem, type FeatureGuideSection } from './featureGuides';

/** activeTab → featureGuides section/item id 후보 */
const TAB_GUIDE_KEYS: Record<string, string[]> = {
  dashboard: ['dashboard', 'home'],
  students: ['students', 'customers', 'customer', 'members', 'customers'],
  attendance: ['attendance'],
  'check-in': ['attendance'],
  tuition: ['tuition', 'billing', 'finance', 'unpaid'],
  unpaid: ['unpaid', 'tuition', 'billing', 'finance'],
  finance: ['finance', 'billing'],
  timetable: ['timetable', 'classes', 'schedules', 'booking'],
  classes: ['classes', 'timetable', 'schedules'],
  bookings: ['booking', 'bookings', 'classes'],
  passes: ['passes', 'billing'],
  inventory: ['inventory', 'commerce', 'stock'],
  sales: ['sales', 'pos', 'commerce'],
  settings: ['settings'],
  staff: ['staff', 'shifts'],
  shifts: ['shifts', 'staff'],
  consultations: ['consultation', 'crm', 'consultations'],
  notices: ['notices'],
  lockers: ['locker', 'lockers'],
  'seat-rooms': ['seat_room', 'seat-rooms', 'resources'],
  'treatment-chart': ['treatment', 'treatment-chart', 'chart'],
};

function collectMatches(
  sections: FeatureGuideSection[],
  keys: string[]
): { section: FeatureGuideSection; item: FeatureGuideItem } | null {
  const keySet = new Set(keys.map((k) => k.toLowerCase()));

  for (const section of sections) {
    if (keySet.has(section.id.toLowerCase())) {
      const preferred =
        section.items.find((item) => keySet.has(item.id.toLowerCase())) ?? section.items[0];
      if (preferred) return { section, item: preferred };
    }
  }

  for (const section of sections) {
    for (const item of section.items) {
      if (keySet.has(item.id.toLowerCase())) {
        return { section, item };
      }
    }
  }

  return null;
}

export function findFeatureGuideForTab(
  industry: IndustryType | string | null | undefined,
  activeTab: string | null | undefined
): { sectionTitle: string; item: FeatureGuideItem } | null {
  if (!activeTab || activeTab === 'dashboard') return null;
  const { sections } = getIndustryFeatureGuide(industry);
  const keys = TAB_GUIDE_KEYS[activeTab] ?? [activeTab];
  const match = collectMatches(sections, keys);
  if (!match) return null;
  return { sectionTitle: match.section.title, item: match.item };
}
