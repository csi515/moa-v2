import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStaffScope } from '@/hooks';
import { StorageService } from '@/services/storage';
import { PageHeader, FilterBar } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import type { AchievementType, AssignmentStatus, CurriculumProgressStatus } from '@/types/education';
import { todayIsoLocal, yearMonthLocal } from '@/shared/utils/localDate';
import {
  BookOpen,
  BookOpenCheck,
  Award,
  FileText,
  Plus,
  CheckCircle2,
  Send,
} from 'lucide-react';

type EduSection = 'curriculum' | 'assignments' | 'achievements' | 'reports';

export const CurriculumManagementView: React.FC = () => (
  <EducationSectionView section="curriculum" />
);

export const AssignmentsManagementView: React.FC = () => (
  <EducationSectionView section="assignments" />
);

export const AchievementsManagementView: React.FC = () => (
  <EducationSectionView section="achievements" />
);

export const ReportsManagementView: React.FC = () => (
  <EducationSectionView section="reports" />
);

function EducationSectionView({ section }: { section: EduSection }) {
  const { showToast, triggerRefresh, currentUser } = useApp();
  const { isAdmin } = usePermissions();
  const { scopeStudents } = useStaffScope();
  const students = scopeStudents(StorageService.getStudents().filter((s) => s.status === 'active'));

  React.useEffect(() => {
    StorageService.seedDefaultCurriculum();
  }, []);

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');

  const titles: Record<EduSection, string> = {
    curriculum: '커리큘럼·진도 관리',
    assignments: '주간 과제 관리',
    achievements: '시험·콩쿠르·등급',
    reports: '학습 리포트',
  };

  const sectionIcons: Record<EduSection, React.ReactNode> = {
    curriculum: <BookOpen className="w-6 h-6" />,
    assignments: <BookOpenCheck className="w-6 h-6" />,
    achievements: <Award className="w-6 h-6" />,
    reports: <FileText className="w-6 h-6" />,
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={sectionIcons[section]}
        title={titles[section]}
        description="학부모 포털에 연동되는 교육 품질 데이터를 관리합니다."
      />

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">담당 학생이 없습니다</p>
          <p className="text-xs text-slate-500 mt-1">원장이 학생의 담당 선생님을 지정하면 여기에 표시됩니다.</p>
        </div>
      ) : (
      <FilterBar>
      <select
        value={selectedStudentId}
        onChange={(e) => setSelectedStudentId(e.target.value)}
        className="px-4 py-2 min-h-[44px] text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:outline-none"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.level})
          </option>
        ))}
      </select>
      </FilterBar>
      )}

      {selectedStudentId && section === 'curriculum' && (
        <CurriculumPanel studentId={selectedStudentId} showToast={showToast} onRefresh={triggerRefresh} />
      )}
      {selectedStudentId && section === 'assignments' && (
        <AssignmentsPanel studentId={selectedStudentId} showToast={showToast} onRefresh={triggerRefresh} />
      )}
      {selectedStudentId && section === 'achievements' && (
        <AchievementsPanel studentId={selectedStudentId} showToast={showToast} onRefresh={triggerRefresh} />
      )}
      {selectedStudentId && section === 'reports' && (
        <ReportsPanel
          studentId={selectedStudentId}
          staffId={currentUser.staffId || undefined}
          canPublish={isAdmin}
          showToast={showToast}
          onRefresh={triggerRefresh}
        />
      )}
    </div>
  );
}

function CurriculumPanel({
  studentId,
  showToast,
  onRefresh,
}: {
  studentId: string;
  showToast: (m: string, t?: 'success') => void;
  onRefresh: () => void;
}) {
  const student = StorageService.getStudents().find((s) => s.id === studentId);
  const levels = StorageService.getCurriculumLevels();
  const items = StorageService.getCurriculumItems();
  const progress = StorageService.getCurriculumProgress(studentId);
  const level = levels.find((l) => l.name === student?.level) || levels[0];
  const levelItems = level ? items.filter((i) => i.levelId === level.id) : [];

  const toggleProgress = (itemId: string, current?: CurriculumProgressStatus) => {
    const next: CurriculumProgressStatus =
      current === 'completed' ? 'not_started' : current === 'in_progress' ? 'completed' : 'in_progress';
    StorageService.saveCurriculumProgress({
      studentId,
      curriculumItemId: itemId,
      status: next,
      completedAt: next === 'completed' ? new Date().toISOString() : undefined,
    });
    showToast('진도가 업데이트되었습니다.', 'success');
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="font-bold text-sm mb-3">{level?.name || student?.level} 표준 곡목</h3>
      {levelItems.map((item) => {
        const prog = progress.find((p) => p.curriculumItemId === item.id);
        const status = prog?.status || 'not_started';
        return (
          <button
            key={item.id}
            onClick={() => toggleProgress(item.id, status)}
            className="w-full flex items-center gap-3 py-2.5 border-b border-slate-50 text-left hover:bg-slate-50 rounded-lg px-2"
          >
            <CheckCircle2 className={`w-5 h-5 ${status === 'completed' ? 'text-emerald-500' : 'text-slate-300'}`} />
            <div>
              <p className={`text-sm font-semibold ${status === 'completed' ? 'text-slate-400 line-through' : ''}`}>
                {item.title}
              </p>
              <p className="text-[10px] text-slate-400">
                {status === 'completed' ? '완료' : status === 'in_progress' ? '진행 중' : '미시작'}
              </p>
            </div>
          </button>
        );
      })}
      {levelItems.length === 0 && <p className="text-sm text-slate-400 text-center py-4">커리큘럼 항목이 없습니다.</p>}
    </div>
  );
}

function AssignmentsPanel({
  studentId,
  showToast,
  onRefresh,
}: {
  studentId: string;
  showToast: (m: string, t?: 'success') => void;
  onRefresh: () => void;
}) {
  const weekStart = StorageService.getCurrentWeekStart();
  const [songTitle, setSongTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(30);

  const existing = StorageService.getWeeklyAssignments(studentId).find((a) => a.weekStart === weekStart);

  const handleCreate = () => {
    if (!songTitle.trim()) {
      showToast('곡명을 입력해주세요.');
      return;
    }
    const items = existing?.items || [];
    const newItem = {
      id: `ai-${Date.now()}`,
      assignmentId: existing?.id || '',
      songTitle: songTitle.trim(),
      instructions: instructions.trim() || `${songTitle} 연습`,
      targetMinutes,
      sortOrder: items.length,
      parentConfirmed: false,
      completed: false,
    };
    StorageService.saveWeeklyAssignment({
      ...(existing ? { id: existing.id } : {}),
      studentId,
      weekStart,
      title: `${weekStart} 주간 과제`,
      status: 'assigned' as AssignmentStatus,
      publishedAt: new Date().toISOString(),
      items: [...items, newItem],
    });
    setSongTitle('');
    setInstructions('');
    showToast('과제가 등록되었습니다.', 'success');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-sm mb-3">이번 주 과제 추가 ({weekStart})</h3>
        <div className="space-y-3">
          <input
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="곡명 (예: 체르니 30-15)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
          />
          <input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="과제 설명 (예: 하루 30분, 16-20마디 집중)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">목표 연습(분/일)</span>
            <input
              type="number"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> 과제 추가
          </button>
        </div>
      </div>

      {existing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-2">등록된 과제 ({existing.items.length}개)</h3>
          {existing.items.map((it) => (
            <div key={it.id} className="py-2 border-b border-slate-50 text-sm">
              <p className="font-bold">{it.songTitle}</p>
              <p className="text-xs text-slate-500">{it.instructions}</p>
              <p className="text-xs mt-1">
                {it.parentConfirmed ? '✅ 학부모 확인됨' : '⏳ 확인 대기'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementsPanel({
  studentId,
  showToast,
  onRefresh,
}: {
  studentId: string;
  showToast: (m: string, t?: 'success') => void;
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AchievementType>('exam');
  const [result, setResult] = useState('');
  const [eventDate, setEventDate] = useState(todayIsoLocal);
  const achievements = StorageService.getAchievements(studentId);

  const handleAdd = () => {
    if (!title.trim()) return;
    StorageService.saveAchievement({ studentId, type, title: title.trim(), result, eventDate });
    setTitle('');
    setResult('');
    showToast('성취 기록이 추가되었습니다.', 'success');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="font-bold text-sm">성취 기록 추가</h3>
        <select value={type} onChange={(e) => setType(e.target.value as AchievementType)} className="w-full px-3 py-2 text-sm border rounded-xl">
          <option value="exam">시험/급수</option>
          <option value="competition">콩쿠르</option>
          <option value="certificate">자격증</option>
          <option value="grade">등급</option>
          <option value="recital">연주회</option>
          <option value="other">기타</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (예: ABRSM Grade 3 Piano)" className="w-full px-3 py-2 text-sm border rounded-xl" />
        <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="결과 (예: Distinction, 2등)" className="w-full px-3 py-2 text-sm border rounded-xl" />
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-xl" />
        <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">추가</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        {achievements.map((a) => (
          <div key={a.id} className="py-2 border-b border-slate-50 text-sm">
            <p className="font-bold">{a.title}</p>
            <p className="text-xs text-slate-500">{a.eventDate} · {a.result}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPanel({
  studentId,
  staffId,
  canPublish,
  showToast,
  onRefresh,
}: {
  studentId: string;
  staffId?: string;
  canPublish: boolean;
  showToast: (m: string, t?: 'success') => void;
  onRefresh: () => void;
}) {
  const yearMonth = yearMonthLocal();
  const reports = StorageService.getLearningReports(studentId);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');

  const handleGenerate = () => {
    const report = StorageService.generateLearningReport(studentId, yearMonth, staffId);
    StorageService.saveLearningReport({
      ...report,
      strengths,
      improvements,
      goalsNextMonth: goals,
    });
    showToast('리포트 초안이 생성되었습니다.', 'success');
    onRefresh();
  };

  const handlePublish = (id: string) => {
    StorageService.publishLearningReport(id);
    showToast('학부모에게 공개되었습니다.', 'success');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="font-bold text-sm">{yearMonth} 리포트 생성</h3>
        <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="잘한 점" className="w-full px-3 py-2 text-sm border rounded-xl h-16" />
        <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="보완점" className="w-full px-3 py-2 text-sm border rounded-xl h-16" />
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="다음 달 목표" className="w-full px-3 py-2 text-sm border rounded-xl h-16" />
        <button onClick={handleGenerate} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1">
          <Plus className="w-4 h-4" /> 리포트 생성
        </button>
      </div>
      {reports.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold">{r.yearMonth}</p>
              <p className="text-xs text-slate-500">출석 {r.attendanceRate}% · 연습 {r.practiceMinutes}분</p>
            </div>
            {r.status === 'draft' ? (
              canPublish ? (
              <button onClick={() => handlePublish(r.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 min-h-[44px]">
                <Send className="w-3 h-3" /> 학부모 공개
              </button>
              ) : (
              <span className="text-xs text-slate-500 font-bold">초안 · 원장이 공개합니다</span>
              )
            ) : (
              <span className="text-xs text-emerald-600 font-bold">공개됨</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
