/**
 * 증명서·수료증 채번 및 위변조 검증 대장 도메인 엔진 (Pure Functions)
 */

export type CertificateType =
  | 'ENROLLMENT_VERIFICATION' // 재원/재학증명서
  | 'COURSE_COMPLETION'       // 교육 수료증
  | 'TUITION_RECEIPT'         // 교육비 납입증명서
  | 'ATTENDANCE_CONFIRMATION';// 출석 확인서

export interface IssuedCertificateRecord {
  id: string;
  tenant_id: string;
  cert_number: string; // 예: "CERT-2026-0042"
  cert_type: CertificateType;
  recipient_name: string;
  recipient_birth?: string;
  course_name?: string;
  issued_amount?: number; // 납입증명서인 경우
  issued_date: string;
  verification_hash: string; // 위변조 검증용 단축 해시
  issuer_name: string;
}

export function formatCertificateNumber(prefix: string, year: number, seq: number): string {
  const paddedSeq = String(seq).padStart(4, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

export function generateVerificationHash(
  certNumber: string,
  recipientName: string,
  issuedDate: string
): string {
  // 경량 무의존성 검증 해시 (문자열 아스키 합산 및 16진수 변환)
  const seed = `${certNumber}|${recipientName}|${issuedDate}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
}

export function verifyCertificateIntegrity(
  certNumber: string,
  recipientName: string,
  issuedDate: string,
  hashToVerify: string
): boolean {
  const expected = generateVerificationHash(certNumber, recipientName, issuedDate);
  return expected === hashToVerify.trim().toUpperCase();
}

export function getCertificateTypeLabel(type: CertificateType): string {
  switch (type) {
    case 'ENROLLMENT_VERIFICATION':
      return '재원/수강 증명서';
    case 'COURSE_COMPLETION':
      return '교육 수료증';
    case 'TUITION_RECEIPT':
      return '교육비 납입증명서 (연말정산용)';
    case 'ATTENDANCE_CONFIRMATION':
      return '출석 확인서';
  }
}
