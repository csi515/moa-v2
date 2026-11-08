/**
 * Academy Micro Guide Catalog
 *
 * 50~60대 원장님 및 신규 강사가 복잡한 매뉴얼을 찾지 않고도
 * 화면 안에서 1초 만에 의문을 해결할 수 있도록 지원하는 핵심 가이드 사전.
 */

export type AcademyMicroGuideKey =
  | 'temporary_move'
  | 'regular_move'
  | 'session_pass'
  | 'regular_tuition'
  | 'payment_day'
  | 'auto_invoice'
  | 'cash_receipt'
  | 'family_discount'
  | 'student_level'
  | 'assigned_teacher';

export interface MicroGuideItem {
  key: AcademyMicroGuideKey;
  title: string;
  description: string;
  tip?: string;
}

export const ACADEMY_MICRO_GUIDES: Record<AcademyMicroGuideKey, MicroGuideItem> = {
  temporary_move: {
    key: 'temporary_move',
    title: '임시 이동 (보강)',
    description: '이번 주 하루만 보강이나 사정으로 시간표를 이동하며, 다음 주 정규 시간표는 원래대로 유지됩니다.',
    tip: '💡 정규 배정에는 영향을 주지 않으므로 안심하고 이동하세요.',
  },
  regular_move: {
    key: 'regular_move',
    title: '정규 시간표 변경',
    description: '원생의 고정 수업 시간을 영구적으로 변경하여 다음 주부터 이 시간대로 계속 수업합니다.',
  },
  session_pass: {
    key: 'session_pass',
    title: '회차권 차감 방식',
    description: '월 정기 결제 없이 학생이 출석 체크할 때마다 보유 회차에서 1회씩 자동 차감됩니다.',
    tip: '💡 10회권, 20회권 등 쿠폰제 수강생에게 적합합니다.',
  },
  regular_tuition: {
    key: 'regular_tuition',
    title: '정규 수강료',
    description: '매월 지정된 납부일에 자동으로 청구 고지되는 기본 수업 원비 금액입니다.',
  },
  payment_day: {
    key: 'payment_day',
    title: '수강료 납부일',
    description: '매월 학부모님께 수강료 납부 안내가 발송되고 당월 청구서가 발행되는 기준일입니다.',
    tip: '💡 보통 매월 1일, 10일, 15일, 25일을 주로 사용합니다.',
  },
  auto_invoice: {
    key: 'auto_invoice',
    title: '첫 달 청구서 자동 생성',
    description: '원생 등록 완료 즉시 1개월분 고지서를 자동 생성하여 현장에서 바로 결제받을 수 있습니다.',
    tip: '💡 등록과 동시에 수납까지 원스톱으로 끝낼 때 추천합니다.',
  },
  cash_receipt: {
    key: 'cash_receipt',
    title: '현금영수증 발행 기록',
    description: '학원 현장 단말기나 국세청 홈택스에서 직접 발행한 경우 장부 기록용으로 체크합니다.',
    tip: '💡 시스템에서 국세청으로 자동 전송되는 것이 아니므로 학원에서 직접 발행 후 체크하세요.',
  },
  family_discount: {
    key: 'family_discount',
    title: '형제자매 결합 할인',
    description: '형제자매가 2명 이상 함께 재원할 때 당월 수강료에서 가족 감면액이 자동 반영됩니다.',
  },
  student_level: {
    key: 'student_level',
    title: '원생 진도 레벨',
    description: '바이엘, 체르니100, 체르니30, 반주반 등 현재 학습 중인 피아노 진도 단계입니다.',
  },
  assigned_teacher: {
    key: 'assigned_teacher',
    title: '담당 선생님 배정',
    description: '원생의 레슨과 출결, 진도를 전담하여 관리하는 지도 강사입니다.',
  },
};

/**
 * 키에 해당하는 마이크로 가이드 정보를 반환합니다.
 */
export function getMicroGuide(key: AcademyMicroGuideKey): MicroGuideItem {
  return ACADEMY_MICRO_GUIDES[key];
}
