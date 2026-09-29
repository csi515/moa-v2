import React, { useState, useMemo } from 'react';
import { TextbookInventoryTransaction } from '@/types';
import { HistoryFilterType } from '../textbookViewTypes';

interface TextbookHistoryTabProps {
  transactions: TextbookInventoryTransaction[];
}

function TypeBadge({ type }: { type: TextbookInventoryTransaction['transactionType'] }) {
  if (type === 'inbound') {
    return <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">신규입고</span>;
  }
  if (type === 'sale') {
    return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">판매출고</span>;
  }
  if (type === 'return') {
    return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">반품입고</span>;
  }
  return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">재고조정</span>;
}

export const TextbookHistoryTab: React.FC<TextbookHistoryTabProps> = ({ transactions }) => {
  const [historyFilterType, setHistoryFilterType] = useState<HistoryFilterType>('all');

  const filteredTransactions = useMemo(
    () => transactions.filter((tx) => historyFilterType === 'all' || tx.transactionType === historyFilterType),
    [transactions, historyFilterType]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">변동 유형 필터:</span>
          <div className="flex flex-wrap gap-1">
            {(['all', 'inbound', 'sale', 'adjust', 'return'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setHistoryFilterType(t)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  historyFilterType === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t === 'all'
                  ? '전체'
                  : t === 'inbound'
                  ? '입고'
                  : t === 'sale'
                  ? '판매출고'
                  : t === 'adjust'
                  ? '수동조정'
                  : '반품/취소'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">일자</th>
                <th className="py-3 px-4">교재명</th>
                <th className="py-3 px-3 text-center">구분</th>
                <th className="py-3 px-3 text-center">변동수량</th>
                <th className="py-3 px-3 text-center">변동 전 재고</th>
                <th className="py-3 px-3 text-center font-bold">변동 후 재고</th>
                <th className="py-3 px-4">사유 및 상세 내역</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500 font-medium">{tx.transactionDate}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{tx.textbookTitle}</td>
                  <td className="py-3 px-3 text-center">
                    <TypeBadge type={tx.transactionType} />
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className={tx.quantity > 0 ? 'text-indigo-600' : 'text-rose-600'}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}권
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">{tx.previousStock}권</td>
                  <td className="py-3 px-3 text-center font-black text-slate-900">{tx.currentStock}권</td>
                  <td className="py-3 px-4 text-slate-600">{tx.memo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center text-slate-400 text-sm">
            재고 변동 내역이 없습니다.
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{tx.textbookTitle}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tx.transactionDate}</p>
                </div>
                <TypeBadge type={tx.transactionType} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-semibold">변동</p>
                  <p className={`font-bold ${tx.quantity > 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}권
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">변동 전</p>
                  <p className="font-medium text-slate-600">{tx.previousStock}권</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">변동 후</p>
                  <p className="font-black text-slate-900">{tx.currentStock}권</p>
                </div>
              </div>
              {tx.memo && <p className="text-xs text-slate-500 pt-1">{tx.memo}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
