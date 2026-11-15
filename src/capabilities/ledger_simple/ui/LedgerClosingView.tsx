/**
 * 간이 장부·일일 시재 마감 UI (tenant localStorage + 도메인 엔진).
 * POS 매출과 장부는 분리되어 있으며, 여기서는 수기 시재 대조만 담당한다.
 */
import { useCallback, useMemo, useState, useEffect, type FC } from 'react';
import { BookOpenCheck, Lock, Unlock, ShoppingCart, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { formatCurrency } from '@/utils/formatters';
import { revenueService } from '@/capabilities/commerce';
import {
  aggregateDailyLedger,
  calculateCashVariance,
  lockDailyClosing,
  type DailyClosingState,
  type LedgerEntry,
} from '../domain/ledgerSimpleEngine';

type StoredLedger = {
  entries: LedgerEntry[];
  closing: DailyClosingState;
};

function loadLedger(date: string): StoredLedger {
  const key = getTenantStorageKey(`ledger_simple_${date}`);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as StoredLedger;
  } catch {
    /* ignore */
  }
  return {
    entries: [],
    closing: {
      date,
      isLocked: false,
      countedCash: 0,
      varianceAmount: 0,
    },
  };
}

function saveLedger(date: string, data: StoredLedger): void {
  const key = getTenantStorageKey(`ledger_simple_${date}`);
  localStorage.setItem(key, JSON.stringify(data));
}

export const LedgerClosingView: FC<{
  /** POS와 분리됨을 안내 */
  showPosSeparationNote?: boolean;
  /** 교대 점검 등 연계 링크 */
  handoverHint?: { label: string; onNavigate: () => void };
}> = ({ showPosSeparationNote = true, handoverHint }) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const date = todayIsoLocal();
  const [data, setData] = useState(() => loadLedger(date));
  const [openingCash, setOpeningCash] = useState('0');
  const [countedCash, setCountedCash] = useState(String(data.closing.countedCash || ''));
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 실시간 당일 POS 판매 실적 집계
  const [posData, setPosData] = useState<{
    cashNet: number;
    cardNet: number;
    totalNet: number;
    count: number;
    loading: boolean;
  }>({ cashNet: 0, cardNet: 0, totalNet: 0, count: 0, loading: false });

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setPosData((p) => ({ ...p, loading: true }));
    (async () => {
      try {
        const summary = await revenueService.getSummary({
          organizationId: orgId,
          range: { fromYmd: date, toYmd: date },
        });
        if (cancelled) return;
        const cashRow = summary.paymentBreakdown.find((p) => p.method === 'cash');
        const cardRow = summary.paymentBreakdown.find((p) => p.method === 'card');
        setPosData({
          cashNet: cashRow?.netAmount ?? 0,
          cardNet: cardRow?.netAmount ?? 0,
          totalNet: summary.netSalesAmount,
          count: summary.completedSaleCount,
          loading: false,
        });
      } catch {
        if (!cancelled) setPosData((p) => ({ ...p, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, date]);

  const isPosCashImported = useMemo(() => {
    return data.entries.some((e) => e.description.includes('POS 현금'));
  }, [data.entries]);

  const agg = useMemo(() => aggregateDailyLedger(data.entries), [data.entries]);

  const persist = useCallback(
    (next: StoredLedger) => {
      saveLedger(date, next);
      setData(next);
    },
    [date]
  );

  const onImportPosCash = () => {
    if (posData.cashNet <= 0) {
      setError('오늘 발생한 POS 현금 매출이 없습니다.');
      return;
    }
    if (data.closing.isLocked) {
      setError('마감 잠금된 일자입니다.');
      return;
    }
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      type: 'INCOME',
      method: 'CASH',
      amount: posData.cashNet,
      description: `당일 POS 현금 매출 (${posData.count}건)`,
      timestamp: new Date().toISOString(),
    };
    persist({ ...data, entries: [...data.entries, entry] });
    setError(null);
  };

  const onAddIncome = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('금액을 확인하세요.');
      return;
    }
    if (data.closing.isLocked) {
      setError('마감 잠금된 일자입니다.');
      return;
    }
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      type: 'INCOME',
      method: 'CASH',
      amount: n,
      description: desc.trim() || '현금 수납',
      timestamp: new Date().toISOString(),
    };
    persist({ ...data, entries: [...data.entries, entry] });
    setAmount('');
    setDesc('');
    setError(null);
  };

  const onLock = () => {
    const counted = Number(countedCash);
    const opening = Number(openingCash) || 0;
    if (!Number.isFinite(counted)) {
      setError('실측 현금을 입력하세요.');
      return;
    }
    const variance = calculateCashVariance({
      openingCash: opening,
      cashIncome: agg.cashIncome,
      cashExpense: agg.cashExpense,
      countedCash: counted,
    });
    const result = lockDailyClosing(data.closing, {
      countedCash: counted,
      varianceAmount: variance.varianceAmount,
      operatorId: 'owner',
    });
    if (!result.success) {
      setError(result.error ?? '마감 실패');
      return;
    }
    persist({ ...data, closing: result.updatedState });
    setError(null);
  };

  const variancePreview = calculateCashVariance({
    openingCash: Number(openingCash) || 0,
    cashIncome: agg.cashIncome,
    cashExpense: agg.cashExpense,
    countedCash: Number(countedCash) || 0,
  });

  return (
    <div className="space-y-4 p-4 sm:p-6 pb-10">
      <PageHeader
        icon={<BookOpenCheck className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title="간이 장부·시재 마감"
        description={`${date} 현금 시재 대조 및 일일 마감`}
      />

      {/* 당일 POS 매출 실시간 연동 현황 카드 */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-white to-teal-50/50 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">
              오늘의 POS 판매 실적 (실시간 연동)
            </h3>
            {posData.count > 0 && (
              <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                {posData.count}건 완료
              </span>
            )}
          </div>
          {posData.cashNet > 0 && !isPosCashImported && !data.closing.isLocked && (
            <button
              type="button"
              onClick={onImportPosCash}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>POS 현금 매출({formatCurrency(posData.cashNet)}) 장부 자동 반영</span>
            </button>
          )}
          {isPosCashImported && (
            <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold bg-teal-100/70 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              POS 현금 반영 완료
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">POS 총 순매출</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {formatCurrency(posData.totalNet)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs">
            <span className="text-teal-700 font-medium block">현금 매출 (시재 대상)</span>
            <span className="text-sm font-bold text-teal-800 tabular-nums">
              {formatCurrency(posData.cashNet)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">카드 매출</span>
            <span className="text-sm font-bold text-slate-700 tabular-nums">
              {formatCurrency(posData.cardNet)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">결제 건수</span>
            <span className="text-sm font-bold text-slate-700 tabular-nums">
              {posData.count}건
            </span>
          </div>
        </div>
      </div>

      {handoverHint ? (
        <button
          type="button"
          onClick={handoverHint.onNavigate}
          className="text-sm font-semibold text-teal-700 underline"
        >
          {handoverHint.label}
        </button>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="현금 수입" value={agg.cashIncome} />
        <Stat label="현금 지출" value={agg.cashExpense} />
        <Stat label="순현금" value={agg.cashIncome - agg.cashExpense} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">수기 현금 수입 추가</h3>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="설명"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={data.closing.isLocked}
        />
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="금액"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={data.closing.isLocked}
        />
        <button
          type="button"
          onClick={onAddIncome}
          disabled={data.closing.isLocked}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          추가
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {data.closing.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          시재 마감
        </h3>
        <label className="block text-xs text-slate-500">
          시작 준비금
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            disabled={data.closing.isLocked}
          />
        </label>
        <label className="block text-xs text-slate-500">
          실측 현금
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            disabled={data.closing.isLocked}
          />
        </label>
        <p className="text-xs text-slate-600">
          예상 시재 {variancePreview.expectedCash.toLocaleString()}원 · 차이{' '}
          {variancePreview.varianceAmount.toLocaleString()}원 ({variancePreview.status})
        </p>
        <button
          type="button"
          onClick={onLock}
          disabled={data.closing.isLocked}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {data.closing.isLocked ? '마감 완료' : '마감 잠금'}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {data.entries.map((e) => (
          <li
            key={e.id}
            className="flex justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm"
          >
            <span>{e.description}</span>
            <span className="font-semibold">{e.amount.toLocaleString()}원</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value.toLocaleString()}원</p>
    </div>
  );
}
