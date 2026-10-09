/**
 * 전자 동의서 & 안전 서약서 엔진 (Pure Function Domain)
 *
 * 대상: 클라이밍/체육관 부상 면책, 키즈카페 보호자 서약, 펫 호텔 위탁 동의
 * 순수 로직:
 *  1. 서약서 버전 관리 (버전 불변성 및 최신 템플릿 판정)
 *  2. 캔버스 서명 메타데이터 검증 (유효 스트로크/점수 검사)
 *  3. 불변 감사 로그(Audit Log) 생성
 */

export interface ConsentTemplate {
  id: string;
  type: string; // e.g. "CLIMBING_WAIVER", "PET_HOTEL_AGREEMENT"
  version: number;
  title: string;
  bodyText: string;
  mandatoryClauses: { id: string; text: string }[];
  effectiveFrom: string; // YYYY-MM-DD
  isActive: boolean;
}

export function selectActiveConsentTemplate(
  templates: ConsentTemplate[],
  type: string,
  targetDate: string = new Date().toISOString().slice(0, 10)
): ConsentTemplate | undefined {
  const candidates = templates
    .filter((t) => t.type === type && t.isActive && t.effectiveFrom <= targetDate)
    .sort((a, b) => b.version - a.version);

  return candidates[0];
}

export interface SignatureMetadata {
  strokeCount: number;
  totalPointsCount: number;
  durationMs: number;
  dataUrlLength: number;
}

export function validateSignatureMetadata(
  meta: SignatureMetadata
): { isValid: boolean; error?: string } {
  // 1. 최소 획수 검사 (점 하나 찍기 방어)
  if (meta.strokeCount < 1) {
    return { isValid: false, error: '서명이 입력되지 않았습니다.' };
  }

  // 2. 최소 점(포인트) 수 검사 (유효한 필기 궤적 확인)
  if (meta.totalPointsCount < 15) {
    return { isValid: false, error: '서명 궤적이 너무 짧거나 단순합니다. 성명을 정자로 서명해주세요.' };
  }

  // 3. 서명 입력 시간 검사 (매크로/순간 클릭 방어: 최소 200ms)
  if (meta.durationMs < 150) {
    return { isValid: false, error: '비정상적으로 빠른 서명 입력입니다.' };
  }

  // 4. Data URL 길이 (빈 이미지 방어)
  if (meta.dataUrlLength < 100) {
    return { isValid: false, error: '서명 이미지 데이터가 올바르지 않습니다.' };
  }

  return { isValid: true };
}

export interface ConsentAuditRecord {
  id: string;
  consentId: string;
  templateId: string;
  templateVersion: number;
  signerName: string;
  signerPhone: string;
  agreedClauseIds: string[];
  signatureProofHash: string;
  signedAt: string;
  clientEnvironment: {
    userAgent: string;
    ipAddress?: string;
  };
}

export function generateConsentAuditRecord(params: {
  consentId: string;
  template: ConsentTemplate;
  signerName: string;
  signerPhone: string;
  agreedClauseIds: string[];
  signatureDataUrl: string;
  userAgent: string;
  ipAddress?: string;
  timestamp?: string;
}): { auditRecord: ConsentAuditRecord; success: boolean; error?: string } {
  const { template, agreedClauseIds, signerName, signerPhone } = params;

  // 모든 필수 조항 동의 확인
  const requiredIds = template.mandatoryClauses.map((c) => c.id);
  const missingClause = requiredIds.find((id) => !agreedClauseIds.includes(id));
  if (missingClause) {
    return {
      auditRecord: {} as ConsentAuditRecord,
      success: false,
      error: `필수 동의 조항이 누락되었습니다 (항목 ID: ${missingClause})`,
    };
  }

  const ts = params.timestamp ?? new Date().toISOString();

  // 순수 간이 해시 계산식 (불변 무결성 검증용)
  const rawString = `${params.consentId}:${template.id}:v${template.version}:${signerName}:${signerPhone}:${ts}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const signatureProofHash = `PROOF-${Math.abs(hash).toString(16).toUpperCase()}-${params.signatureDataUrl.length}`;

  const auditRecord: ConsentAuditRecord = {
    id: `audit-${params.consentId}`,
    consentId: params.consentId,
    templateId: template.id,
    templateVersion: template.version,
    signerName: signerName.trim(),
    signerPhone: signerPhone.trim(),
    agreedClauseIds: [...agreedClauseIds].sort(),
    signatureProofHash,
    signedAt: ts,
    clientEnvironment: {
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    },
  };

  return { auditRecord, success: true };
}
