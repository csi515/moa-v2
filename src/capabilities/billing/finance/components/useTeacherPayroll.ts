import React, { useMemo, useState } from 'react';
import { showToast, openConfirmDialog, triggerRefresh } from '@/shared/feedback/uiFeedback';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { LessonService } from '@/core/lessons';
import { formatCurrency } from '@/utils/formatters';
import { buildYearMonthOptions, toLocalYearMonth } from '@/capabilities/billing/finance/categories';
import {
  buildPayrollExpenseDraft,
  buildTeacherPayrollRows,
  computePayrollAmount,
  getTeacherPayrollSettlements,
  linkPayrollSettlementExpense,
  resolveEditableQuantity,
  saveTeacherPayrollSettlement,
  summarizePayrollRows,
  type PayrollAdjustmentDraft,
  type TeacherPayrollRow,
} from '@/capabilities/billing/finance/teacherPayroll';

export function useTeacherPayroll() {
  const { setActiveTab } = useApp();
  const { industry } = usePermissions();
  const refreshKey = useStorageRefresh('finance');

  const [selectedMonth, setSelectedMonth] = useState(() => toLocalYearMonth());
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [adjustmentOverrides, setAdjustmentOverrides] = useState<
    Record<string, PayrollAdjustmentDraft>
  >({});
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const teachers = useMemo(() => rosterStorage.getTeachers(), [refreshKey]);
  const lessons = useMemo(() => LessonService.getLessonRecords(), [refreshKey]);
  const expenses = useMemo(() => billingStorage.getExpenses(), [refreshKey]);
  const settlements = useMemo(() => getTeacherPayrollSettlements(), [refreshKey]);

  const monthOptions = useMemo(
    () =>
      buildYearMonthOptions({
        dataYearMonths: [
          ...lessons.map((l) => l.date?.slice(0, 7)),
          ...expenses
            .filter((e) => e.settlementYearMonth || e.category === 'teacher_salary')
            .map((e) => e.settlementYearMonth || e.date?.slice(0, 7)),
          ...settlements.map((s) => s.yearMonth),
        ],
      }),
    [lessons, expenses, settlements]
  );

  const rows = useMemo(
    () =>
      buildTeacherPayrollRows({
        teachers,
        lessons,
        expenses,
        settlements,
        yearMonth: selectedMonth,
        quantityOverrides,
        adjustmentOverrides,
      }),
    [teachers, lessons, expenses, settlements, selectedMonth, quantityOverrides, adjustmentOverrides]
  );

  const selectedRow = rows.find((r) => r.teacherId === selectedTeacherId) || null;
  const totals = useMemo(() => summarizePayrollRows(rows), [rows]);

  const clearDraftsFor = (teacherId: string) => {
    setQuantityOverrides((prev) => {
      const next = { ...prev };
      delete next[teacherId];
      return next;
    });
    setAdjustmentOverrides((prev) => {
      const next = { ...prev };
      delete next[teacherId];
      return next;
    });
  };

  const changeMonth = (yearMonth: string) => {
    setSelectedMonth(yearMonth);
    setQuantityOverrides({});
    setAdjustmentOverrides({});
    setSelectedTeacherId(null);
  };

  const openDetail = (row: TeacherPayrollRow) => {
    setSelectedTeacherId(row.teacherId);
    if (row.settlementStatus !== 'pending') return;
    setQuantityOverrides((prev) => ({
      ...prev,
      [row.teacherId]: prev[row.teacherId] ?? resolveEditableQuantity(row),
    }));
    setAdjustmentOverrides((prev) => ({
      ...prev,
      [row.teacherId]: prev[row.teacherId] || { amount: 0, reason: '' },
    }));
  };

  const setDraftQuantity = (teacherId: string, value: number) => {
    setQuantityOverrides((prev) => ({ ...prev, [teacherId]: value }));
  };

  const setDraftAdjustment = (teacherId: string, amount: number) => {
    setAdjustmentOverrides((prev) => ({
      ...prev,
      [teacherId]: { amount, reason: prev[teacherId]?.reason },
    }));
  };

  const setDraftReason = (teacherId: string, reason: string) => {
    setAdjustmentOverrides((prev) => ({
      ...prev,
      [teacherId]: { amount: prev[teacherId]?.amount || 0, reason },
    }));
  };

  const handleConfirm = (row: TeacherPayrollRow) => {
    const teacher = teachers.find((t) => t.id === row.teacherId);
    if (!teacher) return;
    if (row.payType === 'none') {
      showToast('정산 방식이 미설정입니다. 강사 정보에서 지급 기준을 설정하세요.', 'warning');
      return;
    }

    const quantity = resolveEditableQuantity(row, quantityOverrides[row.teacherId]);
    const adj = adjustmentOverrides[row.teacherId] || { amount: 0 };
    const calculatedAmount = computePayrollAmount({
      payType: row.payType,
      quantity,
      hourlyRate: teacher.hourlyRate,
      salary: teacher.salary,
    });
    const finalAmount = Math.max(0, calculatedAmount + (adj.amount || 0));

    if (finalAmount <= 0) {
      showToast('최종 정산 금액이 0원입니다. 실적·지급 기준을 확인하세요.', 'warning');
      return;
    }
    if (row.payType === 'hourly' && quantity <= 0) {
      showToast('이번 달 수업 기록이 없습니다. 수업 기록을 저장한 뒤 다시 시도하세요.', 'warning');
      return;
    }
    if (row.requiresManualQuantity && quantity <= 0) {
      showToast('정산 대상 실적을 입력하세요.', 'warning');
      return;
    }

    openConfirmDialog({
      title: '정산 확정',
      message: `${teacher.name} · ${selectedMonth}\n계산 ${formatCurrency(calculatedAmount)}${
        adj.amount ? ` / 조정 ${formatCurrency(adj.amount)}` : ''
      }\n최종 ${formatCurrency(finalAmount)}\n\n금액을 확정할까요? (지출 등록은 별도)`,
      confirmText: '정산 확정',
      onConfirm: () => {
        saveTeacherPayrollSettlement({
          teacherId: teacher.id,
          yearMonth: selectedMonth,
          payType: row.payType,
          quantity,
          rate: row.rate,
          calculatedAmount,
          adjustmentAmount: adj.amount || 0,
          adjustmentReason: adj.reason,
          finalAmount,
        });
        clearDraftsFor(teacher.id);
        triggerRefresh();
        showToast(`${teacher.name} 정산이 확정되었습니다.`, 'success');
      },
    });
  };

  const handleRegisterExpense = (row: TeacherPayrollRow) => {
    const teacher = teachers.find((t) => t.id === row.teacherId);
    if (!teacher) return;
    if (row.settlementStatus === 'expensed' || row.settledExpenseId) {
      showToast('이미 해당 월 지출이 등록되어 있습니다.', 'info');
      return;
    }

    openConfirmDialog({
      title: '지출 등록',
      message: `${teacher.name} · ${selectedMonth}\n최종 ${formatCurrency(row.finalAmount)}을(를) 지출(강사료/인건비)로 등록할까요?`,
      confirmText: '지출 등록',
      onConfirm: () => {
        const draft = buildPayrollExpenseDraft({
          teacher,
          yearMonth: selectedMonth,
          amount: row.finalAmount,
          quantity: row.quantity,
          rate: row.rate,
          payType: row.payType,
          calculatedAmount: row.calculatedAmount,
          adjustmentAmount: row.adjustmentAmount,
          adjustmentReason: row.adjustmentReason,
          industry,
        });
        const saved = billingStorage.saveExpense(draft);
        linkPayrollSettlementExpense(teacher.id, selectedMonth, saved.id);
        triggerRefresh();
        showToast(`${teacher.name} 정산이 지출로 등록되었습니다.`, 'success');
        setSelectedTeacherId(null);
      },
    });
  };

  return {
    selectedMonth,
    monthOptions,
    rows,
    totals,
    selectedRow,
    quantityOverrides,
    adjustmentOverrides,
    setActiveTab,
    changeMonth,
    openDetail,
    closeDetail: () => setSelectedTeacherId(null),
    setDraftQuantity,
    setDraftAdjustment,
    setDraftReason,
    handleConfirm,
    handleRegisterExpense,
  };
}
