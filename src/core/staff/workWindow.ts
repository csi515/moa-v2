export type DayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

/** 직원 근무 창. 설정 JSON에 둘 수 있다. 판정은 Availability Capability. */
export interface StaffWorkWindow {
  staffId: string;
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
}
