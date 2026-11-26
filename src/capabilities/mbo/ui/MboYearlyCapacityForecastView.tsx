import React, { useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  calculateYearlyCapacityForecast,
  type WorkloadThresholds,
  type YearlyCapacityForecastInput,
} from '../domain/workloadCapacityEngine';

interface MboYearlyCapacityForecastViewProps {
  thresholds?: WorkloadThresholds;
}

const SAMPLE_FORECAST_INPUTS: YearlyCapacityForecastInput[] = [
  {
    departmentId: 'dept-dev',
    departmentName: '플랫폼개발팀',
    headcount: 6,
    workingWeeksPerYear: 50,
    hoursPerWeekPerPerson: 40,
    totalPlannedProjectHours: 8600, // 6 * 50 * 40 = 12,000h -> 71.6% (Green)
  },
  {
    departmentId: 'dept-ops',
    departmentName: '사업운영팀',
    headcount: 4,
    workingWeeksPerYear: 50,
    hoursPerWeekPerPerson: 40,
    totalPlannedProjectHours: 6400, // 4 * 50 * 40 = 8,000h -> 80% (Yellow)
  },
  {
    departmentId: 'dept-cs',
    departmentName: '고객지원팀',
    headcount: 3,
    workingWeeksPerYear: 50,
    hoursPerWeekPerPerson: 40,
    totalPlannedProjectHours: 5700, // 3 * 50 * 40 = 6,000h -> 95% (Red)
  },
];

export const MboYearlyCapacityForecastView: React.FC<MboYearlyCapacityForecastViewProps> = ({
  thresholds = DEFAULT_WORKLOAD_THRESHOLDS,
}) => {
  const forecastResults = useMemo(() => {
    return SAMPLE_FORECAST_INPUTS.map((input) =>
      calculateYearlyCapacityForecast(input, thresholds)
    );
  }, [thresholds]);

  const summary = useMemo(() => {
    const totalHeadcount = forecastResults.reduce((acc, c) => acc + c.headcount, 0);
    const totalAvail = forecastResults.reduce((acc, c) => acc + c.totalAvailableHours, 0);
    const totalPlanned = forecastResults.reduce((acc, c) => acc + c.totalPlannedProjectHours, 0);
    const avgUtil = totalAvail > 0 ? Math.round((totalPlanned / totalAvail) * 100) : 0;
    const redCount = forecastResults.filter((f) => f.trafficLight === 'red').length;

    return { totalHeadcount, totalAvail, totalPlanned, avgUtil, redCount };
  }, [forecastResults]);

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        부서별 연간 캐퍼시티는 샘플 데이터 기반입니다. 실제 headcount·목표 시간은 조직·MBO 연동 후 반영됩니다.
      </p>
      {/* 헤더 안내 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              연간 MBO 목표 대비 가용 캐퍼시티 예측 대사
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Capacity vs Demand
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            조직의 연간 MBO 프로젝트 계획 투입 시간과 부서별 가용 인력 시간을 대사하여 병목 및 과부하 위험을 선제 진단합니다.
          </p>
        </div>
      </div>

      {/* 요약 메트릭 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>총 인원 수</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.totalHeadcount}명
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>연간 총 가용 시간</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.totalAvail.toLocaleString()}시간
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>연간 계획 목표 투입</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-indigo-400">
            {summary.totalPlanned.toLocaleString()}시간
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>전사 평균 가동률</span>
            {summary.redCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary.avgUtil}%
            </span>
            <span className="text-xs text-slate-400">
              ({summary.redCount > 0 ? `${summary.redCount}개 부서 과부하` : '정상'})
            </span>
          </div>
        </div>
      </div>

      {/* 부서별 대사 리스트 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            부서별 연간 가용 역량 대사표
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">부서명</th>
                <th className="px-6 py-3 font-semibold">인원</th>
                <th className="px-6 py-3 font-semibold">연간 가용 시간</th>
                <th className="px-6 py-3 font-semibold">목표 계획 시간</th>
                <th className="px-6 py-3 font-semibold">가동률</th>
                <th className="px-6 py-3 font-semibold">잔여/부족 캐퍼시티</th>
                <th className="px-6 py-3 font-semibold">진단 및 권고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {forecastResults.map((row) => {
                const isRed = row.trafficLight === 'red';
                const isYellow = row.trafficLight === 'yellow';

                const badgeBg = isRed
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : isYellow
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

                return (
                  <tr key={row.departmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {row.departmentName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {row.headcount}명
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {row.totalAvailableHours.toLocaleString()}h
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-indigo-400">
                      {row.totalPlannedProjectHours.toLocaleString()}h
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${badgeBg}`}>
                        {row.trafficLight === 'red' && '🔴'}
                        {row.trafficLight === 'yellow' && '🟡'}
                        {row.trafficLight === 'green' && '🟢'}
                        {row.utilizationRatePercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {row.surplusOrDeficitHours >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{row.surplusOrDeficitHours.toLocaleString()}h 여유
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          {row.surplusOrDeficitHours.toLocaleString()}h 초과
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{row.recommendation}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
