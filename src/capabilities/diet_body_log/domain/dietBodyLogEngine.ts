/**
 * 피트니스 식단 & 체성분 다이어리 순수 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 피트니스 8종 (PT샵, 헬스장, 필라테스, 요가, 복싱/MMA, 클라이밍 등)
 * 주요 기능:
 *  1. 체질량지수(BMI) 및 비만도 판정
 *  2. 운동 루틴 세트별 부하 총 볼륨 (kg * reps) 집계
 *  3. 인바디 체성분(체중, 골격근량, 체지방률) 시계열 변화 추이 분석
 *  4. 일일 운동·식단 피드백 다이어리 종합 요약문 생성
 */

export interface InbodyRecord {
  id: string;
  customerId: string;
  measuredDate: string; // YYYY-MM-DD
  weightKg: number;
  skeletalMuscleMassKg: number;
  bodyFatPercent: number;
  heightCm?: number;
  bmi?: number;
  note?: string;
}

export interface WorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExerciseLog {
  exerciseName: string;
  targetMuscleGroup: '가슴' | '등' | '하체' | '어깨' | '팔' | '코어' | '유산소';
  sets: WorkoutSet[];
  totalVolumeKg: number;
}

export interface DietMealLog {
  id: string;
  customerId: string;
  loggedDate: string; // YYYY-MM-DD
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  foodDescription: string;
  photoUrl?: string;
  trainerFeedback?: string;
  feedbackGivenAt?: string;
}

export interface BmiResult {
  bmi: number;
  status: 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
  statusLabel: string;
}

export interface BodyCompositionTrend {
  latestRecord: InbodyRecord;
  previousRecord?: InbodyRecord;
  weightDeltaKg: number; // 최신 - 직전
  muscleDeltaKg: number; // 최신 - 직전
  bodyFatDeltaPercent: number; // 최신 - 직전
  totalWeightDeltaKg: number; // 최신 - 최초
  evaluationSummary: string;
}

/**
 * 1. BMI 계산 및 비만도 판정 (순수 함수)
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  if (weightKg <= 0 || heightCm <= 0) {
    throw new Error('체중과 신장은 0보다 커야 합니다.');
  }

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  let status: BmiResult['status'] = 'NORMAL';
  let statusLabel = '표준';

  if (bmi < 18.5) {
    status = 'UNDERWEIGHT';
    statusLabel = '저체중';
  } else if (bmi < 23) {
    status = 'NORMAL';
    statusLabel = '표준';
  } else if (bmi < 25) {
    status = 'OVERWEIGHT';
    statusLabel = '과체중';
  } else {
    status = 'OBESE';
    statusLabel = '비만';
  }

  return { bmi, status, statusLabel };
}

/**
 * 2. 운동 종목별 총 부하 볼륨 (kg * reps) 계산 (순수 함수)
 */
export function calculateWorkoutVolume(sets: readonly WorkoutSet[]): {
  totalVolumeKg: number;
  completedSetsCount: number;
} {
  let totalVolumeKg = 0;
  let completedSetsCount = 0;

  for (const s of sets) {
    if (s.completed && s.weightKg > 0 && s.reps > 0) {
      totalVolumeKg += s.weightKg * s.reps;
      completedSetsCount++;
    }
  }

  return { totalVolumeKg, completedSetsCount };
}

/**
 * 3. 인바디 시계열 변화 추이 분석 (순수 함수)
 */
export function analyzeBodyCompositionTrend(
  records: readonly InbodyRecord[]
): BodyCompositionTrend | null {
  if (!records || records.length === 0) return null;

  // 날짜순 오름차순 정렬
  const sorted = [...records].sort((a, b) => a.measuredDate.localeCompare(b.measuredDate));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  const initial = sorted[0];

  const weightDeltaKg = previous
    ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10
    : 0;
  const muscleDeltaKg = previous
    ? Math.round((latest.skeletalMuscleMassKg - previous.skeletalMuscleMassKg) * 10) / 10
    : 0;
  const bodyFatDeltaPercent = previous
    ? Math.round((latest.bodyFatPercent - previous.bodyFatPercent) * 10) / 10
    : 0;
  const totalWeightDeltaKg = Math.round((latest.weightKg - initial.weightKg) * 10) / 10;

  let evaluationSummary = '최초 측정 기록이 등록되었습니다.';
  if (previous) {
    if (muscleDeltaKg > 0 && bodyFatDeltaPercent <= 0) {
      evaluationSummary = `골격근량 +${muscleDeltaKg}kg 증가, 체지방률 ${bodyFatDeltaPercent}% 감소로 매우 이상적인 린매스업 진행 중입니다!`;
    } else if (bodyFatDeltaPercent < 0) {
      evaluationSummary = `체지방률 ${bodyFatDeltaPercent}% 감량에 성공하였습니다. 꾸준한 유산소와 식단 관리가 돋보입니다.`;
    } else if (muscleDeltaKg > 0) {
      evaluationSummary = `골격근량 +${muscleDeltaKg}kg 성장을 기록하였습니다. 근력 운동 강도를 훌륭히 소화하고 있습니다.`;
    } else {
      evaluationSummary = `체중 ${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg}kg 변화를 기록하였습니다. 다음 측정까지 식단 피드백 유지를 권장합니다.`;
    }
  }

  return {
    latestRecord: latest,
    previousRecord: previous,
    weightDeltaKg,
    muscleDeltaKg,
    bodyFatDeltaPercent,
    totalWeightDeltaKg,
    evaluationSummary,
  };
}

/**
 * 4. 일일 운동·식단 피드백 다이어리 종합 요약문 생성 (순수 함수)
 */
export function summarizeDailyFitnessLog(params: {
  customerName: string;
  date: string; // YYYY-MM-DD
  exercises: readonly WorkoutExerciseLog[];
  meals: readonly DietMealLog[];
  inbody?: InbodyRecord;
}): string {
  const { customerName, date, exercises, meals, inbody } = params;

  let totalDailyVolume = 0;
  exercises.forEach((ex) => {
    totalDailyVolume += ex.totalVolumeKg;
  });

  const feedbackGivenCount = meals.filter((m) => !!m.trainerFeedback).length;

  const lines: string[] = [
    `[${date}] ${customerName} 회원님 일일 피트니스 다이어리`,
    `- 운동: 총 ${exercises.length}개 종목 수행 (누적 볼륨: ${totalDailyVolume.toLocaleString()}kg)`,
    `- 식단: ${meals.length}개 끼니 기록 (트레이너 코멘트: ${feedbackGivenCount}/${meals.length}건 완료)`,
  ];

  if (inbody) {
    lines.push(
      `- 체성분: 체중 ${inbody.weightKg}kg / 골격근 ${inbody.skeletalMuscleMassKg}kg / 체지방 ${inbody.bodyFatPercent}%`
    );
  }

  return lines.join('\n');
}
