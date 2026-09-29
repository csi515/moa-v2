import React, { useState, useMemo } from 'react';
import { showToast, openConfirmDialog } from '@/shared/feedback/uiFeedback';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import {
  getIncomeCategories,
  getCategoryLabel,
  buildYearMonthOptions,
} from '@/capabilities/billing/finance/categories';
import { TrendingUp, Plus, Trash2, Edit, X, Save } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import type { IncomeEntry } from '@/capabilities/billing/finance/types';

export const IncomeManagementView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { industry } = usePermissions();
  const refreshKey = useStorageRefresh('finance');
  const categoryOptions = getIncomeCategories(industry);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: categoryOptions[0]?.value || 'other',
    amount: 100000,
    description: '',
    payer: '',
    paymentMethod: 'transfer' as PaymentMethod,
    memo: '',
  });

  const entries = useMemo(() => billingStorage.getIncomeEntries(), [refreshKey]);

  const monthOptions = useMemo(
    () =>
      buildYearMonthOptions({
        dataYearMonths: entries.map((e) => e.date?.slice(0, 7)),
      }),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedMonth && !e.date.startsWith(selectedMonth)) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      return true;
    });
  }, [entries, selectedMonth, categoryFilter]);

  const totalAmount = filteredEntries.reduce((sum, e) => sum + e.amount, 0);

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: categoryOptions[0]?.value || 'other',
      amount: 100000,
      description: '',
      payer: '',
      paymentMethod: 'transfer',
      memo: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: IncomeEntry) => {
    if (entry.sourceType === 'tuition' || entry.sourceType === 'textbook') {
      showToast('수납 연동 수입은 수납 화면에서 수정·삭제하세요.', 'warning');
      return;
    }
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
      payer: entry.payer || '',
      paymentMethod: entry.paymentMethod || 'transfer',
      memo: entry.memo || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (entry: IncomeEntry) => {
    const linked = entry.sourceType === 'tuition' || entry.sourceType === 'textbook';
    openConfirmDialog({
      title: linked ? '수납 연동 수입 삭제' : '수입 항목 삭제',
      message: linked
        ? `'${entry.description}'을(를) 삭제하면 학생 납부·미납 잔액도 함께 되돌립니다. 계속할까요?`
        : `'${entry.description}' 수입(${formatCurrency(entry.amount)})을 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        billingStorage.deleteIncomeEntry(entry.id);
        showToast(
          linked ? '연동 납부와 수입이 함께 취소되었습니다.' : '수입 내역이 삭제되었습니다.',
          'info'
        );
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      showToast('수입 적요를 입력해주세요.', 'warning');
      return;
    }

    billingStorage.saveIncomeEntry({
      ...(editingEntry ? { id: editingEntry.id } : {}),
      date: formData.date,
      category: formData.category,
      amount: Number(formData.amount) || 0,
      description: formData.description.trim(),
      payer: formData.payer.trim(),
      paymentMethod: formData.paymentMethod,
      memo: formData.memo.trim(),
      sourceType: 'manual',
    });

    showToast(
      editingEntry ? '수입 내역이 수정되었습니다.' : '신규 수입이 등록되었습니다.',
      'success'
    );
    setIsModalOpen(false);
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {!embedded && (
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              수입 관리
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              일반 수입과 수납(월회비·교재) 연동 수입을 함께 확인합니다.
            </p>
          </div>
        )}
        {embedded && (
          <div className="flex-1 min-w-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] font-bold text-emerald-700">{selectedMonth} 수입 합계</p>
            <p className="text-base font-black text-emerald-700 tabular-nums mt-0.5">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">등록 {filteredEntries.length}건</p>
          </div>
        )}
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 self-start sm:self-auto sm:ml-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          신규 수입 등록
        </button>
      </div>

      {!embedded && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {selectedMonth} 직접 등록 수입
          </span>
          <p className="text-xl font-black text-emerald-600 mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">등록 {filteredEntries.length}건</p>
        </div>
      )}

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="ALL">전체 항목</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          합계: <strong className="text-emerald-600 font-bold">{formatCurrency(totalAmount)}</strong>
        </span>
      </div>

      <div className="space-y-3">
        {/* 데스크톱 테이블 */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">수입 일자</th>
                  <th className="py-3.5 px-4">분류</th>
                  <th className="py-3.5 px-4">적요</th>
                  <th className="py-3.5 px-4">금액</th>
                  <th className="py-3.5 px-4">입금처/수단</th>
                  <th className="py-3.5 px-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      수입 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{entry.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700">
                          {getCategoryLabel(categoryOptions, entry.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {entry.description}
                          {(entry.sourceType === 'tuition' || entry.sourceType === 'textbook' || entry.sourceType === 'retail') && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {entry.sourceType === 'tuition' ? '수강료 연동' : entry.sourceType === 'textbook' ? '교재 연동' : '상품 판매'}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {entry.payer || '-'}
                        <span className="text-slate-400 text-[11px] ml-1">
                          ({entry.paymentMethod === 'card' ? '카드' : entry.paymentMethod === 'transfer' ? '이체' : '현금'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 모바일 카드 */}
        <div className="md:hidden space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">
              수입 내역이 없습니다.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {entry.description}
                      {(entry.sourceType === 'tuition' || entry.sourceType === 'textbook' || entry.sourceType === 'retail') && (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {entry.sourceType === 'tuition' ? '수강료' : entry.sourceType === 'textbook' ? '교재' : '상품'}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">{entry.date}</p>
                  </div>
                  <p className="font-black text-emerald-600 text-sm">{formatCurrency(entry.amount)}</p>
                </div>
                <p className="text-xs text-slate-600">
                  {getCategoryLabel(categoryOptions, entry.category)} · {entry.payer || '입금처 미입력'}
                </p>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(entry)}
                    className="flex-1 min-h-[44px] text-xs font-bold rounded-xl bg-slate-100 text-slate-700"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="flex-1 min-h-[44px] text-xs font-bold rounded-xl bg-rose-50 text-rose-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {editingEntry ? '수입 내역 수정' : '신규 수입 등록'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">수입 일자</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">분류</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">금액 (₩)</label>
                  <CurrencyInput
                    value={formData.amount}
                    onChange={(val) => setFormData({ ...formData, amount: val })}
                    showQuickButtons
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  적요 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">입금처</label>
                  <input
                    type="text"
                    value={formData.payer}
                    onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">결제 수단</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="transfer">이체</option>
                    <option value="card">카드</option>
                    <option value="cash">현금</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
