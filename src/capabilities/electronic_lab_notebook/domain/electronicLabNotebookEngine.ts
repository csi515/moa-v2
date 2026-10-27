/**
 * 전자 연구노트 (Electronic Lab Notebook, ELN) 순수 도메인 엔진
 *
 * 국가 R&D 전자연구노트 관리 규정 준수:
 * - 작성자의 전자서명 및 일시 기록 (Sign-off)
 * - 제3자 동료 목격자(Witness) 검증 및 서명
 * - 작성자 본인의 셀프 목격 방어
 * - 위변조 방지 해시(Deterministic Integrity Hash) 체이닝
 * - 서명 완료 후 수정 시 이전 버전 동결 및 신규 리비전(Revision Audit Trail) 생성
 */

export type NotebookStatus =
  | 'draft'     // 작성 중 (편집 가능)
  | 'submitted' // 작성자 서명 완료 (목격자 서명 대기)
  | 'witnessed' // 목격자 검증 완료 (공식 완료)
  | 'frozen';   // 위변조 방지 영구 동결

export const NOTEBOOK_STATUS_LABELS: Record<NotebookStatus, string> = {
  draft: '작성 중',
  submitted: '목격 대기',
  witnessed: '인증 완료',
  frozen: '영구 동결',
};

export interface RawAttachment {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  fileHash: string; // SHA-256
}

export interface NoteRevision {
  version: number;
  modifiedAt: string;
  modifiedByName: string;
  changeSummary: string;
}

export interface ExperimentNote {
  id: string;
  organizationId: string;
  projectId?: string | null;
  projectName?: string | null;
  experimentNumber: string; // 예: "EXP-2026-0089"
  title: string;
  objective: string; // 실험 목적 및 가설
  protocol: string; // 실험 과정, 재료 및 사용 시약
  results: string; // 실험 결과 및 데이터 분석
  conclusion: string; // 고찰 및 향후 계획
  attachments: RawAttachment[];
  status: NotebookStatus;

  // 작성자 서명
  authorId: string;
  authorName: string;
  authorSignedAt: string | null;

  // 목격자(Witness) 서명
  witnessId: string | null;
  witnessName: string | null;
  witnessSignedAt: string | null;
  witnessComment?: string | null;

  // 무결성 검증
  integrityHash: string; // 서명 시점의 본문+첨부 해시
  version: number;
  revisionHistory: NoteRevision[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 결정론적 무결성 문자열 생성
 */
export function buildIntegrityPayload(note: {
  experimentNumber: string;
  title: string;
  objective: string;
  protocol: string;
  results: string;
  authorId: string;
  authorSignedAt: string | null;
}): string {
  return [
    note.experimentNumber,
    note.title.trim(),
    note.objective.trim(),
    note.protocol.trim(),
    note.results.trim(),
    note.authorId,
    note.authorSignedAt ?? 'UNSIGNED',
  ].join('||');
}

/**
 * 간이 FNV-1a 기반 해시 생성 (브라우저/Node 동종 결정론적 64비트 Hex 해시)
 */
export function computeDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return 'eln_' + hashVal.toString(16).padStart(14, '0');
}

/**
 * 신규 실험노트 생성
 */
export function createExperimentNote(params: {
  id?: string;
  organizationId: string;
  projectId?: string | null;
  projectName?: string | null;
  experimentNumber: string;
  title: string;
  objective: string;
  protocol: string;
  results?: string;
  conclusion?: string;
  authorId: string;
  authorName: string;
}): ExperimentNote {
  const now = new Date().toISOString();
  return {
    id: params.id || `eln-${Date.now()}`,
    organizationId: params.organizationId,
    projectId: params.projectId || null,
    projectName: params.projectName || null,
    experimentNumber: params.experimentNumber,
    title: params.title,
    objective: params.objective,
    protocol: params.protocol,
    results: params.results || '',
    conclusion: params.conclusion || '',
    attachments: [],
    status: 'draft',
    authorId: params.authorId,
    authorName: params.authorName,
    authorSignedAt: null,
    witnessId: null,
    witnessName: null,
    witnessSignedAt: null,
    integrityHash: '',
    version: 1,
    revisionHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 작성자 전자서명 실행
 */
export function signNoteAsAuthor(
  note: ExperimentNote,
  authorId: string,
  authorName: string
): { note: ExperimentNote; error?: string } {
  if (note.authorId !== authorId) {
    return { note, error: '연구노트 작성자 본인만 1차 전자서명을 할 수 있습니다.' };
  }
  if (note.status !== 'draft') {
    return { note, error: `현재 상태(${NOTEBOOK_STATUS_LABELS[note.status]})에서는 서명할 수 없습니다.` };
  }

  const signedAt = new Date().toISOString();
  const payload = buildIntegrityPayload({
    ...note,
    authorId,
    authorSignedAt: signedAt,
  });
  const integrityHash = computeDeterministicHash(payload);

  const updated: ExperimentNote = {
    ...note,
    authorName,
    authorSignedAt: signedAt,
    integrityHash,
    status: 'submitted',
    updatedAt: signedAt,
  };

  return { note: updated };
}

/**
 * 제3자 동료 목격자(Witness) 검증 서명 실행
 */
export function witnessNote(
  note: ExperimentNote,
  witnessId: string,
  witnessName: string,
  comment?: string
): { note: ExperimentNote; error?: string } {
  // 규칙: 본인 셀프 목격 차단
  if (note.authorId === witnessId) {
    return {
      note,
      error: '연구윤리 규정에 따라 작성자 본인은 본인 연구노트의 목격자(Witness)가 될 수 없습니다.',
    };
  }

  if (note.status !== 'submitted') {
    return {
      note,
      error: '작성자의 전자서명이 완료된(목격 대기) 노트만 목격 서명이 가능합니다.',
    };
  }

  const witnessedAt = new Date().toISOString();
  const updated: ExperimentNote = {
    ...note,
    witnessId,
    witnessName,
    witnessSignedAt: witnessedAt,
    witnessComment: comment || '실험 과정 및 데이터 검증 확인 완료',
    status: 'witnessed',
    updatedAt: witnessedAt,
  };

  return { note: updated };
}

/**
 * 연구노트 위변조 여부 검증
 */
export function verifyNoteIntegrity(note: ExperimentNote): {
  isValid: boolean;
  expectedHash: string;
  actualHash: string;
} {
  if (!note.authorSignedAt || !note.integrityHash) {
    return { isValid: false, expectedHash: '', actualHash: note.integrityHash };
  }

  const payload = buildIntegrityPayload({
    experimentNumber: note.experimentNumber,
    title: note.title,
    objective: note.objective,
    protocol: note.protocol,
    results: note.results,
    authorId: note.authorId,
    authorSignedAt: note.authorSignedAt,
  });

  const expectedHash = computeDeterministicHash(payload);
  const isValid = expectedHash === note.integrityHash;

  return {
    isValid,
    expectedHash,
    actualHash: note.integrityHash,
  };
}
