import React, { useState } from 'react';
import {
  BookOpen,
  PenTool,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  NOTEBOOK_STATUS_LABELS,
  signNoteAsAuthor,
  witnessNote,
  verifyNoteIntegrity,
  type ExperimentNote,
} from '../domain/electronicLabNotebookEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

const INITIAL_NOTES: ExperimentNote[] = [
  {
    id: 'eln-1',
    organizationId: 'org-lab',
    projectId: 'proj-cat',
    projectName: '친환경 수소 촉매 개발',
    experimentNumber: 'EXP-2026-0031',
    title: '백금 저감형 나노 입자 합성 및 TEM 격자 분석',
    objective: '백금 담지량을 기존 대비 50% 절감하면서 동등한 산소환원반응(ORR) 활성 유지 검증',
    protocol: '1. 탄소 담체에 백금 및 코발트 전구체 투입 후 열처리 (700℃, 2h)\n2. 산세척을 통한 합금 나노입자 안정화',
    results: '반파전위(E1/2) 0.91V 달성 (상용 Pt/C 대비 +25mV 우수), TEM 격자 간격 0.22nm 확인',
    conclusion: '목표 활성 초과 달성. 다음 주차 내구성(AST 30,000사이클) 평가 진행 예정.',
    attachments: [],
    status: 'witnessed',
    authorId: 'u-phd-kim',
    authorName: '김수석 (연구원)',
    authorSignedAt: '2026-10-18T09:30:00Z',
    witnessId: 'u-pi-park',
    witnessName: '박교수 (PI)',
    witnessSignedAt: '2026-10-18T16:00:00Z',
    witnessComment: 'TEM raw 이미지 및 전압전류 곡선 원본 데이터 교차 확인 완료.',
    integrityHash: 'eln_08d13a94829104',
    version: 1,
    revisionHistory: [],
    createdAt: '2026-10-18T08:00:00Z',
    updatedAt: '2026-10-18T16:00:00Z',
  },
  {
    id: 'eln-2',
    organizationId: 'org-lab',
    projectId: 'proj-battery',
    projectName: '전고체 배터리 고체전해질',
    experimentNumber: 'EXP-2026-0032',
    title: '황화물계 고체전해질 수분 안정성 평가',
    objective: '대기 노출 시 발생하는 H2S 가스 발생량 정량 분석 및 소수성 코팅 효과 검증',
    protocol: '1. 글로브박스 외 대기 챔버(상대습도 50%)에 샘플 노출\n2. 가스 크로마토그래피(GC)로 H2S 발생 곡선 측정',
    results: '미코팅 샘플 대비 H2S 발생량 82% 억제 확인.',
    conclusion: '코팅층 두께 최적화를 위한 2차 실험 계획 수립.',
    attachments: [],
    status: 'submitted',
    authorId: 'u-ms-lee',
    authorName: '이선임 (대학원생)',
    authorSignedAt: '2026-10-23T11:20:00Z',
    witnessId: null,
    witnessName: null,
    witnessSignedAt: null,
    integrityHash: 'eln_04a82f9194208a',
    version: 1,
    revisionHistory: [],
    createdAt: '2026-10-23T09:00:00Z',
    updatedAt: '2026-10-23T11:20:00Z',
  },
];

export const ElectronicLabNotebookManagementView: React.FC = () => {
  const [notes, setNotes] = useState<ExperimentNote[]>(INITIAL_NOTES);
  const [selectedNote, setSelectedNote] = useState<ExperimentNote | null>(INITIAL_NOTES[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // 작성 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newProtocol, setNewProtocol] = useState('');
  const [newResults, setNewResults] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // 목격자 서명 모달
  const [witnessOpen, setWitnessOpen] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  const [witnessComment, setWitnessComment] = useState('');

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.experimentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.projectName && n.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNote = () => {
    if (!newTitle.trim()) {
      showToast('실험 제목을 입력해주세요.', 'warning');
      return;
    }

    const expNum = `EXP-2026-${String(notes.length + 33).padStart(4, '0')}`;
    const created: ExperimentNote = {
      id: `eln-${Date.now()}`,
      organizationId: 'org-lab',
      projectName: newProject || '기초 연구',
      experimentNumber: expNum,
      title: newTitle,
      objective: newObjective || '실험 목적 미기재',
      protocol: newProtocol || '실험 과정 미기재',
      results: newResults || '',
      conclusion: '',
      attachments: [],
      status: 'draft',
      authorId: `u-${Date.now()}`,
      authorName: newAuthor || '연구원',
      authorSignedAt: null,
      witnessId: null,
      witnessName: null,
      witnessSignedAt: null,
      integrityHash: '',
      version: 1,
      revisionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes([created, ...notes]);
    setSelectedNote(created);
    setCreateOpen(false);
    setNewTitle('');
    setNewProject('');
    setNewObjective('');
    setNewProtocol('');
    setNewResults('');
    showToast(`${expNum} 연구노트 초안이 생성되었습니다.`, 'success');
  };

  const handleAuthorSign = () => {
    if (!selectedNote) return;
    const res = signNoteAsAuthor(selectedNote, selectedNote.authorId, selectedNote.authorName);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setNotes(notes.map((n) => (n.id === res.note.id ? res.note : n)));
    setSelectedNote(res.note);
    showToast('작성자 전자서명이 완료되어 목격 대기 상태로 전환되었습니다.', 'success');
  };

  const handleWitnessSign = () => {
    if (!selectedNote) return;
    if (!witnessName.trim()) {
      showToast('목격자 성명을 입력해주세요.', 'warning');
      return;
    }

    const res = witnessNote(
      selectedNote,
      `witness-${Date.now()}`,
      witnessName,
      witnessComment
    );
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    setNotes(notes.map((n) => (n.id === res.note.id ? res.note : n)));
    setSelectedNote(res.note);
    setWitnessOpen(false);
    setWitnessName('');
    setWitnessComment('');
    showToast('동료 목격자(Witness) 검증 서명이 완료되었습니다.', 'success');
  };

  const integrity = selectedNote ? verifyNoteIntegrity(selectedNote) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">전자 연구노트 (Electronic Lab Notebook)</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            연구윤리 규정 및 국가 R&D 준수: 작성자 서명, 제3자 목격자(Witness) 인증, 위변조 방지 해시 체이닝
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> 연구노트 작성
          </button>
        </div>
      </div>

      {/* 본문 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 노트 목록 */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="실험 번호, 제목, 과제명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredNotes.map((n) => {
              const isSelected = selectedNote?.id === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNote(n)}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-bold text-indigo-700">{n.experimentNumber}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        n.status === 'witnessed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : n.status === 'submitted'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {NOTEBOOK_STATUS_LABELS[n.status]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">{n.title}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{n.projectName || '일반 연구'}</span>
                    <span>{n.authorName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측: 노트 상세 본문 및 서명 카드 */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-6">
              {/* 상단 상태 바 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {selectedNote.experimentNumber}
                    </span>
                    <span className="text-xs text-slate-500">{selectedNote.projectName}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedNote.title}</h2>
                </div>

                {/* 무결성 뱃지 */}
                {selectedNote.integrityHash && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    {integrity?.isValid ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-rose-600" />
                    )}
                    <span className="font-mono text-[11px] text-slate-600">
                      {selectedNote.integrityHash.slice(0, 12)}…
                    </span>
                  </div>
                )}
              </div>

              {/* 본문 섹션: 실험 목적, 절차, 결과 */}
              <div className="space-y-4 text-sm text-slate-800">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    1. 실험 목적 및 가설 (Objective)
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap border border-slate-100">
                    {selectedNote.objective}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    2. 실험 과정 및 사용 시약 (Protocol)
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap border border-slate-100">
                    {selectedNote.protocol}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    3. 실험 결과 및 데이터 (Results & Discussion)
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap border border-slate-100">
                    {selectedNote.results || '실험 결과 작성 중'}
                  </div>
                </section>
              </div>

              {/* 전자서명 및 목격자 검증 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                {/* 작성자 서명 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <PenTool className="h-4 w-4 text-indigo-600" /> 작성자 전자서명
                    </span>
                    {selectedNote.authorSignedAt ? (
                      <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 서명 완료
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">미서명</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-800 font-medium">{selectedNote.authorName}</div>
                  {selectedNote.authorSignedAt ? (
                    <div className="text-[11px] text-slate-500 font-mono">
                      서명일시: {selectedNote.authorSignedAt.slice(0, 16).replace('T', ' ')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAuthorSign}
                      className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 mt-2"
                    >
                      작성자 전자서명 실행
                    </button>
                  )}
                </div>

                {/* 동료 목격자(Witness) 서명 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-purple-600" /> 목격자 (Witness) 검증
                    </span>
                    {selectedNote.witnessSignedAt ? (
                      <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 검증 완료
                      </span>
                    ) : (
                      <span className="text-amber-600 text-[11px]">검증 대기</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-800 font-medium">
                    {selectedNote.witnessName || '목격자 미지정'}
                  </div>
                  {selectedNote.witnessSignedAt ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500 font-mono">
                        검증일시: {selectedNote.witnessSignedAt.slice(0, 16).replace('T', ' ')}
                      </div>
                      {selectedNote.witnessComment && (
                        <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                          {selectedNote.witnessComment}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={selectedNote.status !== 'submitted'}
                      onClick={() => setWitnessOpen(true)}
                      className="w-full rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40 mt-2"
                    >
                      목격자 검증 서명 실행
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              연구노트를 선택해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 신규 연구노트 작성 모달 */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-slate-900">신규 연구노트 초안 작성</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="실험 제목 (예: 나노 촉매 전기화학적 활성 측정)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="연구과제명 (선택)"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="rounded-lg border border-slate-200 p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="작성자 성명"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <textarea
                placeholder="1. 실험 목적 및 가설"
                rows={2}
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <textarea
                placeholder="2. 실험 과정 및 사용 시약"
                rows={3}
                value={newProtocol}
                onChange={(e) => setNewProtocol(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <textarea
                placeholder="3. 실험 결과 및 데이터 (선택)"
                rows={2}
                value={newResults}
                onChange={(e) => setNewResults(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목격자 검증 서명 모달 */}
      {witnessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" /> 제3자 동료 목격자(Witness) 서명
            </h2>
            <p className="text-xs text-slate-500">
              연구윤리 규정에 따라 작성자 본인은 목격자가 될 수 없습니다. 동료 연구원 또는 지도교수로서 실험 과정과 원본 데이터를 검증하고 전자서명합니다.
            </p>
            <div className="space-y-2 pt-2">
              <input
                type="text"
                placeholder="목격자 성명 (예: 박교수, 이박사)"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <textarea
                placeholder="목격 검증 의견 (예: 측정 데이터 원본 파일 및 수치 검증 완료)"
                rows={2}
                value={witnessComment}
                onChange={(e) => setWitnessComment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWitnessOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWitnessSign}
                className="rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
              >
                목격 서명 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
