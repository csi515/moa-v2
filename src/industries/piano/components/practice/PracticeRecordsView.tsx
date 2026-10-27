import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import React, { useEffect, useState, useMemo } from 'react';
import { useList, useCreate, useDelete } from '@refinedev/core';
import { useApp } from '@/context/AppContext';
import { useStaffScope } from '@/hooks';
import { PageHeader, SummaryMetricCard, FilterBar, SearchField } from '@/shared/components';
import { PracticeRecord } from '@/types';
import { consumeOpenPendingPractice } from '@/core/customer/studentJoinInbox';
import { todayIsoLocal } from '@/shared/utils/localDate';
import {
  BookOpenCheck,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

export const PracticeRecordsView: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const { scopeStudents, scopeByStudentIds } = useStaffScope();

  // 1. Fetch Students via Refine
  const studentsList = useList<any>({
    resource: 'customers',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    queryOptions: {
      enabled: !!currentOrganization?.id,
    },
  });

  const allStudents = (studentsList as any).data?.data || (studentsList as any).data || (studentsList as any).query?.data?.data || [];
  const isLoadingStudents = (studentsList as any).isLoading ?? (studentsList as any).query?.isLoading;
  const students = useMemo(() => scopeStudents(allStudents), [allStudents, scopeStudents]);

  // 2. Fetch Practice Records via Refine (piano schema)
  const practiceListQuery = useList<any>({
    resource: 'practice_records',
    meta: { schema: 'piano' },
    queryOptions: {
      enabled: !!currentOrganization?.id,
    },
  });

  const rawRecords = (practiceListQuery as any).data?.data || (practiceListQuery as any).data || (practiceListQuery as any).query?.data?.data || [];
  const isLoadingPractice = (practiceListQuery as any).isLoading ?? (practiceListQuery as any).query?.isLoading;

  // Map DB records to UI PracticeRecord type
  const practiceList = useMemo(() => {
    const mapped = rawRecords.map((r: any) => {
      const student = allStudents.find((s: any) => s.id === r.customer_id);
      return {
        id: r.id,
        studentId: r.customer_id,
        studentName: student?.name || '알 수 없음',
        date: r.practice_date,
        minutes: r.minutes,
        songTitle: r.song_title,
        textbook: r.textbook || undefined,
        page: r.page || undefined,
        homework: r.homework || undefined,
        teacherEvaluation: r.teacher_evaluation || undefined,
        difficultyPart: r.difficulty_part || undefined,
        nextAssignment: r.next_assignment || undefined,
        source: r.metadata?.source,
        staffReviewed: r.metadata?.staffReviewed,
        staffReviewedAt: r.metadata?.staffReviewedAt,
        staffReviewNote: r.metadata?.staffReviewNote,
      } as PracticeRecord;
    });
    return scopeByStudentIds<PracticeRecord>(mapped, allStudents);
  }, [rawRecords, allStudents, scopeByStudentIds]);

  const [studentFilter, setStudentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'pending_parent'>('ALL');

  useEffect(() => {
    if (consumeOpenPendingPractice()) setSourceFilter('pending_parent');
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    date: todayIsoLocal(),
    minutes: 40,
    songTitle: '',
    difficultyPart: '',
    homework: '',
    teacherEvaluation: '⭐⭐⭐⭐'
  });

  // Ensure default studentId is set once students load
  useEffect(() => {
    if (students.length > 0 && !formData.studentId) {
      setFormData(prev => ({ ...prev, studentId: students[0].id }));
    }
  }, [students, formData.studentId]);

  const filteredPractice = useMemo(() => {
    return practiceList.filter((p) => {
      if (studentFilter !== 'ALL' && p.studentId !== studentFilter) return false;
      if (sourceFilter === 'pending_parent') {
        if (p.source !== 'parent' || p.staffReviewed) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.studentName.toLowerCase().includes(q) && !p.songTitle.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [practiceList, studentFilter, searchQuery, sourceFilter]);

  const pendingParentCount = practiceList.filter(
    (p) => p.source === 'parent' && !p.staffReviewed
  ).length;

  const totalMinutes = filteredPractice.reduce((sum, p) => sum + p.minutes, 0);

  const handleOpenCreate = () => {
    setFormData({
      studentId: students[0]?.id || '',
      date: todayIsoLocal(),
      minutes: 45,
      songTitle: '체르니 100번 30번 & 소나티네 Op.36 No.1',
      difficultyPart: '1악장 발전부 왼손 도약',
      homework: '왼손 독립 연습 하루 3번',
      teacherEvaluation: '⭐⭐⭐⭐⭐'
    });
    setIsModalOpen(true);
  };

  const { mutate: deletePractice } = useDelete();
  const handleDelete = (p: PracticeRecord) => {
    openConfirmDialog({
      title: '연습 기록 삭제',
      message: `${p.studentName}의 ${p.date} 연습 기록을 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        deletePractice(
          {
            resource: 'practice_records',
            id: p.id,
            meta: { schema: 'piano' }
          },
          {
            onSuccess: () => showToast('연습 기록이 삭제되었습니다.', 'info'),
            onError: () => showToast('삭제에 실패했습니다.', 'error')
          }
        );
      }
    });
  };

  const { mutate: createPractice, isLoading: isCreating } = useCreate() as any;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === formData.studentId);
    if (!st) {
      showToast('학생을 선택해주세요.', 'warning');
      return;
    }
    if (!formData.songTitle.trim()) {
      showToast('연습 곡명을 입력해주세요.', 'warning');
      return;
    }

    createPractice(
      {
        resource: 'practice_records',
        meta: { schema: 'piano' },
        values: {
          organization_id: currentOrganization?.id,
          customer_id: st.id,
          practice_date: formData.date,
          minutes: Number(formData.minutes) || 30,
          song_title: formData.songTitle.trim(),
          difficulty_part: formData.difficultyPart.trim(),
          homework: formData.homework.trim(),
          teacher_evaluation: formData.teacherEvaluation,
          metadata: {
            source: 'staff',
            staffReviewed: true
          }
        }
      },
      {
        onSuccess: () => {
          showToast('연습 기록이 등록되었습니다.', 'success');
          setIsModalOpen(false);
        },
        onError: () => showToast('등록에 실패했습니다.', 'error')
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="연습 기록"
        description="학생들의 그랜드피아노 연습실 사용 및 연습 곡목 기록을 관리합니다."
        actions={
          <button onClick={handleOpenCreate} className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>기록 추가</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryMetricCard
          label="누적 연습 시간"
          value={`${totalMinutes}분`}
        />
        <SummaryMetricCard 
          label="기록된 연습 건수" 
          value={`${filteredPractice.length}건`} 
          variant="indigo" 
        />
        <SummaryMetricCard
          label="학부모 미확인 건수"
          value={`${pendingParentCount}건`}
          variant="amber"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <FilterBar>
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체 학생</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체 기록</option>
            <option value="pending_parent">학부모 제출 (미확인)</option>
          </select>
          <div className="flex-1" />
          <SearchField
            placeholder="학생 이름, 곡명 검색..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </FilterBar>

        {(isLoadingStudents || isLoadingPractice) ? (
          <PageListSkeleton rows={4} message="데이터를 불러오는 중입니다..." />
        ) : filteredPractice.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            조회된 연습 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">일자/시간</th>
                  <th className="px-4 py-3 font-medium">학생</th>
                  <th className="px-4 py-3 font-medium">연습 곡명</th>
                  <th className="px-4 py-3 font-medium">어려운 부분/강조</th>
                  <th className="px-4 py-3 font-medium">과제</th>
                  <th className="px-4 py-3 font-medium text-center">교사 평가</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPractice.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{p.date}</div>
                      <div className="text-slate-500 text-xs">{p.minutes}분</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.studentName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.songTitle}</td>
                    <td className="px-4 py-3 text-slate-600">{p.difficultyPart || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.homework || '-'}</td>
                    <td className="px-4 py-3 text-center text-amber-500 text-xs">
                      {p.teacherEvaluation || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {p.source === 'parent' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          앱 제출
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          원내 기록
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">연습 기록 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="practice-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">학생</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">연습 일자</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">시간 (분)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.minutes}
                      onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">교사 평가</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-emoji"
                      value={formData.teacherEvaluation}
                      onChange={(e) => setFormData({ ...formData, teacherEvaluation: e.target.value })}
                    >
                      <option value="⭐⭐⭐⭐⭐">⭐⭐⭐⭐⭐ (최고)</option>
                      <option value="⭐⭐⭐⭐">⭐⭐⭐⭐ (우수)</option>
                      <option value="⭐⭐⭐">⭐⭐⭐ (보통)</option>
                      <option value="⭐⭐">⭐⭐ (노력요함)</option>
                      <option value="⭐">⭐ (기초다지기)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">연습 곡명</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={formData.songTitle}
                    onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">어려웠던 부분 / 강조 포인트</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    value={formData.difficultyPart}
                    onChange={(e) => setFormData({ ...formData, difficultyPart: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">다음 과제</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="submit"
                form="practice-form"
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
