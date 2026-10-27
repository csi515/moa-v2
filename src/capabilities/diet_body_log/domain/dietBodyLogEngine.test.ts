import assert from 'node:assert/strict';
import {
  calculateBmi,
  calculateWorkoutVolume,
  analyzeBodyCompositionTrend,
  summarizeDailyFitnessLog,
  type InbodyRecord,
  type WorkoutSet,
  type WorkoutExerciseLog,
  type DietMealLog,
} from './dietBodyLogEngine';

function run() {
  // 1. calculateBmi
  const normalBmi = calculateBmi(70, 175); // 70 / (1.75 * 1.75) = 22.86 -> 22.9
  assert.equal(normalBmi.bmi, 22.9);
  assert.equal(normalBmi.status, 'NORMAL');
  assert.equal(normalBmi.statusLabel, '표준');

  const obeseBmi = calculateBmi(85, 170); // 85 / (1.7 * 1.7) = 29.41 -> 29.4
  assert.equal(obeseBmi.bmi, 29.4);
  assert.equal(obeseBmi.status, 'OBESE');

  assert.throws(() => calculateBmi(-5, 170), /0보다 커야 합니다/);

  // 2. calculateWorkoutVolume
  const dummySets: WorkoutSet[] = [
    { setNumber: 1, weightKg: 60, reps: 10, completed: true }, // 600kg
    { setNumber: 2, weightKg: 80, reps: 8, completed: true }, // 640kg
    { setNumber: 3, weightKg: 100, reps: 5, completed: true }, // 500kg
    { setNumber: 4, weightKg: 110, reps: 3, completed: false }, // 미완료 제외
  ];
  const volumeResult = calculateWorkoutVolume(dummySets);
  assert.equal(volumeResult.totalVolumeKg, 1740); // 600 + 640 + 500 = 1740
  assert.equal(volumeResult.completedSetsCount, 3);

  // 3. analyzeBodyCompositionTrend
  const inbodyRecords: InbodyRecord[] = [
    {
      id: 'in-1',
      customerId: 'c-1',
      measuredDate: '2026-08-01',
      weightKg: 80,
      skeletalMuscleMassKg: 32,
      bodyFatPercent: 24,
    },
    {
      id: 'in-2',
      customerId: 'c-1',
      measuredDate: '2026-09-01',
      weightKg: 78,
      skeletalMuscleMassKg: 33,
      bodyFatPercent: 21,
    },
    {
      id: 'in-3',
      customerId: 'c-1',
      measuredDate: '2026-10-01',
      weightKg: 77,
      skeletalMuscleMassKg: 34,
      bodyFatPercent: 18,
    },
  ];

  const trend = analyzeBodyCompositionTrend(inbodyRecords);
  assert.ok(trend !== null);
  assert.equal(trend.latestRecord.id, 'in-3');
  assert.equal(trend.previousRecord?.id, 'in-2');
  assert.equal(trend.weightDeltaKg, -1); // 77 - 78
  assert.equal(trend.muscleDeltaKg, 1); // 34 - 33
  assert.equal(trend.bodyFatDeltaPercent, -3); // 18 - 21
  assert.equal(trend.totalWeightDeltaKg, -3); // 77 - 80
  assert.ok(trend.evaluationSummary.includes('골격근량 +1kg 증가'));

  // 4. summarizeDailyFitnessLog
  const exercises: WorkoutExerciseLog[] = [
    {
      exerciseName: '스쿼트',
      targetMuscleGroup: '하체',
      sets: dummySets,
      totalVolumeKg: 1740,
    },
  ];
  const meals: DietMealLog[] = [
    {
      id: 'm-1',
      customerId: 'c-1',
      loggedDate: '2026-10-15',
      mealType: 'LUNCH',
      foodDescription: '닭가슴살 볶음밥과 샐러드',
      trainerFeedback: '단백질 섭취량이 훌륭합니다!',
    },
  ];
  const summary = summarizeDailyFitnessLog({
    customerName: '김철수',
    date: '2026-10-15',
    exercises,
    meals,
    inbody: inbodyRecords[2],
  });

  assert.ok(summary.includes('김철수 회원님'));
  assert.ok(summary.includes('누적 볼륨: 1,740kg'));
  assert.ok(summary.includes('1/1건 완료'));
  assert.ok(summary.includes('골격근 34kg'));

  console.log('✅ dietBodyLogEngine tests all passed!');
}

run();
