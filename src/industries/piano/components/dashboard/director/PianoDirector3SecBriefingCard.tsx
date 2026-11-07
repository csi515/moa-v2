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
import { Calendar, Cake, CreditCard, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
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
}

export const PianoDirector3SecBriefingCard: React.FC<PianoDirector3SecBriefingCardProps> = ({
  students,
  invoices,
  todayIso,
  attendanceCounts,
  makeupPendingCount,
  onNavigate,
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
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-700/50">
      {/* 헤더 및 한줄 브리핑 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-indigo-700/60">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>오늘의 학원 3초 브리핑</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                Daily Briefing
              </span>
            </h3>
          </div>
        </div>
        <p className="text-xs text-indigo-200/90 leading-snug font-medium line-clamp-2 sm:line-clamp-1 max-w-xl">
          {oneLineSummary}
        </p>
      </div>

      {/* 4대 핵심 브리핑 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-3.5">
        {/* 1. 출결 / 등원 예정 */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-indigo-400/40 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>오늘 등원 예정</span>
              </span>
              <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {attendance.totalExpected}
              <span className="text-xs font-bold text-indigo-300 ml-1">명</span>
            </div>
          </div>
          <div className="text-[11px] text-indigo-200/80 mt-2 font-medium flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">출석 {attendance.presentCount}</span>
            <span>·</span>
            <span>미체크 {attendance.uncheckedCount}</span>
          </div>
        </div>

        {/* 2. 오늘 생일 원생 */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-pink-400/40 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-pink-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5 text-pink-400" />
                <span>오늘 생일 원생</span>
              </span>
              <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {birthdays.length > 0 ? (
                <span className="text-pink-300 flex items-center gap-1">
                  <span>{birthdays[0].name}</span>
                  {birthdays.length > 1 && (
                    <span className="text-xs font-bold text-pink-200">
                      외 {birthdays.length - 1}명
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm sm:text-base font-bold text-white/60">오늘 없음</span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-pink-200/80 mt-2 font-medium truncate">
            {birthdays.length > 0
              ? '🎹 축하 메시지를 전해주세요!'
              : '평화로운 일상 레슨 진행 중'}
          </div>
        </div>

        {/* 3. 오늘 수강료 결제 & 미납 */}
        <div
          onClick={() => onNavigate('unpaid')}
          className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-amber-400/40 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-amber-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>수강료 납부일</span>
              </span>
              <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {payment.todayDueCount}
              <span className="text-xs font-bold text-amber-300 ml-1">명 납부일</span>
            </div>
          </div>
          <div className="text-[11px] text-amber-200/80 mt-2 font-medium flex items-center gap-1 truncate">
            {payment.totalUnpaidCount > 0 ? (
              <span className="text-rose-300 font-bold">
                미납 {payment.totalUnpaidCount}명 ({payment.totalUnpaidAmount.toLocaleString()}원)
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">전체 완납 완료</span>
            )}
          </div>
        </div>

        {/* 4. 안심 케어 / 보강 주의보 */}
        <div
          onClick={() => onNavigate('makeups')}
          className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-emerald-400/40 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-emerald-400" />
                <span>보강 및 결석 케어</span>
              </span>
              <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {careAlert.makeupPendingCount}
              <span className="text-xs font-bold text-emerald-300 ml-1">명 대기</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-200/80 mt-2 font-medium truncate">
            {careAlert.makeupPendingCount > 0
              ? '시간표 빈자리에 1클릭 보강 배치'
              : '보강 대기 원생 없음 (원활)'}
          </div>
        </div>
      </div>
    </div>
  );
};
