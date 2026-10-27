export interface ExamCategoryBreakdown {
  category: string; // 예: "문법", "독해", "어휘", "듣기" 또는 "대수", "기하", "확률"
  earnedScore: number;
  maxScore: number;
  percentage: number;
}

export interface StudentExamSubmission {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  subject: string; // "수학", "영어", "국어", "코딩"
  testDate: string; // ISO
  categoryBreakdowns: ExamCategoryBreakdown[];
  totalScore: number;
  maxTotalScore: number;
}

export interface StudentGradeAnalysis {
  totalPercentage: number;
  weakestCategory: ExamCategoryBreakdown;
  strongestCategory: ExamCategoryBreakdown;
  rank: number;
  classTotalStudents: number;
  percentileRank: number; // 상위 N%
  zScore: number; // 반 평균 대비 표준편차 점수
}

export interface ClassGradeStatistics {
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  totalSubmissions: number;
}

/**
 * 반 전체 시험 응시 제출 건들을 기반으로 반 평균과 표준편차를 산출합니다.
 */
export function calculateClassStatistics(
  submissions: StudentExamSubmission[]
): ClassGradeStatistics {
  if (submissions.length === 0) {
    return {
      classAverage: 0,
      highestScore: 0,
      lowestScore: 0,
      standardDeviation: 0,
      totalSubmissions: 0,
    };
  }

  const scores = submissions.map((s) => s.totalScore);
  const sum = scores.reduce((a, b) => a + b, 0);
  const classAverage = Math.round((sum / scores.length) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  const variance =
    scores.reduce((acc, score) => acc + Math.pow(score - classAverage, 2), 0) /
    scores.length;
  const standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10;

  return {
    classAverage,
    highestScore,
    lowestScore,
    standardDeviation,
    totalSubmissions: submissions.length,
  };
}

/**
 * 특정 원생의 영역별 취약 단원 분석 및 반 내 백분위/Z-Score를 산출합니다.
 */
export function analyzeStudentExamSubmission(
  studentSubmission: StudentExamSubmission,
  allSubmissions: StudentExamSubmission[]
): StudentGradeAnalysis {
  const stats = calculateClassStatistics(allSubmissions);

  // 영역별 정렬 (득점률 낮은 순 -> 취약 영역)
  const sortedCategories = [...studentSubmission.categoryBreakdowns].sort(
    (a, b) => a.percentage - b.percentage
  );

  const weakestCategory = sortedCategories[0];
  const strongestCategory = sortedCategories[sortedCategories.length - 1];

  // 석차 계산 (점수 높은 순)
  const scoresDescending = allSubmissions
    .map((s) => s.totalScore)
    .sort((a, b) => b - a);
  const rank = scoresDescending.indexOf(studentSubmission.totalScore) + 1;
  const percentileRank = Math.round((rank / Math.max(1, allSubmissions.length)) * 100);

  // Z-Score: (개인점수 - 평균) / 표준편차
  const zScore =
    stats.standardDeviation > 0
      ? Math.round(
          ((studentSubmission.totalScore - stats.classAverage) / stats.standardDeviation) * 100
        ) / 100
      : 0;

  const totalPercentage = Math.round(
    (studentSubmission.totalScore / Math.max(1, studentSubmission.maxTotalScore)) * 100
  );

  return {
    totalPercentage,
    weakestCategory,
    strongestCategory,
    rank,
    classTotalStudents: allSubmissions.length,
    percentileRank,
    zScore,
  };
}
