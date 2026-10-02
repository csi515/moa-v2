import type { Student, TuitionInvoice } from '../../types';
import type { StorageApi } from './helpers';
import { storageApi } from './storageApi';
import { pickUniqueDayAttendanceStatuses } from '../../core/attendance/dayAttendance';
import { todayIsoLocal, yearMonthLocal } from '../../shared/utils/localDate';
import { filterMonthlyBillingStudents } from '@/capabilities/billing/utils/billingMode';

type AttRow = { date: string; status: string; studentId?: string; classId?: string };

/** 대시보드 집계·월별 청구 일괄 생성 */
export function createDashboardStatsStorage(api: StorageApi) {
  return {
    getDashboardStats() {
      const students = (api.getStudents as () => Student[])();
      const classes = (api.getClasses as () => {
        id: string;
        name: string;
        daysOfWeek: string[];
        capacity: number;
        color?: string;
      }[])();
      const attendance = (api.getAttendance as () => AttRow[])();
      const invoices = (api.getInvoices as () => TuitionInvoice[])();
      const expenses = (api.getExpenses as () => { date: string; amount: number }[])();

      const currentYearMonth = yearMonthLocal();
      const todayStr = todayIsoLocal();
      const dayOfWeekIndex = new Date().getDay();
      const dayMap = ['일', '월', '화', '수', '목', '금', '토'] as const;
      const todayKoreanDay = dayMap[dayOfWeekIndex];

      const totalStudents = students.length;
      const activeStudents = students.filter((student) => student.status === 'active').length;
      const leaveStudents = students.filter((student) => student.status === 'leave').length;
      const withdrawnStudents = students.filter((student) => student.status === 'withdrawn').length;
      const newStudentsThisMonth = students.filter((student) =>
        student.joinDate.startsWith(currentYearMonth)
      ).length;

      const currentMonthInvoices = invoices.filter((invoice) => invoice.yearMonth === currentYearMonth);
      const totalBilledThisMonth = currentMonthInvoices.reduce(
        (sum, invoice) => sum + invoice.totalAmount,
        0
      );
      const totalPaidThisMonth = currentMonthInvoices.reduce(
        (sum, invoice) => sum + invoice.paidAmount,
        0
      );
      const totalUnpaidThisMonth = currentMonthInvoices.reduce(
        (sum, invoice) => sum + invoice.unpaidAmount,
        0
      );
      const unpaidStudentsCount = currentMonthInvoices.filter(
        (invoice) => invoice.status === 'unpaid' || invoice.status === 'partial'
      ).length;
      const collectionRate =
        totalBilledThisMonth > 0
          ? Math.round((totalPaidThisMonth / totalBilledThisMonth) * 100)
          : 100;

      const currentMonthExpenses = expenses.filter((expense) =>
        expense.date.startsWith(currentYearMonth)
      );
      const totalExpensesThisMonth = currentMonthExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const netProfitThisMonth = totalPaidThisMonth - totalExpensesThisMonth;

      const todayClasses = classes.filter((cls) =>
        cls.daysOfWeek.includes(todayKoreanDay as never)
      );
      const todayAttendance = attendance.filter((record) => record.date === todayStr);
      const { present: todayPresent, absent: todayAbsent, late: todayLate } =
        pickUniqueDayAttendanceStatuses(todayAttendance);

      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        months.push(`${y}-${m}`);
      }

      const revenueTrend = months.map((yearMonth) => {
        const monthInvoices = invoices.filter((invoice) => invoice.yearMonth === yearMonth);
        const paid = monthInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
        const billed = monthInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        const monthExpenses = expenses
          .filter((expense) => expense.date.startsWith(yearMonth))
          .reduce((sum, expense) => sum + expense.amount, 0);
        const label = `${yearMonth.slice(5)}월`;
        return {
          yearMonth,
          month: label,
          매출: paid,
          지출: monthExpenses,
          청구액: billed,
        };
      });

      const studentTrend = months.map((yearMonth) => {
        const label = `${yearMonth.slice(5)}월`;
        const [year, month] = yearMonth.split('-').map(Number);
        const monthEnd = `${yearMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
        const activeAtMonth = students.filter((student) => {
          if (student.joinDate > monthEnd) return false;
          if (student.status === 'withdrawn' && student.leaveDate && student.leaveDate <= monthEnd) {
            return false;
          }
          return true;
        }).length;
        const newCount = students.filter((student) => student.joinDate.startsWith(yearMonth)).length;
        return {
          month: label,
          학생수: activeAtMonth,
          신규: newCount,
        };
      });

      const unpaidBreakdown = [
        { name: '수납 완료', value: totalPaidThisMonth, color: '#10b981' },
        { name: '미납액', value: totalUnpaidThisMonth, color: '#ef4444' },
      ];

      const classDistribution = classes.map((cls) => {
        const enrolled = students.filter(
          (student) => student.status === 'active' && student.classIds.includes(cls.id)
        ).length;
        return {
          name: cls.name.length > 10 ? `${cls.name.slice(0, 9)}…` : cls.name,
          fullName: cls.name,
          studentsCount: enrolled,
          capacity: cls.capacity,
          color: cls.color || '#3b82f6',
        };
      });

      return {
        totalStudents,
        activeStudents,
        leaveStudents,
        withdrawnStudents,
        newStudentsThisMonth,
        totalPaidThisMonth,
        totalUnpaidThisMonth,
        totalBilledThisMonth,
        unpaidStudentsCount,
        collectionRate,
        todayClassesCount: todayClasses.length,
        todayPresent,
        todayAbsent,
        todayLate,
        totalExpensesThisMonth,
        netProfitThisMonth,
        revenueTrend,
        studentTrend,
        unpaidBreakdown,
        classDistribution,
        todayClasses,
        currentYearMonth,
      };
    },

    batchGenerateMonthlyInvoices(yearMonth: string): number {
      const students = filterMonthlyBillingStudents(
        (api.getStudents as () => Student[])(),
        { activeOnly: true }
      );
      const existingInvoices = (api.getInvoices as () => TuitionInvoice[])();
      let generatedCount = 0;

      students.forEach((student) => {
        const alreadyHas = existingInvoices.some(
          (invoice) => invoice.studentId === student.id && invoice.yearMonth === yearMonth
        );
        if (alreadyHas) return;

        const fee = student.tuitionFee || 180000;
        const dueDay = String(student.paymentDay || 10).padStart(2, '0');
        const dueDate = `${yearMonth}-${dueDay}`;

        (api.saveInvoice as (inv: Omit<TuitionInvoice, 'id'>) => void)({
          studentId: student.id,
          studentName: student.name,
          yearMonth,
          baseTuition: fee,
          discountAmount: 0,
          additionalAmount: 0,
          totalAmount: fee,
          paidAmount: 0,
          unpaidAmount: fee,
          dueDate,
          status: 'unpaid',
        });
        generatedCount += 1;
      });

      return generatedCount;
    },
  };
}

/** 대시보드 집계 persist helper. 교차 도메인 읽기. */
export const dashboardStatsStorage = createDashboardStatsStorage(storageApi);
