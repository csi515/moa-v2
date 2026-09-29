import { StorageService } from '@/services/storage';
import type { ClassItem, Student, TuitionInvoice } from '@/types';
import type { Textbook, TextbookSale } from '@/types';

export interface DirectorDashboardData {
  stats: ReturnType<typeof StorageService.getDashboardStats>;
  tbStats: ReturnType<typeof StorageService.getTextbookStats>;
  lowStockBooks: Textbook[];
  recentSales: TextbookSale[];
  students: Student[];
  recentInvoices: TuitionInvoice[];
  unpaidStats: ReturnType<typeof StorageService.getUnifiedUnpaidStats>;
  makeupPendingCount: number;
  currentMonthLabel: string;
  hasRevenueData: boolean;
  hasStudentTrendData: boolean;
  hasTuitionData: boolean;
  hasClassData: boolean;
}

/**
 * @legacy 구 원장 대시보드(통계·차트). 현재 홈은 DirectorTodayHome + useDirectorTodayDashboard.
 * 참조·회귀용으로 유지. 신규 UI는 Today* 경로를 사용한다.
 */
export function useDirectorDashboard(): DirectorDashboardData {
  const stats = StorageService.getDashboardStats();
  const tbStats = StorageService.getTextbookStats();
  const lowStockBooks = StorageService.getLowStockTextbooks();
  const recentSales = StorageService.getTextbookSales().slice(0, 4);
  const students = StorageService.getStudents();
  const recentInvoices = StorageService.getUnpaidInvoices().slice(0, 3);
  const unpaidStats = StorageService.getUnifiedUnpaidStats();
  const makeupPendingCount = StorageService.getMakeupItems().filter((item) => item.status === 'pending').length;

  const currentMonthLabel = `${parseInt(stats.currentYearMonth.slice(5, 7), 10)}월`;

  return {
    stats,
    tbStats,
    lowStockBooks,
    recentSales,
    students,
    recentInvoices,
    unpaidStats,
    makeupPendingCount,
    currentMonthLabel,
    hasRevenueData: stats.revenueTrend.some((row) => row.매출 > 0 || row.지출 > 0),
    hasStudentTrendData: stats.studentTrend.some((row) => row.학생수 > 0),
    hasTuitionData: stats.totalBilledThisMonth > 0,
    hasClassData: stats.classDistribution.length > 0,
  };
}

export type TodayClassItem = ClassItem & { teacherName: string };
