import { getIndustryPlugin } from '@/core/industry/pluginHost';
import type {
  BookingIndustryAdapter,
  ServiceCategoryLabels,
} from '@/core/industry/bookingIndustryAdapter';

/** 훅이 없을 때의 분류. 필라테스(기구)나 피부(집중) 라벨이 아니다. */
export const NEUTRAL_SERVICE_CATEGORY_LABELS: ServiceCategoryLabels = {
  private: '개별',
  group: '그룹',
  reformer: '기타 유형',
  other: '기타',
};

export interface ResolvedBookingUi {
  flow: BookingIndustryAdapter['flow'] | 'none';
  categoryLabels: ServiceCategoryLabels;
  serviceDescription: string;
  serviceNamePlaceholder: string;
  careIntervalLabel?: string;
  notifyOnStatus: readonly BookingIndustryAdapter['notifyOnStatus'][number][];
  sessionNoun: string;
  consumePassOnNoShow: boolean;
  calendarAccentBtn: string;
  calendarAccentTab: string;
  calendarAccentText: string;
  statusConfirmBtnClass: string;
  serviceHeaderBtn: string;
  serviceSubmitBtn: string;
  serviceIconClass: string;
}

const NEUTRAL_BOOKING_UI: ResolvedBookingUi = {
  flow: 'none',
  categoryLabels: NEUTRAL_SERVICE_CATEGORY_LABELS,
  serviceDescription: '시간·요금을 설정합니다',
  serviceNamePlaceholder: '',
  notifyOnStatus: [],
  sessionNoun: '',
  consumePassOnNoShow: false,
  calendarAccentBtn: 'bg-slate-700 hover:bg-slate-800',
  calendarAccentTab: 'bg-slate-700 text-white',
  calendarAccentText: 'text-slate-700',
  statusConfirmBtnClass: 'bg-slate-700',
  serviceHeaderBtn: 'bg-slate-700 hover:bg-slate-800',
  serviceSubmitBtn: 'bg-slate-700',
  serviceIconClass: 'text-slate-600',
};

export function resolveBookingIndustryAdapter(
  industry: string | null | undefined
): BookingIndustryAdapter | null {
  return getIndustryPlugin(industry).bookingAdapter ?? null;
}

/** 플러그인 훅이 없으면 필라테스·피부 규칙을 쓰지 않는 중립 화면 */
export function resolveBookingUi(industry: string | null | undefined): ResolvedBookingUi {
  const adapter = resolveBookingIndustryAdapter(industry);
  if (!adapter) return NEUTRAL_BOOKING_UI;
  return {
    flow: adapter.flow,
    categoryLabels: adapter.categoryLabels,
    serviceDescription: adapter.serviceDescription,
    serviceNamePlaceholder: adapter.serviceNamePlaceholder,
    careIntervalLabel: adapter.careIntervalLabel,
    notifyOnStatus: adapter.notifyOnStatus,
    sessionNoun: adapter.sessionNoun,
    consumePassOnNoShow: adapter.consumePassOnNoShow,
    calendarAccentBtn: adapter.calendarAccentBtn,
    calendarAccentTab: adapter.calendarAccentTab,
    calendarAccentText: adapter.calendarAccentText,
    statusConfirmBtnClass: adapter.statusConfirmBtnClass,
    serviceHeaderBtn: adapter.serviceHeaderBtn,
    serviceSubmitBtn: adapter.serviceSubmitBtn,
    serviceIconClass: adapter.serviceIconClass,
  };
}
