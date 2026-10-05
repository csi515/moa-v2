import type { BookingIndustryAdapter } from '@/core/industry/bookingIndustryAdapter';

/** 필라테스 예약·수업 종류 화면 규칙 */
export const pilatesBookingAdapter: BookingIndustryAdapter = {
  flow: 'classSlots',
  categoryLabels: {
    private: '개인',
    group: '그룹',
    reformer: '기구',
    other: '기타',
  },
  serviceDescription: '개인·그룹·기구 필라테스 수업 종류와 시간·요금을 설정합니다',
  serviceNamePlaceholder: '개인 레슨 50분',
  notifyOnStatus: ['confirmed', 'cancelled', 'completed', 'no_show'],
  sessionNoun: '수업',
  consumePassOnNoShow: true,
  calendarAccentBtn: 'bg-teal-600 hover:bg-teal-700',
  calendarAccentTab: 'bg-teal-600 text-white',
  calendarAccentText: 'text-teal-700',
  statusConfirmBtnClass: 'bg-teal-600',
  serviceHeaderBtn: 'bg-purple-600 hover:bg-purple-700',
  serviceSubmitBtn: 'bg-purple-600',
  serviceIconClass: 'text-purple-600',
};
