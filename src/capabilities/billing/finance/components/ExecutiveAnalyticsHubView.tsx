import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  CalendarDays,
  CreditCard,
  Percent,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader, SegmentedControl } from '@/shared/components';

// 가상 또는 스토리지 집계 데이터 기반 분석 데이터 모델
export interface MonthlyTrendPoint {
  month: string;
  totalStudents: number;
  newStudents: number;
  withdrawnStudents: number;
  revenue: number; // 단위: 만원
}

export interface PaymentDistributionItem {
  method: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface HeatmapCell {
  day: string; // '월' | '화' | '수' | '목' | '금' | '토'
  hour: number; // 13 ~ 19
  utilization: number; // 0 ~ 100 (%)
}

const SAMPLE_MONTHLY_TREND: MonthlyTrendPoint[] = [
  { month: '6월', totalStudents: 38, newStudents: 4, withdrawnStudents: 1, revenue: 680 },
  { month: '7월', totalStudents: 42, newStudents: 6, withdrawnStudents: 2, revenue: 750 },
  { month: '8월', totalStudents: 45, newStudents: 5, withdrawnStudents: 2, revenue: 810 },
  { month: '9월', totalStudents: 47, newStudents: 4, withdrawnStudents: 2, revenue: 840 },
  { month: '10월', totalStudents: 52, newStudents: 7, withdrawnStudents: 2, revenue: 930 },
  { month: '11월', totalStudents: 56, newStudents: 6, withdrawnStudents: 2, revenue: 1010 },
];

const SAMPLE_PAYMENT_DISTRIBUTION: PaymentDistributionItem[] = [
  { method: '신용·체크카드', amount: 620, percentage: 61, color: '#4f46e5' }, // indigo-600
  { method: '계좌이체 (자동이체)', amount: 280, percentage: 28, color: '#06b6d4' }, // cyan-500
  { method: '지역화폐 (제로페이)', amount: 70, percentage: 7, color: '#10b981' }, // emerald-500
  { method: '기타·현금', amount: 40, percentage: 4, color: '#f59e0b' }, // amber-500
];

const DAYS = ['월', '화', '수', '목', '금', '토'] as const;
const HOURS = [13, 14, 15, 16, 17, 18, 19] as const;

// 요일/시간대별 연습실 가동률 시뮬레이션
const SAMPLE_HEATMAP: HeatmapCell[] = [
  // 월
  { day: '월', hour: 13, utilization: 25 },
  { day: '월', hour: 14, utilization: 60 },
  { day: '월', hour: 15, utilization: 85 },
  { day: '월', hour: 16, utilization: 95 },
  { day: '월', hour: 17, utilization: 90 },
  { day: '월', hour: 18, utilization: 75 },
  { day: '월', hour: 19, utilization: 40 },
  // 화
  { day: '화', hour: 13, utilization: 20 },
  { day: '화', hour: 14, utilization: 50 },
  { day: '화', hour: 15, utilization: 80 },
  { day: '화', hour: 16, utilization: 88 },
  { day: '화', hour: 17, utilization: 82 },
  { day: '화', hour: 18, utilization: 70 },
  { day: '화', hour: 19, utilization: 35 },
  // 수
  { day: '수', hour: 13, utilization: 30 },
  { day: '수', hour: 14, utilization: 65 },
  { day: '수', hour: 15, utilization: 92 },
  { day: '수', hour: 16, utilization: 98 },
  { day: '수', hour: 17, utilization: 95 },
  { day: '수', hour: 18, utilization: 80 },
  { day: '수', hour: 19, utilization: 45 },
  // 목
  { day: '목', hour: 13, utilization: 20 },
  { day: '목', hour: 14, utilization: 55 },
  { day: '목', hour: 15, utilization: 78 },
  { day: '목', hour: 16, utilization: 85 },
  { day: '목', hour: 17, utilization: 80 },
  { day: '목', hour: 18, utilization: 65 },
  { day: '목', hour: 19, utilization: 30 },
  // 금
  { day: '금', hour: 13, utilization: 40 },
  { day: '금', hour: 14, utilization: 70 },
  { day: '금', hour: 15, utilization: 88 },
  { day: '금', hour: 16, utilization: 92 },
  { day: '금', hour: 17, utilization: 85 },
  { day: '금', hour: 18, utilization: 72 },
  { day: '금', hour: 19, utilization: 35 },
  // 토
  { day: '토', hour: 13, utilization: 80 },
  { day: '토', hour: 14, utilization: 85 },
  { day: '토', hour: 15, utilization: 75 },
  { day: '토', hour: 16, utilization: 60 },
  { day: '토', hour: 17, utilization: 40 },
  { day: '토', hour: 18, utilization: 20 },
  { day: '토', hour: 19, utilization: 10 },
];

export const ExecutiveAnalyticsHubView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [trendMetric, setTrendMetric] = useState<'students' | 'revenue'>('students');
  const [selectedBar, setSelectedBar] = useState<number | null>(SAMPLE_MONTHLY_TREND.length - 1);

  // 최대값 계산 (스케일링용)
  const maxStudents = useMemo(
    () => Math.max(...SAMPLE_MONTHLY_TREND.map((t) => t.totalStudents)),
    []
  );
  const maxRevenue = useMemo(
    () => Math.max(...SAMPLE_MONTHLY_TREND.map((t) => t.revenue)),
    []
  );

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 pb-8'}>
      {!embedded && (
        <PageHeader
          density="compact"
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          title="경영 성과 분석"
          description="회원 증감 추이, 결제 수단 점유율 및 공간 가동률 분석"
        />
      )}

      {/* 1. 상단 핵심 KPI 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">회원 순증 (전월비)</span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +7.7%
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">56명</p>
          <p className="text-[11px] text-slate-400 mt-0.5">신규 6명 / 퇴원 2명 (순증 +4명)</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">이번 달 수납률</span>
            <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              목표 95%
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">92.4%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: '92.4%' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">피크타임 연습실 가동률</span>
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              수 16시
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">98.0%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">주간 평균 가동률 67.4%</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">월간 총 매출 (11월)</span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +8.6%
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">1,010만원</p>
          <p className="text-[11px] text-slate-400 mt-0.5">수강료 920만 + 교재 90만</p>
        </div>
      </div>

      {/* 2. 회원 & 매출 6개월 추세선 인터랙티브 차트 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>최근 6개월 성장 트렌드</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              막대를 탭하거나 마우스를 올리면 해당 월의 세부 수치를 조회할 수 있습니다.
            </p>
          </div>
          <SegmentedControl
            value={trendMetric}
            options={[
              { value: 'students', label: '회원 수 (명)' },
              { value: 'revenue', label: '매출액 (만원)' },
            ]}
            onChange={(v) => setTrendMetric(v as any)}
            className="w-full sm:w-auto"
          />
        </div>

        {/* 바 차트 시각화 */}
        <div className="pt-4 pb-2">
          <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 px-2 sm:px-6">
            {SAMPLE_MONTHLY_TREND.map((item, idx) => {
              const isSelected = selectedBar === idx;
              const val = trendMetric === 'students' ? item.totalStudents : item.revenue;
              const maxVal = trendMetric === 'students' ? maxStudents : maxRevenue;
              const heightPercent = Math.max(12, Math.round((val / maxVal) * 100));

              return (
                <div
                  key={item.month}
                  onClick={() => setSelectedBar(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* 상단 값 뱃지 */}
                  <span
                    className={`text-[10px] sm:text-xs font-bold transition-all mb-1.5 ${
                      isSelected ? 'text-indigo-600 scale-110 font-extrabold' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    {trendMetric === 'students' ? `${val}명` : `${val}만`}
                  </span>

                  {/* 바 본체 */}
                  <div className="w-full max-w-[48px] h-full flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-500 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                          : 'bg-slate-200 group-hover:bg-indigo-300'
                      }`}
                    />
                  </div>

                  {/* 월 라벨 */}
                  <span
                    className={`text-xs font-bold mt-2.5 transition-colors ${
                      isSelected ? 'text-indigo-900 font-extrabold' : 'text-slate-500'
                    }`}
                  >
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 선택된 월 세부 브레이크다운 */}
        {selectedBar !== null && (
          <div className="bg-indigo-50/60 rounded-xl p-3 sm:p-4 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-indigo-950 text-sm">
                {SAMPLE_MONTHLY_TREND[selectedBar].month} 세부 지표
              </span>
              <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                총 {SAMPLE_MONTHLY_TREND[selectedBar].totalStudents}명 재원
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <span>신규 입원: <strong className="text-emerald-700 font-bold">+{SAMPLE_MONTHLY_TREND[selectedBar].newStudents}명</strong></span>
              <span>퇴원/휴원: <strong className="text-rose-700 font-bold">-{SAMPLE_MONTHLY_TREND[selectedBar].withdrawnStudents}명</strong></span>
              <span>수납 총액: <strong className="text-indigo-950 font-bold">{SAMPLE_MONTHLY_TREND[selectedBar].revenue.toLocaleString()}만원</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 3. 하단 그리드: 결제 수단 비율(도넛) + 연습실 가동률 히트맵 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 결제 수단 비율 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              <span>수강료 결제 수단 비율</span>
            </h3>
            <span className="text-xs text-slate-400">당월 기준</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* SVG 도넛 차트 */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {(() => {
                  let accumulatedPercent = 0;
                  return SAMPLE_PAYMENT_DISTRIBUTION.map((item) => {
                    const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    return (
                      <circle
                        key={item.method}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold">카드 비중</span>
                <span className="text-base font-black text-slate-800">61%</span>
              </div>
            </div>

            {/* 범례 및 금액 */}
            <div className="flex-1 w-full space-y-2.5">
              {SAMPLE_PAYMENT_DISTRIBUTION.map((item) => (
                <div key={item.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-700">{item.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.amount}만원</span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 연습실 시간대별 가동률 히트맵 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>요일·시간대별 연습실 가동률</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">색상이 진할수록 혼잡한 시간대입니다.</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>여유</span>
              <div className="flex gap-0.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-100" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-200" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-400" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
              </div>
              <span>혼잡</span>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-center text-[11px]">
              <thead>
                <tr>
                  <th className="py-1 px-1 text-slate-400 font-bold w-10">시각</th>
                  {DAYS.map((d) => (
                    <th key={d} className="py-1 px-1 text-slate-600 font-bold">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HOURS.map((hr) => (
                  <tr key={hr}>
                    <td className="py-1 text-slate-400 font-mono text-[10px]">{hr}시</td>
                    {DAYS.map((d) => {
                      const cell = SAMPLE_HEATMAP.find((c) => c.day === d && c.hour === hr);
                      const rate = cell?.utilization ?? 0;

                      let bgClass = 'bg-slate-100 text-slate-400';
                      if (rate >= 90) bgClass = 'bg-indigo-600 text-white font-extrabold';
                      else if (rate >= 75) bgClass = 'bg-indigo-400 text-white font-bold';
                      else if (rate >= 50) bgClass = 'bg-indigo-200 text-indigo-900 font-semibold';
                      else if (rate >= 25) bgClass = 'bg-indigo-50 text-indigo-700';

                      return (
                        <td key={d} className="p-1">
                          <div
                            title={`${d}요일 ${hr}시 가동률: ${rate}%`}
                            className={`py-1 rounded-md transition-transform hover:scale-105 cursor-pointer ${bgClass}`}
                          >
                            {rate}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
