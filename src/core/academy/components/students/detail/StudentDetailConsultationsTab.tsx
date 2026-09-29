import React from 'react';
import { Consultation } from '@/types';
import { Plus } from 'lucide-react';
import { useModuleLabels } from '@/core/labels';

interface StudentDetailConsultationsTabProps {
  allConsultations: Consultation[];
  isAddCstOpen: boolean;
  setIsAddCstOpen: (open: boolean) => void;
  newCstType: Consultation['type'];
  setNewCstType: (type: Consultation['type']) => void;
  newCstContent: string;
  setNewCstContent: (content: string) => void;
  newCstResult: string;
  setNewCstResult: (result: string) => void;
  newCstNextDate: string;
  setNewCstNextDate: (date: string) => void;
  onSaveConsultation: (e: React.FormEvent) => void;
}

export const StudentDetailConsultationsTab: React.FC<StudentDetailConsultationsTabProps> = ({
  allConsultations,
  isAddCstOpen,
  setIsAddCstOpen,
  newCstType,
  setNewCstType,
  newCstContent,
  setNewCstContent,
  newCstResult,
  setNewCstResult,
  newCstNextDate,
  setNewCstNextDate,
  onSaveConsultation,
}) => {
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;

  return (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-900">상담 기록</h4>
        <p className="text-xs text-slate-500">{contactLabel} 및 {customerLabel}과의 상담 이력</p>
      </div>
      <button
        onClick={() => setIsAddCstOpen(true)}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> 상담 기록 작성
      </button>
    </div>

    {isAddCstOpen && (
      <form onSubmit={onSaveConsultation} className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
        <h5 className="text-xs font-bold text-purple-900">새 상담 작성</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">상담 유형</label>
            <select
              value={newCstType}
              onChange={(e) => setNewCstType(e.target.value as Consultation['type'])}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            >
              <option value="parent">{contactLabel} 상담</option>
              <option value="student">{customerLabel} 상담</option>
              <option value="career">진로/입시 상담</option>
              <option value="learning">학습/진도 상담</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">다음 상담 예정일</label>
            <input
              type="date"
              value={newCstNextDate}
              onChange={(e) => setNewCstNextDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">상담 내용</label>
            <textarea
              rows={2}
              placeholder="상담 내용을 자세히 기록하세요..."
              value={newCstContent}
              onChange={(e) => setNewCstContent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">상담 결과 및 후속 조치</label>
            <input
              type="text"
              placeholder="합의된 내용 또는 후속 조치..."
              value={newCstResult}
              onChange={(e) => setNewCstResult(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsAddCstOpen(false)}
            className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-1 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            저장
          </button>
        </div>
      </form>
    )}

    {allConsultations.length === 0 ? (
      <p className="text-xs text-slate-500 p-8 text-center bg-slate-50 rounded-2xl">등록된 상담 기록이 없습니다.</p>
    ) : (
      <div className="space-y-3">
        {allConsultations.map((cst) => (
          <div key={cst.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{cst.date}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                  {cst.type === 'parent' ? `${contactLabel} 상담` : cst.type === 'student' ? `${customerLabel} 상담` : cst.type === 'learning' ? '학습 진도' : cst.type === 'career' ? '진로/입시' : '일반'}
                </span>
              </div>
              <span className="text-slate-400 font-medium">상담자: {cst.counselorName}</span>
            </div>
            <p className="text-slate-800 leading-relaxed">{cst.content}</p>
            {cst.result && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 text-slate-700">
                <strong>결과/조치:</strong> {cst.result}
              </div>
            )}
            {cst.nextDate && (
              <p className="text-[11px] text-indigo-600 font-medium">
                📅 다음 상담 예정: {cst.nextDate}
              </p>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
  );
};
