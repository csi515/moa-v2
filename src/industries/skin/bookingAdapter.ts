import type { BookingIndustryAdapter } from '@/core/industry/bookingIndustryAdapter';

/** 피부관리 예약·시술 화면 규칙 */
export const skinBookingAdapter: BookingIndustryAdapter = {
  flow: 'appointmentCards',
  categoryLabels: {
    private: '1:1',
    group: '그룹',
    reformer: '집중',
    other: '기타',
  },
  serviceDescription: '1:1·그룹 시술과 시간·요금을 설정합니다',
  serviceNamePlaceholder: '기본 관리 60분',
  careIntervalLabel: '권장 재방문 간격(일)',
  notifyOnStatus: ['confirmed', 'cancelled'],
  sessionNoun: '시술',
  consumePassOnNoShow: false,
  calendarAccentBtn: 'bg-rose-600 hover:bg-rose-700',
  calendarAccentTab: 'bg-rose-600 text-white',
  calendarAccentText: 'text-rose-700',
  statusConfirmBtnClass: 'bg-rose-600',
  serviceHeaderBtn: 'bg-rose-600 hover:bg-rose-700',
  serviceSubmitBtn: 'bg-rose-600',
  serviceIconClass: 'text-rose-600',
};
