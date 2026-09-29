import React from 'react';
import type { NavTab } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';
import {
  Users,
  CreditCard,
  TrendingUp,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import type { DirectorDashboardData } from './useDirectorDashboard';

interface DirectorDashboardChartsProps {
  stats: DirectorDashboardData['stats'];
  hasRevenueData: boolean;
  hasStudentTrendData: boolean;
  hasTuitionData: boolean;
  hasClassData: boolean;
  setActiveTab: (tab: NavTab) => void;
}

export const DirectorDashboardCharts: React.FC<DirectorDashboardChartsProps> = ({
  stats,
  hasRevenueData,
  hasStudentTrendData,
  hasTuitionData,
  hasClassData,
  setActiveTab,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
    {/* Chart 1: Revenue vs Expense Trend (6 Months) */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-bold text-slate-800 text-base">
            최근 6개월 매출 및 지출 추이
          </h4>
          <p className="text-xs text-slate-400">수강료 수납액과 운영 지출 비교</p>
        </div>
        <button
          onClick={() => setActiveTab('tuition')}
          className="text-xs text-indigo-600 font-semibold flex items-center hover:underline"
        >
          상세 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-64 sm:h-72 xl:h-80 w-full">
        {hasRevenueData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `${val / 10000}만`}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: any) => formatCurrency(Number(val))}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="매출" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="지출" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <TrendingUp className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-bold text-slate-600 text-sm">아직 매출 데이터가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">학생 등록 후 수강료 청구·수납을 시작하면 추이가 표시됩니다.</p>
            <button
              onClick={() => setActiveTab('tuition')}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              수강료 관리로 이동
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Chart 2: Student Count Growth Trend */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-bold text-slate-800 text-base">
            최근 6개월 학생 수 추이
          </h4>
          <p className="text-xs text-slate-400">지속적인 재학생 등록 성장 추세</p>
        </div>
        <button
          onClick={() => setActiveTab('students')}
          className="text-xs text-indigo-600 font-semibold flex items-center hover:underline"
        >
          학생목록 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-64 sm:h-72 xl:h-80 w-full">
        {hasStudentTrendData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.studentTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                formatter={(val: any) => [`${val}명`, '학생수']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="학생수"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-bold text-slate-600 text-sm">아직 등록된 학생이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">첫 학생을 등록하면 성장 추이가 표시됩니다.</p>
            <button
              onClick={() => setActiveTab('students')}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              학생 등록하러 가기
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Chart 3: Unpaid vs Paid Tuition Breakdown */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base">
            이번 달 수강료 수납 현황
          </h4>
          <p className="text-xs text-slate-400">총 청구액 대비 수납 완료 및 미납 현황</p>
        </div>
        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
          수납률 {stats.collectionRate}%
        </span>
      </div>
      <div className="h-64 sm:h-72 w-full flex items-center justify-center">
        {hasTuitionData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.unpaidBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {stats.unpaidBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => formatCurrency(Number(val))}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center px-4">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-600 text-sm">이번 달 청구 내역이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">학생 등록 후 월별 수강료를 생성해 보세요.</p>
          </div>
        )}
      </div>
    </div>

    {/* Chart 4: Students per Class distribution */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base">
            반별 학생 수 및 정원 현황
          </h4>
          <p className="text-xs text-slate-400">현재 수강 인원과 반별 최대 정원</p>
        </div>
        <button
          onClick={() => setActiveTab('classes')}
          className="text-xs text-indigo-600 font-semibold flex items-center hover:underline"
        >
          반 관리 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-64 sm:h-72 xl:h-80 w-full">
        {hasClassData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.classDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(val: any, name: string) => [`${val}명`, name === 'studentsCount' ? '현재학생' : '정원']}
                labelFormatter={(_, payload) => (payload[0]?.payload as any)?.fullName || ''}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend
                formatter={(value) => (value === 'studentsCount' ? '현재학생' : '최대정원')}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="studentsCount" fill="#4f46e5" name="studentsCount" radius={[4, 4, 0, 0]} />
              <Bar dataKey="capacity" fill="#cbd5e1" name="capacity" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <GraduationCap className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-bold text-slate-600 text-sm">개설된 반이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">반을 개설하고 학생을 배정해 보세요.</p>
            <button
              onClick={() => setActiveTab('classes')}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              반 관리로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
