/**
 * Parent Portal capability 전용 매니페스트 (placeholder).
 * IndustryPluginManifest에서 parent 관련 설정만 분리한다.
 */
export type ParentPluginManifest = {
  /** 픽업·하원 셔틀 주소 관리 UI */
  showPickupFields?: boolean;
  /** 고객 포털 하단 연습실 탭을 보일지 */
  showsPracticeRoomTab?: boolean;
  /** 고객 포털에서 이 사업장의 포인트를 조회할 수 있는지 */
  showsCustomerPoints?: boolean;
};
