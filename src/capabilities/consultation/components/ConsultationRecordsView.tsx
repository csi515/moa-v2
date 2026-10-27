import React, { useState, useMemo } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useStaffScope } from '@/hooks';
import { getPrimaryGuardian, studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { StorageService } from '@/services/storage';
import { PageHeader, FilterBar, SearchField } from '@/shared/components';
import type { Consultation, ConsultationType } from '../types';
import {
  MessageSquareText,
  Plus,
  Calendar,
  User,
  Clock,
  Trash2,
  X,
  Save,
  CheckCircle2
} from 'lucide-react';

export const ConsultationRecordsView: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { showToast, openConfirmDialog, currentUser, setSelectedStudentId, setActiveTab } = useApp();
  const { scopeStudents, scopeConsultations } = useStaffScope();

  const allStudents = StorageService.getStudents();
  const students = useMemo(() => scopeStudents(allStudents), [allStudents, scopeStudents]);
  const consultations = useMemo(
    () => scopeConsultations(StorageService.getConsultations()),
    [scopeConsultations]
  );

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    type: 'parent' as ConsultationType,
    date: new Date().toISOString().slice(0, 10),
    content: '',
    result: '',
    nextDate: ''
  });

  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !c.studentName.toLowerCase().includes(q) &&
          !studentMatchesGuardianQuery(c.studentId, searchQuery) &&
          !c.content.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [consultations, typeFilter, searchQuery]);

  const handleOpenCreate = () => {
    setFormData({
      studentId: students[0]?.id || '',
      type: 'parent',
      date: new Date().toISOString().slice(0, 10),
      content: '체르니 30번 진입 시 연습량 증가 및 콩쿠르 참가 의향 상담',
      result: '10월 전국 피아노 콩쿠르 출전 목표로 자유곡 선정하기로 합의',
      nextDate: '2025-09-15'
    });
    setIsModalOpen(true);
  };

  const handleDelete = (c: Consultation) => {
    openConfirmDialog({
      title: '상담 일지 삭제',
      message: `${c.studentName}의 ${c.date} 상담 기록을 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        StorageService.deleteConsultation(c.id);
        showToast('상담 기록이 삭제되었습니다.', 'info');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === formData.studentId);
    if (!st) {
      showToast('원생을 선택해주세요.', 'warning');
      return;
    }
    if (!formData.content.trim()) {
      showToast('상담 내용을 입력해주세요.', 'warning');
      return;
    }

    StorageService.saveConsultation({
      studentId: st.id,
      studentName: st.name,
      parentName: getPrimaryGuardian(st.id)?.parentName || st.parentName || '학부모',
      date: formData.date,
      type: formData.type,
      content: formData.content.trim(),
      result: formData.result.trim(),
      nextDate: formData.nextDate || undefined,
      counselorId: StorageService.getTeachers()[0]?.id || '',
      counselorName: currentUser.name
    });

    showToast('상담 일지가 등록되었습니다.', 'success');
    setIsModalOpen(false);
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {!embedded ? (
        <PageHeader
          icon={<MessageSquareText className="w-6 h-6" />}
          title="상담 이력 관리"
          description="학부모 정기 상담, 진로/입시, 학습 진도 상담 이력 추적"
          actions={
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              상담 일지 작성
            </button>
          }
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            상담 일지 작성
          </button>
        </div>
      )}

      <FilterBar>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
        >
          <option value="ALL">전체 상담 유형</option>
          <option value="parent">학부모 상담</option>
          <option value="student">원생 상담</option>
          <option value="career">진로/입시 상담</option>
          <option value="learning">학습/진도 상담</option>
        </select>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="원생, 학부모, 내용 검색..."
          className="flex-1 min-w-[200px]"
        />
        <span className="text-xs text-slate-500 font-medium shrink-0">
          총 <strong className="text-indigo-600">{filteredConsultations.length}건</strong>
        </span>
      </FilterBar>

      {/* Consultation Cards */}
      <div className="space-y-4">
        {filteredConsultations.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                  {c.studentName.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedStudentId(c.studentId);
                        setActiveTab('students');
                      }}
                      className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                    >
                      {c.studentName}
                    </button>
                    <span className="text-xs text-slate-500">({c.parentName} 학부모)</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                      {c.type === 'parent' ? '학부모 상담' : c.type === 'learning' ? '학습 진도' : c.type === 'career' ? '진로/입시' : '원생 상담'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {c.date} | 상담자: {c.counselorName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {c.nextDate && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    다음 상담: {c.nextDate}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(c)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <strong className="text-slate-700 block mb-1 text-xs">📝 상담 상세 내용</strong>
              {c.content}
            </div>

            {c.result && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>결과 및 조치 계획:</strong> {c.result}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">새 상담 일지 작성</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">원생 선택</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.parentName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">상담 일자</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">상담 유형</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="parent">학부모 상담</option>
                    <option value="student">원생 상담</option>
                    <option value="career">진로/입시 상담</option>
                    <option value="learning">학습/진도 상담</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">다음 상담 예정일 (선택)</label>
                  <input
                    type="date"
                    value={formData.nextDate}
                    onChange={(e) => setFormData({ ...formData, nextDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  상담 내용 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="학부모와의 대화 내용, 원생의 피아노 연습 고민, 성향 등을 기록하세요..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">상담 결과 및 후속 조치</label>
                <input
                  type="text"
                  placeholder="예: 콩쿠르 참가 확정 및 주 3회 연습실 자유 개방 조치"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
