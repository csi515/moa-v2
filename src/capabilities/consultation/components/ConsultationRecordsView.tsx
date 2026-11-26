import React, { useState, useMemo } from 'react';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useStaffScope } from '@/hooks';
import { getPrimaryGuardian, studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { schedulingStorage } from '@/capabilities/scheduling/infrastructure/schedulingStorage';
import { PageHeader, FilterBar, SearchField, StatusBadge, Button, FormModal } from '@/shared/components';
import type { Consultation, ConsultationType } from '../types';
import {
  MessageSquareText,
  Plus,
  Calendar,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const ConsultationRecordsView: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { showToast, openConfirmDialog, currentUser, setSelectedStudentId, setActiveTab } = useApp();
  const { scopeStudents, scopeConsultations } = useStaffScope();

  const allStudents = rosterStorage.getStudents();
  const students = useMemo(() => scopeStudents(allStudents), [allStudents, scopeStudents]);
  const consultations = useMemo(
    () => scopeConsultations(schedulingStorage.getConsultations()),
    [scopeConsultations]
  );

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    type: 'parent' as ConsultationType,
    date: todayIsoLocal(),
    content: '',
    result: '',
    nextDate: '',
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.studentId || !formData.content) {
      showToast('회원과 상담 내용을 입력해주세요.', 'error');
      return;
    }

    const st = students.find((s) => s.id === formData.studentId);
    if (!st) return;

    const primaryGuardian = getPrimaryGuardian(st.id);
    const parentName = primaryGuardian?.parentName || st.parentName || '학부모';

    const newConsultation: Consultation = {
      id: `cst_${Date.now()}`,
      studentId: st.id,
      studentName: st.name,
      parentName,
      type: formData.type,
      date: formData.date,
      content: formData.content,
      result: formData.result,
      nextDate: formData.nextDate || undefined,
      counselorId: currentUser?.id || 'admin',
      counselorName: currentUser?.name || '원장',
      createdAt: new Date().toISOString(),
    };

    schedulingStorage.saveConsultation(newConsultation);
    showToast('새 상담 일지가 등록되었습니다.', 'success');
    setIsModalOpen(false);
    setFormData({
      studentId: students[0]?.id || '',
      type: 'parent',
      date: todayIsoLocal(),
      content: '',
      result: '',
      nextDate: '',
    });
  };

  const handleDelete = (c: Consultation) => {
    openConfirmDialog({
      title: '상담 기록 삭제',
      message: `${c.studentName} 회원의 ${c.date} 상담 기록을 삭제하시겠습니까?`,
      confirmText: '삭제',
      isDestructive: true,
      onConfirm: () => {
        schedulingStorage.deleteConsultation(c.id);
        showToast('상담 기록이 삭제되었습니다.', 'info');
      },
    });
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-6'}>
      {!embedded && (
        <PageHeader
          density="compact"
          icon={<MessageSquareText className="w-5 h-5 text-slate-700" />}
          title="상담 관리 (CRM)"
          description="학부모 및 회원과의 상담 이력, 요청사항, 진도 피드백을 기록하고 관리합니다."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              새 상담 일지 작성
            </Button>
          }
        />
      )}

      {/* Filter and Search Bar */}
      <FilterBar>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: '전체' },
            { id: 'parent', label: '학부모 상담' },
            { id: 'student', label: '회원 상담' },
            { id: 'learning', label: '학습/진도' },
            { id: 'career', label: '진로/입시' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="회원명, 보호자명, 상담 내용 검색"
          />
        </div>
      </FilterBar>

      {/* Consultation Cards */}
      <div className="space-y-3">
        {filteredConsultations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs sm:text-sm">
            등록된 상담 기록이 없습니다.
          </div>
        ) : (
          filteredConsultations.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {c.studentName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedStudentId(c.studentId);
                          setActiveTab('students');
                        }}
                        className="font-bold text-slate-900 text-sm hover:underline cursor-pointer"
                      >
                        {c.studentName}
                      </button>
                      <span className="text-xs text-slate-500">({c.parentName} 학부모)</span>
                      <StatusBadge status="neutral" size="sm">
                        {c.type === 'parent'
                          ? '학부모 상담'
                          : c.type === 'learning'
                          ? '학습 진도'
                          : c.type === 'career'
                          ? '진로/입시'
                          : '회원 상담'}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {c.date} | 상담자: {c.counselorName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {c.nextDate && (
                    <StatusBadge status="info" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                      다음 상담: {c.nextDate}
                    </StatusBadge>
                  )}
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="상담 기록 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                <strong className="text-slate-600 block mb-1 text-xs">📝 상담 상세 내용</strong>
                {c.content}
              </div>

              {c.result && (
                <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200/80 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>결과 및 조치 계획:</strong> {c.result}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="새 상담 일지 작성"
          description="회원 및 학부모와의 상담 내용, 진도 피드백, 약속 사항을 기록합니다."
          onSubmit={handleSubmit}
          submitLabel="저장하기"
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">회원 선택</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-bold text-slate-800"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">상담 유형</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as ConsultationType })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-slate-800"
                >
                  <option value="parent">학부모 상담</option>
                  <option value="student">회원 상담</option>
                  <option value="career">진로/입시 상담</option>
                  <option value="learning">학습/진도 상담</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  다음 상담 예정일 (선택)
                </label>
                <input
                  type="date"
                  value={formData.nextDate}
                  onChange={(e) => setFormData({ ...formData, nextDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-slate-800"
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
                placeholder="보호자와의 대화 내용, 고객의 연습 고민, 성향 등을 기록하세요..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none resize-none leading-relaxed text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">상담 결과 및 후속 조치</label>
              <input
                type="text"
                placeholder="예: 콩쿠르 참가 확정 및 주 3회 연습실 자유 개방 조치"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-slate-800"
              />
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
};
