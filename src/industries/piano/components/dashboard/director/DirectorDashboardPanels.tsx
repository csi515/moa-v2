import React from 'react';
import type { NavTab } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';
import {
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Package,
} from 'lucide-react';
import type { DirectorDashboardData } from './useDirectorDashboard';

interface DirectorDashboardPanelsProps {
  stats: DirectorDashboardData['stats'];
  students: DirectorDashboardData['students'];
  recentInvoices: DirectorDashboardData['recentInvoices'];
  tbStats: DirectorDashboardData['tbStats'];
  recentSales: DirectorDashboardData['recentSales'];
  lowStockBooks: DirectorDashboardData['lowStockBooks'];
  currentMonthLabel: string;
  setActiveTab: (tab: NavTab) => void;
}

export const DirectorDashboardPanels: React.FC<DirectorDashboardPanelsProps> = ({
  stats,
  students,
  recentInvoices,
  tbStats,
  recentSales,
  lowStockBooks,
  currentMonthLabel,
  setActiveTab,
}) => (
  <>
    {/* Bottom Grid: Today's Class Schedule & Recent Activity / Unpaid List */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Today's Schedule Card */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">
              오늘의 수업 일정 ({stats.todayClasses.length}개 반)
            </h4>
          </div>
          <button
            onClick={() => setActiveTab('timetable')}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            주간 시간표 보기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.todayClasses.length === 0 ? (
            <div className="text-center py-8 col-span-full space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">오늘 예정된 정규 수업이 없습니다</p>
              <p className="text-xs text-slate-400">주간 시간표에서 다른 요일의 수업을 확인하세요</p>
            </div>
          ) : (
            stats.todayClasses.map((cls, idx) => {
              const enrolled = students.filter((s) => s.status === 'active' && s.classIds.includes(cls.id));
              const isFull = enrolled.length >= cls.capacity;
              const isCurrent = idx === 0; // Highlight first/active
              return (
                <div
                  key={cls.id}
                  className={`p-4 border rounded-xl flex flex-col gap-2 transition-all ${
                    isCurrent
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600 ring-offset-2'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {cls.startTime} - {cls.endTime}
                    </span>
                    <span className="text-xs text-slate-400">{cls.teacherName}</span>
                  </div>
                  <p className={`text-sm font-bold ${isCurrent ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {cls.name}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-slate-500">
                      정원: {enrolled.length}/{cls.capacity}명 {isFull && <span className="text-rose-500 font-bold">(만석)</span>}
                    </span>
                    <button
                      onClick={() => setActiveTab('attendance')}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                        isCurrent ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 border border-slate-200 hover:bg-indigo-50'
                      }`}
                    >
                      출결
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Lesson Notes & Quick Unpaid List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 text-base">
              미납 수강료 현황
            </h4>
            <button
              onClick={() => setActiveTab('unpaid')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              전체보기
            </button>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-600">미납된 수강료가 없습니다! ✨</p>
                <p className="text-xs text-slate-400">모든 학생이 정상 수납되었습니다</p>
              </div>
            ) : (
              recentInvoices.map((inv, i) => (
                <div
                  key={inv.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    i === 0
                      ? 'bg-rose-50 border-rose-100 text-rose-900'
                      : 'hover:bg-slate-50 border-transparent text-slate-800'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${i === 0 ? 'text-rose-900' : 'text-slate-800'}`}>
                      {inv.studentName}
                    </p>
                    <p className={`text-xs ${i === 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                      수납예정일: {inv.dueDate.slice(5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${i === 0 ? 'text-rose-900' : 'text-slate-800'}`}>
                      {formatCurrency(inv.unpaidAmount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => setActiveTab('unpaid')}
          className="w-full py-2.5 mt-4 text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-colors"
        >
          미납 통합 관리로 이동
        </button>
      </div>
    </div>
    {/* Textbook Sales & Stock Alerts Section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Textbook Sales Summary & Recent Sales */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">
                교재 판매 및 교재비 수납 현황
              </h4>
              <p className="text-xs text-slate-400">
                수강료와 분리되어 투명하게 관리되는 교재 판매 내역
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('textbooks')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              교재 관리 전체 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl mb-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">{currentMonthLabel} 판매 총액</span>
            <span className="font-bold text-slate-900 text-sm">
              {formatCurrency(tbStats.totalSalesAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">교재비 수납액</span>
            <span className="font-bold text-emerald-600 text-sm">
              {formatCurrency(tbStats.totalPaidAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">교재비 미납액</span>
            <span className="font-black text-rose-600 text-sm">
              {formatCurrency(tbStats.totalUnpaidAmount)}
            </span>
          </div>
        </div>

        {/* Recent Sales List */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-700">최근 교재 판매 이력</h5>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">등록된 교재 판매 내역이 없습니다</p>
              <p className="text-xs text-slate-400">교재 관리에서 교재를 등록하고 판매를 시작하세요</p>
            </div>
          ) : (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sale.studentName}</span>
                    <span className="text-slate-400">({sale.textbookTitle} {sale.quantity}권)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    판매일: {sale.saleDate} | 학부모: {sale.parentName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      sale.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : sale.status === 'partial'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {sale.status === 'paid'
                      ? '완납'
                      : sale.status === 'partial'
                      ? `일부미납 (${formatCurrency(sale.unpaidAmount)})`
                      : '미납'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Low Stock Warning Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">
                재고 부족 알림
              </h4>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {lowStockBooks.length}종 부족
            </span>
          </div>

          <div className="space-y-2.5">
            {lowStockBooks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  모든 교재의 재고가 충분합니다! ✨
                </p>
              </div>
            ) : (
              lowStockBooks.slice(0, 4).map((book) => {
                const isZero = book.stock <= 0;
                return (
                  <div
                    key={book.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isZero ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">{book.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {book.publisher} | 최소권장: {book.minStock}권
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-black text-sm block ${
                          isZero ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {book.stock}권 남음
                      </span>
                      <span className="text-[10px] text-rose-500 font-semibold">
                        {isZero ? '품절/발주요망' : '재고부족'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={() => setActiveTab('textbooks')}
          className="w-full py-2.5 mt-4 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Package className="w-3.5 h-3.5" />
          교재 입고 및 재고 조정하기
        </button>
      </div>
    </div>
  </>
);
