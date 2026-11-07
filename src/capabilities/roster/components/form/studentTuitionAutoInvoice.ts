export interface AutoInvoiceDecisionParams {
  isEdit: boolean;
  autoCreateInvoice: boolean;
  tuitionFee: number;
}

/**
 * 신규 원생 등록 시 첫 달 수강료 청구서를 자동으로 생성해야 하는지 판별합니다.
 */
export function shouldAutoCreateTuitionInvoice(params: AutoInvoiceDecisionParams): boolean {
  if (params.isEdit) return false;
  if (!params.autoCreateInvoice) return false;
  return typeof params.tuitionFee === 'number' && params.tuitionFee > 0;
}

/**
 * 수강료 청구 안내 문구를 생성합니다.
 */
export function formatAutoInvoiceNotice(studentName: string, tuitionFee: number): string {
  return `${studentName} 학생의 첫 달 수강료(${tuitionFee.toLocaleString()}원) 청구서가 발행되었습니다.`;
}
