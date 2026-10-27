import React, { useState } from 'react';
import {
  ClipboardCheck,
  MessageSquareText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  User,
  Shield,
  FileSignature,
} from 'lucide-react';
import {
  calculateChecklistProgress,
  canConfirmHandover,
  summarizeFeedbacks,
  countUnresolvedIncidents,
  type HandoverNote,
  type FeedbackItem,
  type IncidentLog,
} from '../domain/handoverEngine';

export const FeedbacksAndHandoverView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'handover' | 'feedbacks' | 'incidents'>('handover');

  // 데모/초기 인수인계 데이터
  const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([
    {
      id: 'demo-note-1',
      organization_id: 'current-org',
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: 'morning',
      writer_staff_id: 'staff-morning',
      content: '오전 10시 정수기 점검 기사님 방문 완료. 2번 룸 피아노 조율 예약 있음.',
      checklist_items: [
        { id: '1', label: '오픈 환기 및 매장 조명 점등', checked: true },
        { id: '2', label: '금고 시재 확인 및 카드 단말기 테스트', checked: true },
        { id: '3', label: '화장실 핸드타월 및 소모품 보충', checked: true },
      ],
      confirmed_by_next_shift_staff_id: null,
      confirmed_at: null,
    },
  ]);

  // 데모 건의함 데이터
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([
    {
      id: 'demo-fb-1',
      organization_id: 'current-org',
      author_type: 'customer',
      title: '대기실 의자가 조금 부족해요',
      content: '주말 오후에 학부모 대기 공간이 붐빕니다.',
      status: 'open',
      is_internal_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-fb-2',
      organization_id: 'current-org',
      author_type: 'staff',
      title: '출입문 도어락 배터리 교체 필요',
      content: '도어락에서 경고음이 간헐적으로 발생합니다.',
      status: 'in_progress',
      is_internal_only: true,
      created_at: new Date().toISOString(),
    },
  ]);

  // 데모 안전사고 일지 데이터
  const [incidents, setIncidents] = useState<IncidentLog[]>([
    {
      id: 'demo-inc-1',
      organization_id: 'current-org',
      occurred_at: new Date().toISOString(),
      severity: 'minor',
      title: '계단 발 헛디딤 찰과상',
      description: '하원 중 원생이 계단에서 넘어져 무릎 찰과상 발생. 보건실 소독 및 밴드 부착 조치 완료.',
      actions_taken: '환부 소독 및 학부모 안심 전화 안내',
      preventive_measures: '계단 미끄럼 방지 테이프 점검',
      is_resolved: true,
    },
  ]);

  const feedbackSummary = summarizeFeedbacks(feedbacks);
  const incidentSummary = countUnresolvedIncidents(incidents);

  const handleToggleChecklist = (noteId: string, itemId: string) => {
    setHandoverNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        return {
          ...note,
          checklist_items: note.checklist_items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      })
    );
  };

  const handleConfirmHandover = (noteId: string) => {
    setHandoverNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        const check = canConfirmHandover(note, 'staff-afternoon');
        if (!check.canConfirm) {
          alert(check.reason);
          return note;
        }
        return {
          ...note,
          confirmed_by_next_shift_staff_id: 'staff-afternoon',
          confirmed_at: new Date().toISOString(),
        };
      })
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 & 탭 네비게이션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">현장 소통 및 인수인계</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            근무 교대 인수인계장, 고객 VOC/직원 건의함 및 안전사고 감사 일지를 한곳에서 관리합니다.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'handover'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            교대 인수인계장
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedbacks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'feedbacks'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>VOC & 건의함</span>
            {feedbackSummary.openCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {feedbackSummary.openCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'incidents'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>안전사고 일지</span>
            {incidentSummary.totalUnresolved > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {incidentSummary.totalUnresolved}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: 교대 인수인계장
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'handover' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">오늘의 교대 인수인계</h2>
            <button
              type="button"
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 인수인계 작성</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {handoverNotes.map((note) => {
              const progress = calculateChecklistProgress(note.checklist_items);
              const isConfirmed = Boolean(note.confirmed_at);

              return (
                <div
                  key={note.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 uppercase">
                          {note.shift_type} 근무
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {note.shift_date}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-2">{note.content}</p>
                    </div>

                    <div className="text-right">
                      {isConfirmed ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          다음 근무자 서약 확인됨
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          확인 대기 중
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 체크리스트 */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">루틴 인수인계 체크리스트</span>
                      <span className="text-slate-400 font-medium">
                        {progress.completed} / {progress.total} ({progress.percentage}%)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {note.checklist_items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleToggleChecklist(note.id, item.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span
                            className={
                              item.checked ? 'line-through text-slate-400' : 'text-slate-700'
                            }
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 하단 확인 버튼 */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      작성자 ID: {note.writer_staff_id}
                    </span>
                    {!isConfirmed && (
                      <button
                        type="button"
                        onClick={() => handleConfirmHandover(note.id)}
                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-slate-800"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>다음 근무자 확인 서약</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: VOC & 직원 건의함
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">미처리 VOC</span>
              <p className="text-xl font-bold text-rose-600 mt-1">{feedbackSummary.openCount}건</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">처리 진행 중</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {feedbackSummary.inProgressCount}건
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">개선 조치 완료</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {feedbackSummary.resolvedCount}건
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fb.author_type === 'customer'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {fb.author_type === 'customer' ? '고객 VOC' : '직원 제안'}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{fb.title}</span>
                  </div>
                  <p className="text-xs text-slate-600">{fb.content}</p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    fb.status === 'open'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : fb.status === 'in_progress'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {fb.status === 'open' ? '접수' : fb.status === 'in_progress' ? '처리중' : '완료'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: 현장 안전사고 일지
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">현장 특이사항 및 안전사고 일지</h2>
            <button
              type="button"
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-rose-700"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>특이사항 기록</span>
            </button>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : inc.severity === 'moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{inc.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">{inc.occurred_at.split('T')[0]}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{inc.description}</p>

                {inc.actions_taken && (
                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
                    <span className="font-bold text-slate-800">조치 사항: </span>
                    {inc.actions_taken}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
