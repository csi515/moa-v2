/**
 * Booking capability 전용 매니페스트 (placeholder).
 * IndustryPluginManifest에서 booking 관련 설정만 분리한다.
 */
export type BookingPluginManifest = {
  /** 예약·서비스 중심 업종 여부 */
  isAppointment?: boolean;
  /** 예약금 설정 UI 표시 여부 */
  supportsDeposit?: boolean;
};
