/**
 * 직원 법정 자격증 갱신 및 직무 스킬 매트릭스 도메인 엔진 (Pure Functions)
 */

export type CertExpiryStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface StaffCertification {
  id: string;
  cert_name: string; // 예: "CPR(응급처치) 수료증", "생활스포츠지도사 2급(보디빌딩)"
  issuing_body: string;
  issued_at: string;
  expires_at?: string; // 평생 자격인 경우 undefined
  status: CertExpiryStatus;
}

export interface StaffSkillItem {
  skill_name: string; // 예: "체형 교정", "입시 화성학", "유아 수영 지도"
  proficiency_level: 1 | 2 | 3 | 4 | 5; // 1(초급) ~ 5(전문 마스터)
}

export interface StaffSkillsMatrixRecord {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name: string;
  certifications: StaffCertification[];
  skills: StaffSkillItem[];
  updated_at: string;
}

export function checkCertificationExpiry(
  expiresAt: string | undefined,
  now: Date = new Date(),
  warningDays = 60
): { status: CertExpiryStatus; daysRemaining: number | null } {
  if (!expiresAt) {
    return { status: 'ACTIVE', daysRemaining: null };
  }

  const expDate = new Date(expiresAt);
  const diffMs = expDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'EXPIRED', daysRemaining };
  }
  if (daysRemaining <= warningDays) {
    return { status: 'EXPIRING_SOON', daysRemaining };
  }

  return { status: 'ACTIVE', daysRemaining };
}

export function isStaffQualifiedForClass(
  skills: StaffSkillItem[],
  requiredSkill: string,
  minLevel = 3
): boolean {
  const match = skills.find(
    (s) => s.skill_name.toLowerCase() === requiredSkill.toLowerCase()
  );
  if (!match) return false;
  return match.proficiency_level >= minLevel;
}
