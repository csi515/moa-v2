import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { UserCheck, Plus, CheckSquare, Award, Clock, Users } from 'lucide-react';
import {
  calculateOnboardingProgress,
  evaluateProbationPass,
  validateOnboardingInput,
  type StaffOnboardingRecord,
  type OnboardingTask,
} from '../domain/onboardingEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

const DEFAULT_TASKS: OnboardingTask[] = [
  { id: 'task-1', title: '사규 및 근로계약서 확인/서명', category: 'ORIENTATION', is_completed: false },
  { id: 'task-2', title: '원내 시스템 및 POS 권한 등록/교육', category: 'SYSTEM_TRAINING', is_completed: false },
  { id: 'task-3', title: '시강 및 데모 레슨 평가', category: 'DEMO_TEACHING', is_completed: false },
  { id: 'task-4', title: '수습 3개월 다면 역량 평가', category: 'PROBATION_REVIEW', is_completed: false },
];

export const OnboardingListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [roleTitle, setRoleTitle] = useState('전임 강사');
  const [mentorName, setMentorName] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);

  const { query } = useList<StaffOnboardingRecord>({
    resource: 'staff_onboardings',
    sorters: [{ field: 'hire_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as StaffOnboardingRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateOnboardingInput(staffName, roleTitle, mentorName);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    const end = new Date(hireDate);
    end.setMonth(end.getMonth() + 3);

    createRecord(
      {
        resource: 'staff_onboardings',
        values: {
          staff_name: staffName.trim(),
          role_title: roleTitle.trim(),
          mentor_name: mentorName.trim(),
          hire_date: hireDate,
          probation_end_date: end.toISOString().split('T')[0],
          tasks: DEFAULT_TASKS,
          probation_result: 'IN_PROGRESS',
        },
      },
      {
        onSuccess: () => {
          showToast(`[${staffName}] 온보딩 트랙이 시작되었습니다.`, 'success');
          setIsModalOpen(false);
          setStaffName('');
          setMentorName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '온보딩 등록 실패', 'error');
        },
      }
    );
  };

  const handleToggleTask = (record: StaffOnboardingRecord, taskId: string) => {
    const nextTasks = record.tasks.map((t) =>
      t.id === taskId ? { ...t, is_completed: !t.is_completed, completed_at: new Date().toISOString() } : t
    );
    const prog = calculateOnboardingProgress(nextTasks);

    updateRecord(
      {
        resource: 'staff_onboardings',
        id: record.id,
        values: {
          tasks: nextTasks,
          probation_result: prog.percent === 100 ? 'PASSED' : 'IN_PROGRESS',
        },
      },
      {
        onSuccess: () => {
          showToast('과제 상태가 업데이트되었습니다.', 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <UserCheck className="w-7 h-7 text-sky-600" />
            신규 강사·직원 입문 교육 및 수습 평가 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            신규 입사자 단계별 온보딩 체크리스트, 전담 멘토 지정 및 3개월 수습 통과를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 입사자 온보딩 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-slate-400">불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-400">진행 중인 온보딩 직원이 없습니다.</div>
        ) : (
          records.map((r) => {
            const prog = calculateOnboardingProgress(r.tasks);
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{r.staff_name}</h3>
                    <p className="text-xs text-slate-500">
                      {r.role_title} · 멘토: <strong className="text-sky-600">{r.mentor_name}</strong>
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      r.probation_result === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {r.probation_result === 'PASSED' ? '수습 통과' : '온보딩 진행중'}
                  </span>
                </div>

                {/* 프로그레스 바 */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>온보딩 진척도</span>
                    <span className="font-bold text-sky-600">{prog.percent}% ({prog.completed}/{prog.total})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-600 h-2 rounded-full transition-all"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                </div>

                {/* 태스크 체크리스트 */}
                <div className="space-y-2 border-t pt-3">
                  {r.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(r, task.id)}
                      className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={task.is_completed}
                        onChange={() => {}}
                        className="rounded text-sky-600 cursor-pointer"
                      />
                      <span className={task.is_completed ? 'line-through text-slate-400 font-normal' : 'font-medium text-slate-700 dark:text-slate-200'}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-sky-600">
              <UserCheck className="w-5 h-5" />
              신규 직원 온보딩 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">입사자 성명 *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="예: 김신입"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">직무/직책 *</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="예: 피아노 전임강사"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">전담 멘토/사수 성명 *</label>
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="예: 박팀장"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">입사일자 *</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  온보딩 시작
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
