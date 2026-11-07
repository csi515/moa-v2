/**
 * 신규 상담(CRM Lead) 데이터를 원생 등록(Student Form) 초안으로 변환하는 순수 매퍼
 */

export interface ConsultationLeadData {
  consultationId?: string;
  studentName?: string;
  parentName?: string;
  phone?: string;
  coursePreference?: string;
  content?: string;
  notes?: string;
  preferredDays?: string[];
  preferredTime?: string;
}

export interface StudentDraftFromConsultation {
  id: '';
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  level: string;
  specialNotes: string;
  memo: string;
  consultationId?: string;
}

/**
 * 상담 데이터에서 적절한 피아노/학원 레벨 추론
 * 예: '바이엘', '체르니', '어드벤쳐', '소나티네', '유아', '성인' 등
 */
export function inferStudentLevelFromCourse(course?: string, notes?: string): string {
  const text = `${course || ''} ${notes || ''}`.toLowerCase();

  if (text.includes('체르니') || text.includes('소나티네') || text.includes('중급')) {
    return '중급';
  }
  if (text.includes('고급') || text.includes('전공') || text.includes('입시') || text.includes('콩쿠르')) {
    return '고급';
  }
  if (text.includes('어드벤쳐') || text.includes('바이엘') || text.includes('기초') || text.includes('초급')) {
    return '초급';
  }
  return '기초';
}

export function mapConsultationToStudentDraft(
  lead: ConsultationLeadData
): StudentDraftFromConsultation {
  const studentName = (lead.studentName || lead.parentName || '신규 원생').trim();
  const parentName = (lead.parentName || lead.studentName || '').trim();
  const phone = (lead.phone || '').trim();
  const level = inferStudentLevelFromCourse(lead.coursePreference, lead.notes || lead.content);

  const notesText = [
    lead.coursePreference ? `• 희망 과정: ${lead.coursePreference}` : '',
    lead.content || lead.notes ? `• 상담 내용: ${lead.content || lead.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: '',
    name: studentName,
    phone: '', // 학생 본인 번호는 기본 공란 (보호자 번호와 분리)
    parentName,
    parentPhone: phone,
    level,
    specialNotes: notesText ? `[상담 연동]\n${notesText}` : '',
    memo: '',
    consultationId: lead.consultationId,
  };
}
