import React, { useMemo } from 'react';
import {
  resolveTodayBirthdayStudents,
  resolveTodayPaymentBriefing,
  buildDailyOneLineSummary,
  type TodayAttendanceBriefing,
  type TodayCareAlertBriefing,
  type BriefingStudentLike,
  type BriefingInvoiceLike,
} from './pianoTodayBriefingHelpers';
import { Calendar, Cake, CreditCard, AlertTriangle, ArrowRight, BarChart2 } from 'lucide-react';
import type { NavTab } from '@/context/AppContext';

export interface PianoDirector3SecBriefingCardProps {
  students: BriefingStudentLike[];
  invoices: BriefingInvoiceLike[];
  todayIso: string;
  attendanceCounts: {
    total: number;
    present: number;
    unchecked: number;
    absent: number;
  };
  makeupPendingCount: number;
  onNavigate: (tab: NavTab) => void;
  /** false면 수납·미납 브리핑 타일 숨김 (사업주 전용) */
  showFinance?: boolean;
}

/**
 * 일일 운영 현황 요약 카드 (Linear / Toss 스타일의 차분하고 단정한 B2B ERP)
 */
export const PianoDirector3SecBriefingCard: React.FC<PianoDirector3SecBriefingCardProps> = ({
  students,
  invoices,
  todayIso,
  attendanceCounts,
  makeupPendingCount,
  onNavigate,
  showFinance = true,
}) => {
  // 1. 오늘 생일 원생
  const birthdays = useMemo(
    () => resolveTodayBirthdayStudents(students, todayIso),
    [students, todayIso]
  );

  // 2. 오늘 수강료 결제 & 미납 브리핑
  const payment = useMemo(
    () => resolveTodayPaymentBriefing(students, invoices, todayIso),
    [students, invoices, todayIso]
  );

  // 3. 오늘 출결 브리핑
  const attendance: TodayAttendanceBriefing = useMemo(
    () => ({
      totalExpected: attendanceCounts.total,
      presentCount: attendanceCounts.present,
      uncheckedCount: attendanceCounts.unchecked,
      absentCount: attendanceCounts.absent,
    }),
    [attendanceCounts]
  );

  // 4. 안심 케어 / 보강 주의
  const careAlert: TodayCareAlertBriefing = useMemo(
    () => ({
      makeupPendingCount,
      absentCount: attendanceCounts.absent,
      needsAttentionCount: makeupPendingCount + attendanceCounts.absent,
    }),
    [makeupPendingCount, attendanceCounts.absent]
  );

  // 5. 3초 한줄 브리핑 멘트
  const oneLineSummary = useMemo(
    () => buildDailyOneLineSummary(attendance, birthdays, payment, careAlert),
    [attendance, birthdays, payment, careAlert]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* 헤더 및 한줄 브리핑 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80">
            <BarChart2 className="w-4 h-4 text-slate-700" strokeWidth={1.5} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>오늘의 운영 현황</span>
            </h3>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-snug font-medium line-clamp-2 sm:line-clamp-1 max-w-xl">
          {oneLineSummary}
        </p>
      </div>

      {/* 핵심 브리핑 지표 카드 그리드 (재무 타일은 사업주만) */}
      <div
        className={`grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-3.5 ${
          showFinance ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        {/* 1. 출결 / 등원 예정 */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg p-3 sm:p-3.5 cursor-pointer transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                <span>오늘 등원 예정</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              {attendance.totalExpected}
              <span className="text-xs font-normal text-slate-500 ml-1">명</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 mt-2 font-medium flex items-center gap-1.5">
            <span className="text-emerald-700 font-semibold">출석 {attendance.presentCount}</span>
            <span className="text-slate-300">·</span>
            <span>미체크 {attendance.uncheckedCount}</span>
          </div>
        </div>

        {/* 2. 오늘 생일 원생 */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg p-3 sm:p-3.5 cursor-pointer transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                <span>오늘 생일 원생</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              {birthdays.length > 0 ? (
                <span className="text-slate-900 flex items-center gap-1">
                  <span>{birthdays[0].name}</span>
                  {birthdays.length > 1 && (
                    <span className="text-xs font-normal text-slate-500">
                      외 {birthdays.length - 1}명
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm sm:text-base font-normal text-slate-400">오늘 없음</span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium truncate">
            {birthdays.length > 0
              ? '축하 메시지를 전달할 수 있습니다'
              : '평화로운 일상 레슨 진행 중'}
          </div>
        </div>

        {/* 3. 오늘 수강료 결제 & 미납 (사업주 전용) */}
        {showFinance ? (
          <div
            onClick={() => onNavigate('unpaid')}
            className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg p-3 sm:p-3.5 cursor-pointer transition-colors flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                  <span>수강료 납부일</span>
                </span>
                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {payment.todayDueCount}
                <span className="text-xs font-normal text-slate-500 ml-1">명 납부일</span>
              </div>
            </div>
            <div className="text-[11px] mt-2 font-medium flex items-center gap-1 truncate">
              {payment.totalUnpaidCount > 0 ? (
                <span className="text-amber-700 font-semibold">
                  미납 {payment.totalUnpaidCount}건 ({payment.totalUnpaidAmount.toLocaleString()}원)
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">전체 완납 완료</span>
              )}
            </div>
          </div>
        ) : null}

        {/* 4. 안심 케어 / 보강 주의 */}
        <div
          onClick={() => onNavigate('makeups')}
          className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg p-3 sm:p-3.5 cursor-pointer transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                <span>보강 및 결석 케어</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              {careAlert.makeupPendingCount}
              <span className="text-xs font-normal text-slate-500 ml-1">명 대기</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 mt-2 font-medium truncate">
            {careAlert.makeupPendingCount > 0 ? (
              <span className="text-amber-700 font-semibold">보강 대기 {careAlert.makeupPendingCount}명</span>
            ) : (
              '보강 대기 원생 없음 (원활)'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
