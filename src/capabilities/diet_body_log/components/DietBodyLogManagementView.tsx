import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Dumbbell,
  Utensils,
  TrendingDown,
  TrendingUp,
  Plus,
  CheckCircle2,
  Send,
  Calendar,
  Sparkles,
  Camera,
  MessageSquare,
  Scale,
  Award,
  ChevronRight,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateBmi,
  calculateWorkoutVolume,
  analyzeBodyCompositionTrend,
  summarizeDailyFitnessLog,
  type InbodyRecord,
  type WorkoutExerciseLog,
  type WorkoutSet,
  type DietMealLog,
} from '../domain/dietBodyLogEngine';

const STORAGE_KEY_INBODY = 'moa_diet_body_inbody_records';
const STORAGE_KEY_WORKOUT = 'moa_diet_body_workout_logs';
const STORAGE_KEY_MEALS = 'moa_diet_body_meal_logs';

interface MemberItem {
  id: string;
  name: string;
  trainerName: string;
  targetGoal: string;
  heightCm: number;
}

const DEFAULT_MEMBERS: MemberItem[] = [
  { id: 'mem-1', name: '김민준', trainerName: '제이슨 트레이너', targetGoal: '골격근 증량 & 체지방 15% 진입', heightCm: 178 },
  { id: 'mem-2', name: '이서연', trainerName: '엠마 코치', targetGoal: '코어 강화 및 바디라인 리셋', heightCm: 164 },
  { id: 'mem-3', name: '박도현', trainerName: '레오 트레이너', targetGoal: '3대 400kg 달성 & 린매스업', heightCm: 181 },
];

const INITIAL_INBODY_RECORDS: InbodyRecord[] = [
  { id: 'in-101', customerId: 'mem-1', measuredDate: '2026-08-15', weightKg: 78.5, skeletalMuscleMassKg: 33.2, bodyFatPercent: 23.5, heightCm: 178 },
  { id: 'in-102', customerId: 'mem-1', measuredDate: '2026-09-15', weightKg: 77.2, skeletalMuscleMassKg: 34.0, bodyFatPercent: 20.8, heightCm: 178 },
  { id: 'in-103', customerId: 'mem-1', measuredDate: '2026-10-14', weightKg: 76.4, skeletalMuscleMassKg: 34.8, bodyFatPercent: 18.2, heightCm: 178 },
];

const INITIAL_WORKOUT_LOGS: WorkoutExerciseLog[] = [
  {
    exerciseName: '바벨 백스쿼트',
    targetMuscleGroup: '하체',
    sets: [
      { setNumber: 1, weightKg: 60, reps: 12, completed: true },
      { setNumber: 2, weightKg: 80, reps: 10, completed: true },
      { setNumber: 3, weightKg: 100, reps: 8, completed: true },
      { setNumber: 4, weightKg: 110, reps: 5, completed: true },
    ],
    totalVolumeKg: 2870,
  },
  {
    exerciseName: '루마니안 데드리프트',
    targetMuscleGroup: '등',
    sets: [
      { setNumber: 1, weightKg: 60, reps: 10, completed: true },
      { setNumber: 2, weightKg: 80, reps: 8, completed: true },
      { setNumber: 3, weightKg: 90, reps: 6, completed: true },
    ],
    totalVolumeKg: 1780,
  },
];

const INITIAL_MEAL_LOGS: DietMealLog[] = [
  {
    id: 'meal-1',
    customerId: 'mem-1',
    loggedDate: '2026-10-14',
    mealType: 'BREAKFAST',
    foodDescription: '오트밀 60g + 무가당 두유 + 삶은 계란 2개 + 사과 반쪽',
    trainerFeedback: '복합 탄수화물과 단백질 비율이 아주 좋습니다. 점심 전 수분 500ml 추가 섭취 권장합니다.',
    feedbackGivenAt: '2026-10-14 09:30',
  },
  {
    id: 'meal-2',
    customerId: 'mem-1',
    loggedDate: '2026-10-14',
    mealType: 'LUNCH',
    foodDescription: '현미밥 150g + 소고기 우둔살 150g + 구운 아스파라거스/버섯',
    trainerFeedback: '완벽한 린매스업 식단입니다! 하체 운동 2시간 전 훌륭한 에너지 공급원입니다.',
    feedbackGivenAt: '2026-10-14 13:10',
  },
];

export function DietBodyLogManagementView() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('mem-1');
  const [activeTab, setActiveTab] = useState<'inbody' | 'workout' | 'diet'>('inbody');

  const [inbodyRecords, setInbodyRecords] = useState<InbodyRecord[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_INBODY));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_INBODY_RECORDS;
  });

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutExerciseLog[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_WORKOUT));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_WORKOUT_LOGS;
  });

  const [mealLogs, setMealLogs] = useState<DietMealLog[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_MEALS));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_MEAL_LOGS;
  });

  // 인바디 신규 입력 폼 모달 상태
  const [isInbodyModalOpen, setIsInbodyModalOpen] = useState(false);
  const [newInbodyForm, setNewInbodyForm] = useState({
    measuredDate: new Date().toISOString().slice(0, 10),
    weightKg: 75.8,
    skeletalMuscleMassKg: 35.1,
    bodyFatPercent: 17.5,
    note: '공복 측정 (수분 섭취 전)',
  });

  // 트레이너 피드백 입력 상태 (mealId -> string)
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_INBODY), JSON.stringify(inbodyRecords));
  }, [inbodyRecords]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_WORKOUT), JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_MEALS), JSON.stringify(mealLogs));
  }, [mealLogs]);

  const currentMember = DEFAULT_MEMBERS.find((m) => m.id === selectedMemberId) || DEFAULT_MEMBERS[0];

  // 회원의 인바디 이력
  const memberInbodyList = useMemo(() => {
    return inbodyRecords.filter((r) => r.customerId === currentMember.id);
  }, [inbodyRecords, currentMember.id]);

  // 체성분 변화 추이 순수 함수 분석
  const inbodyTrend = useMemo(() => {
    return analyzeBodyCompositionTrend(memberInbodyList);
  }, [memberInbodyList]);

  // BMI 계산
  const bmiInfo = useMemo(() => {
    if (!inbodyTrend?.latestRecord) return null;
    return calculateBmi(inbodyTrend.latestRecord.weightKg, currentMember.heightCm);
  }, [inbodyTrend, currentMember.heightCm]);

  // 오늘 운동 총 볼륨 합산
  const totalWorkoutVolume = useMemo(() => {
    return workoutLogs.reduce((acc, ex) => acc + ex.totalVolumeKg, 0);
  }, [workoutLogs]);

  // 인바디 측정치 저장 핸들러
  const handleSaveInbody = () => {
    const record: InbodyRecord = {
      id: `in-${Date.now()}`,
      customerId: currentMember.id,
      measuredDate: newInbodyForm.measuredDate,
      weightKg: Number(newInbodyForm.weightKg),
      skeletalMuscleMassKg: Number(newInbodyForm.skeletalMuscleMassKg),
      bodyFatPercent: Number(newInbodyForm.bodyFatPercent),
      heightCm: currentMember.heightCm,
      note: newInbodyForm.note,
    };

    setInbodyRecords([...inbodyRecords, record]);
    setIsInbodyModalOpen(false);
    showToast('새로운 인바디 측정치가 성공적으로 기록되었습니다.', 'success');
  };

  // 트레이너 피드백 등록 핸들러
  const handleSendFeedback = (mealId: string) => {
    const comment = feedbackDrafts[mealId]?.trim();
    if (!comment) return;

    setMealLogs((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? {
              ...m,
              trainerFeedback: comment,
              feedbackGivenAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : m
      )
    );

    setFeedbackDrafts((prev) => ({ ...prev, [mealId]: '' }));
    showToast('회원님께 1:1 식단 피드백 코멘트가 전송되었습니다.', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 회원 정보 및 핵심 체성분 헤더 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="font-bold text-lg text-slate-900 bg-transparent border-b border-dashed border-slate-300 pb-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {DEFAULT_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} 회원님 ({m.trainerName})
                    </option>
                  ))}
                </select>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                  신장 {currentMember.heightCm}cm
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                목표: <span className="font-semibold text-slate-700">{currentMember.targetGoal}</span>
              </p>
            </div>
          </div>

          {/* 서브 탭 전환 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inbody')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'inbody'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>인바디 체성분</span>
            </button>
            <button
              onClick={() => setActiveTab('workout')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'workout'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>운동 루틴 일지</span>
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'diet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>식단 1:1 피드백</span>
            </button>
          </div>
        </div>

        {/* 최신 체성분 핵심 지표 카드 */}
        {inbodyTrend && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400">현재 체중</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {inbodyTrend.latestRecord.weightKg} <span className="text-xs font-medium">kg</span>
              </p>
              <span className={`text-[10px] font-bold ${inbodyTrend.weightDeltaKg < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                직전 대비 {inbodyTrend.weightDeltaKg > 0 ? '+' : ''}{inbodyTrend.weightDeltaKg}kg
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400">골격근량</span>
              <p className="text-xl font-black text-indigo-600 mt-0.5">
                {inbodyTrend.latestRecord.skeletalMuscleMassKg} <span className="text-xs font-medium">kg</span>
              </p>
              <span className="text-[10px] font-bold text-indigo-600">
                직전 대비 +{inbodyTrend.muscleDeltaKg}kg
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400">체지방률</span>
              <p className="text-xl font-black text-rose-500 mt-0.5">
                {inbodyTrend.latestRecord.bodyFatPercent} <span className="text-xs font-medium">%</span>
              </p>
              <span className="text-[10px] font-bold text-emerald-600">
                직전 대비 {inbodyTrend.bodyFatDeltaPercent}%
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400">BMI 지수</span>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {bmiInfo?.bmi} <span className="text-xs font-bold text-emerald-600">({bmiInfo?.statusLabel})</span>
              </p>
              <span className="text-[10px] text-slate-400">신장 대비 최적</span>
            </div>
          </div>
        )}
      </div>

      {/* 1. 인바디 탭 */}
      {activeTab === 'inbody' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">인바디 체성분 측정 이력 및 변화 분석</h2>
              <p className="text-xs text-slate-500">
                정기적인 측정을 통해 골격근 증가와 체지방 감소 추이를 모니터링합니다.
              </p>
            </div>
            <button
              onClick={() => setIsInbodyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>새 측정치 입력</span>
            </button>
          </div>

          {/* 트레이너 종합 분석 코멘트 */}
          {inbodyTrend && (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">체성분 변화 분석 리포트</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{inbodyTrend.evaluationSummary}</p>
                <p className="text-xs text-slate-500 mt-1">
                  최초 등록일 대비 누적 체중 변화: <span className="font-bold text-slate-700">{inbodyTrend.totalWeightDeltaKg}kg</span>
                </p>
              </div>
            </div>
          )}

          {/* 측정 이력 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">측정일자</th>
                  <th className="py-3 px-4">체중 (kg)</th>
                  <th className="py-3 px-4">골격근량 (kg)</th>
                  <th className="py-3 px-4">체지방률 (%)</th>
                  <th className="py-3 px-4">측정 메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberInbodyList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-all">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{rec.measuredDate}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{rec.weightKg} kg</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{rec.skeletalMuscleMassKg} kg</td>
                    <td className="py-3.5 px-4 font-bold text-rose-500">{rec.bodyFatPercent} %</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{rec.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. 운동 루틴 탭 */}
      {activeTab === 'workout' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">오늘의 운동 루틴 & 부하 볼륨 일지</h2>
              <p className="text-xs text-slate-500">
                세트별 중량(kg)과 횟수(reps)를 기록하고 총 부하 볼륨을 자동 산출합니다.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
              <span>오늘 총 볼륨:</span>
              <span className="text-emerald-400 font-black">{totalWorkoutVolume.toLocaleString()} kg</span>
            </div>
          </div>

          <div className="space-y-4">
            {workoutLogs.map((ex, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      {ex.targetMuscleGroup}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{ex.exerciseName}</h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">
                    종목 볼륨: {ex.totalVolumeKg.toLocaleString()} kg
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ex.sets.map((s) => (
                    <div
                      key={s.setNumber}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                          {s.setNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {s.weightKg}kg × {s.reps}회
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 식단 탭 */}
      {activeTab === 'diet' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">식단 사진 & 트레이너 1:1 피드백 코멘트</h2>
            <p className="text-xs text-slate-500">
              회원이 업로드한 끼니별 식단에 대해 맞춤 피드백과 영양 조언을 제공합니다.
            </p>
          </div>

          <div className="space-y-4">
            {mealLogs.map((meal) => {
              const draft = feedbackDrafts[meal.id] ?? '';

              return (
                <div key={meal.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {meal.mealType}
                      </span>
                      <span className="text-xs text-slate-400">{meal.loggedDate}</span>
                    </div>
                    {meal.trainerFeedback && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>피드백 완료</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-800">{meal.foodDescription}</p>

                  {/* 트레이너 피드백 말풍선 */}
                  {meal.trainerFeedback ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-800">
                        <span>💬 {currentMember.trainerName} 코멘트</span>
                        <span className="text-[10px] text-emerald-600">{meal.feedbackGivenAt}</span>
                      </div>
                      <p className="text-slate-700 font-medium">{meal.trainerFeedback}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="트레이너 피드백 코멘트 입력..."
                        value={draft}
                        onChange={(e) =>
                          setFeedbackDrafts({ ...feedbackDrafts, [meal.id]: e.target.value })
                        }
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleSendFeedback(meal.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        전송
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 인바디 입력 모달 */}
      {isInbodyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">
              인바디 측정치 등록 ({currentMember.name} 회원님)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">측정 일자</label>
                <input
                  type="date"
                  value={newInbodyForm.measuredDate}
                  onChange={(e) => setNewInbodyForm({ ...newInbodyForm, measuredDate: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">체중 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newInbodyForm.weightKg}
                    onChange={(e) => setNewInbodyForm({ ...newInbodyForm, weightKg: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">골격근 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newInbodyForm.skeletalMuscleMassKg}
                    onChange={(e) => setNewInbodyForm({ ...newInbodyForm, skeletalMuscleMassKg: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-sm font-bold text-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">체지방 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newInbodyForm.bodyFatPercent}
                    onChange={(e) => setNewInbodyForm({ ...newInbodyForm, bodyFatPercent: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-sm font-bold text-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">측정 메모</label>
                <input
                  type="text"
                  placeholder="예: 공복 측정, 하체 운동 후"
                  value={newInbodyForm.note}
                  onChange={(e) => setNewInbodyForm({ ...newInbodyForm, note: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <button
                onClick={() => setIsInbodyModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveInbody}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DietBodyLogManagementView;
