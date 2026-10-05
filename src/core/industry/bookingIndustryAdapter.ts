import type { BookingStatus, ServiceOffering } from '@/core/types/schedule';

export type BookingUiFlow = 'classSlots' | 'appointmentCards';

export type ServiceCategoryLabels = Record<ServiceOffering['category'], string>;

/**
 * 공유 예약 UI가 업종 id 대신 읽는 훅.
 * 필라테스·피부만 제공하고, 없는 업종에는 어느 쪽 규칙도 적용하지 않는다.
 */
export interface BookingIndustryAdapter {
  flow: BookingUiFlow;
  categoryLabels: ServiceCategoryLabels;
  serviceDescription: string;
  serviceNamePlaceholder: string;
  /** 있으면 서비스 폼에 이 라벨로 재방문 간격을 받는다 */
  careIntervalLabel?: string;
  /** 이 상태 변경만 고객 알림. 비어 있으면 알리지 않는다 */
  notifyOnStatus: readonly BookingStatus[];
  /** 서비스명이 없을 때 알림·시간 변경 문구에 쓰는 명사 */
  sessionNoun: string;
  /** 결석 처리 시 이용권 차감 */
  consumePassOnNoShow: boolean;
  calendarAccentBtn: string;
  calendarAccentTab: string;
  calendarAccentText: string;
  statusConfirmBtnClass: string;
  serviceHeaderBtn: string;
  serviceSubmitBtn: string;
  serviceIconClass: string;
}
