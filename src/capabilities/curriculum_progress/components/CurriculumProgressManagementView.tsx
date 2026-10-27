import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import { useList } from '@refinedev/core';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Search,
  User,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateCurriculumProgress,
  evaluateLevelAdvancement,
  generateMonthlyGrowthReport,
  type CurriculumItemDefinition,
  type StudentProgressRecord,
  type MonthlyGrowthReportSummary,
} from '../domain/curriculumProgressEngine';

interface StudentItem {
  id: string;
  name: string;
  targetLevel: string;
}

const DEFAULT_STUDENTS: StudentItem[] = [
  { id: 'std-1', name: '김민수', targetLevel: 'lv-piano-1' },
  { id: 'std-2', name: '이지은', targetLevel: 'lv-piano-2' },
  { id: 'std-3', name: '박도현', targetLevel: 'lv-piano-1' },
  { id: 'std-4', name: '최서아', targetLevel: 'lv-taekwondo-1' },
  { id: 'std-5', name: '윤하은', targetLevel: 'lv-swim-1' },
];

const DEFAULT_CURRICULUM_ITEMS: CurriculumItemDefinition[] = [
  { id: 'item-101', levelId: 'lv-piano-1', title: '바이엘 1~10 (오른손 기본 음계)', sortOrder: 1, required: true },
  { id: 'item-102', levelId: 'lv-piano-1', title: '바이엘 11~20 (양손 기본 박자)', sortOrder: 2, required: true },
  { id: 'item-103', levelId: 'lv-piano-1', title: '바이엘 21~30 (화음 연습곡)', sortOrder: 3, required: false },
  { id: 'item-104', levelId: 'lv-piano-1', title: '바이엘 마스터 (작은 별 연주곡)', sortOrder: 4, required: true },

  { id: 'item-201', levelId: 'lv-piano-2', title: '체르니 100 No.1 (손가락 독립)', sortOrder: 1, required: true },
  { id: 'item-202', levelId: 'lv-piano-2', title: '체르니 100 No.5 (아르페지오 기초)', sortOrder: 2, required: true },
  { id: 'item-203', levelId: 'lv-piano-2', title: '체르니 100 No.10 (셈여림 표현)', sortOrder: 3, required: true },

  { id: 'item-301', levelId: 'lv-taekwondo-1', title: '기본 서기와 주먹 지르기', sortOrder: 1, required: true },
  { id: 'item-302', levelId: 'lv-taekwondo-1', title: '태극 1장 품새', sortOrder: 2, required: true },
  { id: 'item-303', levelId: 'lv-taekwondo-1', title: '앞차기 및 기본 격파', sortOrder: 3, required: true },

  { id: 'item-401', levelId: 'lv-swim-1', title: '물적응 및 자유형 발차기', sortOrder: 1, required: true },
  { id: 'item-402', levelId: 'lv-swim-1', title: '자유형 팔돌리기와 호흡', sortOrder: 2, required: true },
  { id: 'item-403', levelId: 'lv-swim-1', title: '자유형 25m 완영', sortOrder: 3, required: true },
];

const STORAGE_KEY_PROGRESS = 'moa_curriculum_progress_records';
const STORAGE_KEY_REPORTS = 'moa_curriculum_monthly_reports';

export function CurriculumProgressManagementView() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('std-1');

  // Refine v5 원생 목록 연동 (DB 실시간 데이터 우선)
  const { query: customersQuery } = useList<any>({
    resource: 'customers',
    pagination: { mode: 'off' },
  });

  const studentsList: StudentItem[] = useMemo(() => {
    const remote = customersQuery?.data?.data as Array<{ id: string; name: string; metadata?: any; level?: string }> | undefined;
    if (remote && remote.length > 0) {
      return remote.map((c) => ({
        id: c.id,
        name: c.name,
        targetLevel: c.level || c.metadata?.target_level || 'lv-piano-1',
      }));
    }
    return DEFAULT_STUDENTS;
  }, [customersQuery?.data?.data]);
  const [activeTab, setActiveTab] = useState<'progress' | 'reports'>('progress');
  const [searchQuery, setSearchQuery] = useState('');

  // 진도 상태 관리
  const [progressRecords, setProgressRecords] = useState<Record<string, StudentProgressRecord[]>>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_PROGRESS));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      'std-1': [
        { curriculumItemId: 'item-101', status: 'mastered', completedAt: '2026-10-01' },
        { curriculumItemId: 'item-102', status: 'completed', completedAt: '2026-10-08' },
        { curriculumItemId: 'item-103', status: 'in_progress' },
      ],
      'std-2': [
        { curriculumItemId: 'item-201', status: 'completed', completedAt: '2026-10-05' },
      ],
    };
  });

  // 월간 리포트 이력
  const [reports, setReports] = useState<MonthlyGrowthReportSummary[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_REPORTS));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // 리포트 작성용 로컬 폼 상태
  const [reportInput, setReportInput] = useState({
    yearMonth: '2026-10',
    attendanceRate: 92,
    practiceMinutes: 240,
    lessonsCount: 8,
    instructorComment: '기초 박자 감각이 매우 훌륭하며, 양손 독립 연주를 자연스럽게 소화하고 있습니다.',
  });

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_PROGRESS), JSON.stringify(progressRecords));
  }, [progressRecords]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_REPORTS), JSON.stringify(reports));
  }, [reports]);

  const currentStudent = studentsList.find((s) => s.id === selectedStudentId) || studentsList[0];
  const currentStudentProgress = progressRecords[currentStudent.id] || [];

  // 학생의 대상 레벨에 해당하는 단원 목록
  const studentItems = useMemo(() => {
    return DEFAULT_CURRICULUM_ITEMS.filter((item) => item.levelId === currentStudent.targetLevel);
  }, [currentStudent.targetLevel]);

  // 진도율 및 마스터 상태 순수 계산
  const progressSummary = useMemo(() => {
    return calculateCurriculumProgress(studentItems, currentStudentProgress);
  }, [studentItems, currentStudentProgress]);

  // 단원 상태 토글 핸들러
  const handleToggleItemStatus = (itemId: string) => {
    const list = [...(progressRecords[currentStudent.id] || [])];
    const existingIdx = list.findIndex((r) => r.curriculumItemId === itemId);

    let nextStatus: StudentProgressRecord['status'] = 'in_progress';
    if (existingIdx >= 0) {
      const current = list[existingIdx].status;
      if (current === 'in_progress') nextStatus = 'completed';
      else if (current === 'completed') nextStatus = 'mastered';
      else if (current === 'mastered') nextStatus = 'not_started';
      else nextStatus = 'in_progress';

      list[existingIdx] = {
        ...list[existingIdx],
        status: nextStatus,
        completedAt: nextStatus === 'completed' || nextStatus === 'mastered' ? new Date().toISOString() : undefined,
      };
    } else {
      list.push({
        curriculumItemId: itemId,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    }

    setProgressRecords({
      ...progressRecords,
      [currentStudent.id]: list,
    });
    showToast('진도 상태가 업데이트되었습니다.', 'success');
  };

  // 승급/급수 심사 평가
  const handleEvaluateAdvancement = () => {
    const criteria = {
      minProgressPercent: 75,
      requireAllMandatory: true,
      minMasteredCount: 1,
      badgeOnPass: `${currentStudent.targetLevel.toUpperCase()}_CERTIFIED`,
    };

    const result = evaluateLevelAdvancement(studentItems, currentStudentProgress, criteria);

    if (result.passed) {
      showToast(`축하합니다! 승급 심사 통과 (인증 뱃지: ${result.awardedBadge})`, 'success');
    } else {
      showToast(`승급 기준 미달: ${result.reason}`, 'info');
    }
  };

  // 성장 리포트 발행
  const handlePublishReport = () => {
    const report = generateMonthlyGrowthReport({
      studentName: currentStudent.name,
      yearMonth: reportInput.yearMonth,
      attendanceRate: Number(reportInput.attendanceRate),
      practiceMinutes: Number(reportInput.practiceMinutes),
      lessonsCount: Number(reportInput.lessonsCount),
      completedItemsCount: progressSummary.completedItems,
      instructorComment: reportInput.instructorComment,
    });

    setReports([report, ...reports.filter((r) => !(r.studentName === report.studentName && r.yearMonth === report.yearMonth))]);
    showToast(`${currentStudent.name} 학생의 ${reportInput.yearMonth} 리포트가 학부모 포털로 발행되었습니다.`, 'success');
  };

  const filteredStudents = studentsList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">학습 진도 & 성장 리포트 관리</h1>
            <p className="text-sm text-slate-500">
              교재·단원별 진도율 체크, 승급 심사 판정 및 학부모 전송용 월간 성장 리포트를 관리합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            단원별 진도 체크
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            월간 성장 리포트
          </button>
        </div>
      </div>

      {/* 2열 레이아웃: 학생 목록 + 세부 상세 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 학생 목록 사이드바 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="수강생 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            {filteredStudents.map((std) => {
              const isSelected = std.id === currentStudent.id;
              const stdItems = DEFAULT_CURRICULUM_ITEMS.filter((i) => i.levelId === std.targetLevel);
              const summary = calculateCurriculumProgress(stdItems, progressRecords[std.id] || []);

              return (
                <button
                  key={std.id}
                  onClick={() => setSelectedStudentId(std.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                      {std.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{std.name}</p>
                      <p className="text-xs text-slate-400">{std.targetLevel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600">{summary.progressPercent}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 상세 뷰 영역 */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === 'progress' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* 수강생 진도 현황 헤더 카드 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                    <Award className="w-3.5 h-3.5" />
                    <span>현재 과정: {currentStudent.targetLevel}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{currentStudent.name} 수강생 진도율</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEvaluateAdvancement}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>승급·급수 심사 평가</span>
                  </button>
                </div>
              </div>

              {/* 프로그레스 바 & 통계 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">전체 진도율</span>
                  <span className="text-indigo-600 font-bold text-base">{progressSummary.progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressSummary.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>총 {progressSummary.totalItems}개 단원</span>
                  <span>•</span>
                  <span>완료: {progressSummary.completedItems}개</span>
                  <span>•</span>
                  <span>마스터: {progressSummary.masteredItems}개</span>
                  {progressSummary.earnedBadge && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-amber-600">뱃지: {progressSummary.earnedBadge}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 단원 목록 리스트 */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900">과정 구성 단원 목록</h3>
                <div className="space-y-2">
                  {studentItems.map((item) => {
                    const record = currentStudentProgress.find((p) => p.curriculumItemId === item.id);
                    const status = record?.status || 'not_started';

                    let badgeColor = 'bg-slate-100 text-slate-600';
                    let statusLabel = '시작 전';
                    if (status === 'in_progress') {
                      badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                      statusLabel = '학습 중';
                    } else if (status === 'completed') {
                      badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                      statusLabel = '완료';
                    } else if (status === 'mastered') {
                      badgeColor = 'bg-purple-50 text-purple-700 border border-purple-200';
                      statusLabel = '★ 마스터';
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{item.sortOrder}</span>
                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                            {item.required && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded">
                                필수
                              </span>
                            )}
                          </div>
                          {record?.completedAt && (
                            <p className="text-xs text-slate-400">완료일: {record.completedAt.slice(0, 10)}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleItemStatus(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${badgeColor}`}
                        >
                          {statusLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* 월간 성장 리포트 작성 및 발행 탭 */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{currentStudent.name} 월간 성장 리포트</h2>
                  <p className="text-xs text-slate-500">출결 및 단원 완료 지표를 바탕으로 리포트를 발행합니다.</p>
                </div>
                <button
                  onClick={handlePublishReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>학부모 포털 발행</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">대상 월</label>
                  <input
                    type="text"
                    value={reportInput.yearMonth}
                    onChange={(e) => setReportInput({ ...reportInput, yearMonth: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800"
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">출석률 (%)</label>
                  <input
                    type="number"
                    value={reportInput.attendanceRate}
                    onChange={(e) => setReportInput({ ...reportInput, attendanceRate: Number(e.target.value) })}
                    className="w-full mt-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800"
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">연습 시간 (분)</label>
                  <input
                    type="number"
                    value={reportInput.practiceMinutes}
                    onChange={(e) => setReportInput({ ...reportInput, practiceMinutes: Number(e.target.value) })}
                    className="w-full mt-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800"
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">완료 단원</label>
                  <div className="mt-1 text-sm font-bold text-indigo-600 py-1">
                    {progressSummary.completedItems}개 단원
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">지도 강사 총평</label>
                <textarea
                  rows={3}
                  value={reportInput.instructorComment}
                  onChange={(e) => setReportInput({ ...reportInput, instructorComment: e.target.value })}
                  placeholder="학생의 학습 태도, 강점 및 다음 달 지도 방향을 기재하세요."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 발행 이력 */}
              {reports.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">최근 발행된 성장 리포트</h3>
                  <div className="space-y-2">
                    {reports.map((rep, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700">
                            {rep.studentName} • {rep.yearMonth} 리포트
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {rep.performanceGrade}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{rep.headline}</p>
                        <p className="text-xs text-slate-600 whitespace-pre-line">{rep.summaryText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CurriculumProgressManagementView;
