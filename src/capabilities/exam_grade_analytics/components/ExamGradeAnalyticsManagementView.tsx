import React, { useState } from 'react';
import {
  Award,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import {
  StudentExamSubmission,
  calculateClassStatistics,
  analyzeStudentExamSubmission,
} from '../domain/examGradeAnalyticsEngine';

export function ExamGradeAnalyticsManagementView() {
  const [submissions, setSubmissions] = useState<StudentExamSubmission[]>([
    {
      id: 'sub_sample_1',
      studentId: 'st_1',
      studentName: '김민준',
      examId: 'exam_oct_math',
      examTitle: '10월 중등 수학 단원평가',
      subject: '수학',
      testDate: '2026-10-10T00:00:00Z',
      totalScore: 92,
      maxTotalScore: 100,
      categoryBreakdowns: [
        { category: '대수 (방정식)', earnedScore: 28, maxScore: 30, percentage: 93 },
        { category: '기하 (도형)', earnedScore: 24, maxScore: 30, percentage: 80 },
        { category: '함수 그래프', earnedScore: 20, maxScore: 20, percentage: 100 },
        { category: '확률과 통계', earnedScore: 20, maxScore: 20, percentage: 100 },
      ],
    },
    {
      id: 'sub_sample_2',
      studentId: 'st_2',
      studentName: '이서연',
      examId: 'exam_oct_math',
      examTitle: '10월 중등 수학 단원평가',
      subject: '수학',
      testDate: '2026-10-10T00:00:00Z',
      totalScore: 71,
      maxTotalScore: 100,
      categoryBreakdowns: [
        { category: '대수 (방정식)', earnedScore: 22, maxScore: 30, percentage: 73 },
        { category: '기하 (도형)', earnedScore: 15, maxScore: 30, percentage: 50 },
        { category: '함수 그래프', earnedScore: 20, maxScore: 20, percentage: 100 },
        { category: '확률과 통계', earnedScore: 14, maxScore: 20, percentage: 70 },
      ],
    },
    {
      id: 'sub_sample_3',
      studentId: 'st_3',
      studentName: '박도윤',
      examId: 'exam_oct_math',
      examTitle: '10월 중등 수학 단원평가',
      subject: '수학',
      testDate: '2026-10-10T00:00:00Z',
      totalScore: 84,
      maxTotalScore: 100,
      categoryBreakdowns: [
        { category: '대수 (방정식)', earnedScore: 26, maxScore: 30, percentage: 87 },
        { category: '기하 (도형)', earnedScore: 22, maxScore: 30, percentage: 73 },
        { category: '함수 그래프', earnedScore: 18, maxScore: 20, percentage: 90 },
        { category: '확률과 통계', earnedScore: 18, maxScore: 20, percentage: 90 },
      ],
    },
  ]);

  const [selectedStudent, setSelectedStudent] = useState<StudentExamSubmission | null>(null);

  const stats = calculateClassStatistics(submissions);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 헤더 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            학원 단원평가 성적 채점 & 취약영역 레이더 분석
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            시험 점수 입력 시 반 평균/표준편차(Z-Score)를 자동 산출하고, 영역별 취약 단원을 시각화합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-bold border border-indigo-100">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          학부모 상담용 객관 리포트
        </div>
      </div>

      {/* 반 통계 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">반 전체 평균 점수</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {stats.classAverage}<span className="text-xs font-semibold text-slate-400">점</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">총 {stats.totalSubmissions}명 응시</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">반 최고 득점</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.highestScore}<span className="text-xs font-semibold text-slate-400">점</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">최저: {stats.lowestScore}점</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">점수 편차 (표준편차)</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ±{stats.standardDeviation}<span className="text-xs font-semibold text-slate-400">점</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">반 내 성적 분산 지수</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">평가 시행 과목</div>
          <div className="text-2xl font-black text-slate-800 mt-1">수학</div>
          <div className="text-[11px] text-slate-400 mt-0.5">10월 단원평가 4개 영역</div>
        </div>
      </div>

      {/* 원생별 성적 및 레이더 분석 목록 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">원생별 채점 성적표 및 취약 단원 진단</h2>
          <span className="text-xs text-slate-400">총 {submissions.length}명</span>
        </div>

        <div className="divide-y divide-slate-100">
          {submissions.map((sub) => {
            const analysis = analyzeStudentExamSubmission(sub, submissions);

            return (
              <div key={sub.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-base">
                      {analysis.rank}위
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm">{sub.studentName}</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          상위 {analysis.percentileRank}%
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          (Z: {analysis.zScore > 0 ? `+${analysis.zScore}` : analysis.zScore})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        취득 점수: <strong className="text-slate-800">{sub.totalScore}점</strong> / {sub.maxTotalScore}점 · 
                        가장 취약: <strong className="text-rose-600">{analysis.weakestCategory.category} ({analysis.weakestCategory.percentage}%)</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudent(sub)}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold shadow-xs self-start sm:self-center"
                  >
                    상담용 성적표 보기
                  </button>
                </div>

                {/* 영역별 성취도 막대 게이지 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {sub.categoryBreakdowns.map((cat) => {
                    const isWeakest = cat.category === analysis.weakestCategory.category;
                    const isStrongest = cat.category === analysis.strongestCategory.category;

                    return (
                      <div
                        key={cat.category}
                        className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                          isWeakest
                            ? 'bg-rose-50/60 border-rose-200'
                            : isStrongest
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{cat.category}</span>
                          <span className="font-black text-slate-800">{cat.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/80 h-1.5 rounded-full overflow-hidden border border-slate-200/40">
                          <div
                            className={`h-full rounded-full ${
                              isWeakest
                                ? 'bg-rose-500'
                                : isStrongest
                                ? 'bg-emerald-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{cat.earnedScore} / {cat.maxScore}점</span>
                          {isWeakest && <span className="text-rose-600 font-bold">집중 보강</span>}
                          {isStrongest && <span className="text-emerald-600 font-bold">최우수</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 학부모 상담용 개인 성적표 모달 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">ACADEMIC REPORT</span>
                <h3 className="font-black text-slate-800 text-lg mt-0.5">
                  {selectedStudent.studentName} 학생 단원평가 분석표
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const analysis = analyzeStudentExamSubmission(selectedStudent, submissions);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl text-center">
                    <div>
                      <div className="text-[11px] text-slate-400">획득 총점</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">{selectedStudent.totalScore}점</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">반 석차</div>
                      <div className="text-lg font-black text-indigo-600 mt-0.5">{analysis.rank}위 ({analysis.percentileRank}%)</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">반 평균 대비</div>
                      <div className="text-lg font-black text-emerald-600 mt-0.5">
                        {selectedStudent.totalScore >= stats.classAverage ? `+${selectedStudent.totalScore - stats.classAverage}점` : `${selectedStudent.totalScore - stats.classAverage}점`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">영역별 세부 득점률 및 취약점 진단</div>
                    <div className="space-y-2">
                      {selectedStudent.categoryBreakdowns.map((cat) => (
                        <div key={cat.category} className="p-2.5 bg-slate-50/70 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>{cat.category}</span>
                            <span>{cat.earnedScore}점 / {cat.maxScore}점 ({cat.percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cat.percentage < 70 ? 'bg-rose-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                    <strong>학습 처방 코멘트:</strong> {selectedStudent.studentName} 학생은 
                    <strong className="text-indigo-700"> '{analysis.strongestCategory.category}'</strong> 영역에서 
                    {analysis.strongestCategory.percentage}%의 높은 정답률을 보였으나, 
                    <strong className="text-rose-700"> '{analysis.weakestCategory.category}'</strong> 영역의 개념 응용 보강이 추천됩니다.
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
