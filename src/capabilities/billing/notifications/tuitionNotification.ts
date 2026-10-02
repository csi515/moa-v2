import { publishParentAlert } from '@/core/parent/services/parentAlertInfrastructure';

export interface NotifyParentTuitionUnpaidParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  yearMonth: string;
  amount: number;
  dueDate: string;
}

/** 미납 청구 시 학부모 포털 알림 + 앱 푸시 */
export function notifyParentTuitionUnpaid(params: NotifyParentTuitionUnpaidParams): void {
  publishParentAlert({
    type: 'tuition_unpaid',
    title: '수강료 미납 안내',
    message: `${params.studentName} 원생 ${params.yearMonth} 수강료 ₩${params.amount.toLocaleString()}원이 미납입니다. (납기 ${params.dueDate})`,
    student: {
      id: params.studentId,
      name: params.studentName,
      parentPhone: params.parentPhone,
    },
    scheduledDate: params.dueDate,
    portalTab: 'tuition',
  });
}
