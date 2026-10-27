import assert from 'node:assert';
import {
  calculateClassStatistics,
  analyzeStudentExamSubmission,
  StudentExamSubmission,
} from './examGradeAnalyticsEngine';

console.log('--- Testing examGradeAnalyticsEngine ---');

// Test 1: Class statistics calculation (Average, SD, Highest, Lowest)
const submissions: StudentExamSubmission[] = [
  {
    id: 'sub_1',
    studentId: 'st_1',
    studentName: '김민준',
    examId: 'exam_oct_math',
    examTitle: '10월 중등 수학 단원평가',
    subject: '수학',
    testDate: '2026-10-10T00:00:00Z',
    totalScore: 90,
    maxTotalScore: 100,
    categoryBreakdowns: [
      { category: '대수', earnedScore: 30, maxScore: 30, percentage: 100 },
      { category: '기하', earnedScore: 24, maxScore: 30, percentage: 80 },
      { category: '함수', earnedScore: 20, maxScore: 20, percentage: 100 },
      { category: '확률', earnedScore: 16, maxScore: 20, percentage: 80 },
    ],
  },
  {
    id: 'sub_2',
    studentId: 'st_2',
    studentName: '이서연',
    examId: 'exam_oct_math',
    examTitle: '10월 중등 수학 단원평가',
    subject: '수학',
    testDate: '2026-10-10T00:00:00Z',
    totalScore: 70,
    maxTotalScore: 100,
    categoryBreakdowns: [
      { category: '대수', earnedScore: 20, maxScore: 30, percentage: 67 },
      { category: '기하', earnedScore: 15, maxScore: 30, percentage: 50 },
      { category: '함수', earnedScore: 20, maxScore: 20, percentage: 100 },
      { category: '확률', earnedScore: 15, maxScore: 20, percentage: 75 },
    ],
  },
  {
    id: 'sub_3',
    studentId: 'st_3',
    studentName: '박도윤',
    examId: 'exam_oct_math',
    examTitle: '10월 중등 수학 단원평가',
    subject: '수학',
    testDate: '2026-10-10T00:00:00Z',
    totalScore: 80,
    maxTotalScore: 100,
    categoryBreakdowns: [
      { category: '대수', earnedScore: 25, maxScore: 30, percentage: 83 },
      { category: '기하', earnedScore: 21, maxScore: 30, percentage: 70 },
      { category: '함수', earnedScore: 18, maxScore: 20, percentage: 90 },
      { category: '확률', earnedScore: 16, maxScore: 20, percentage: 80 },
    ],
  },
];

const stats = calculateClassStatistics(submissions);
assert.strictEqual(stats.classAverage, 80);
assert.strictEqual(stats.highestScore, 90);
assert.strictEqual(stats.lowestScore, 70);
assert.strictEqual(stats.totalSubmissions, 3);
assert.strictEqual(stats.standardDeviation, 8.2); // sqrt(((100+100+0)/3)) = sqrt(66.66) = 8.16 -> 8.2
console.log('✅ Test 1 passed: Class statistics and standard deviation calculation');

// Test 2: Student individual radar analysis (Weakest vs Strongest)
const analysisTop = analyzeStudentExamSubmission(submissions[0], submissions);
assert.strictEqual(analysisTop.rank, 1);
assert.strictEqual(analysisTop.classTotalStudents, 3);
assert.strictEqual(analysisTop.percentileRank, 33); // 상위 33%
assert.strictEqual(analysisTop.zScore, 1.22); // (90 - 80) / 8.2 = 1.2195 -> 1.22
assert.strictEqual(analysisTop.strongestCategory.percentage, 100);

const analysisLower = analyzeStudentExamSubmission(submissions[1], submissions);
assert.strictEqual(analysisLower.rank, 3);
assert.strictEqual(analysisLower.weakestCategory.category, '기하'); // 50%
assert.strictEqual(analysisLower.weakestCategory.percentage, 50);
assert.strictEqual(analysisLower.zScore, -1.22); // (70 - 80) / 8.2 = -1.22
console.log('✅ Test 2 passed: Weakest/strongest radar areas and Z-Score percentiles');

console.log('🎉 All examGradeAnalyticsEngine tests passed!');
