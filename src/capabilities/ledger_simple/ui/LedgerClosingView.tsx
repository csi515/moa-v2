/**
 * 간이 장부·일일 시재 마감 UI (tenant localStorage + 도메인 엔진).
 * POS 매출과 장부는 분리되어 있으며, 여기서는 수기 시재 대조만 담당한다.
 */
import { useCallback, useMemo, useState, type FC } from 'react';
import { BookOpenCheck, Lock, Unlock } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import { todayIsoLocal } from '@/shared/utils/localDate';
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
  useOrganization();
  const date = todayIsoLocal();
  const [data, setData] = useState(() => loadLedger(date));
  const [openingCash, setOpeningCash] = useState('0');
  const [countedCash, setCountedCash] = useState(String(data.closing.countedCash || ''));
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const agg = useMemo(() => aggregateDailyLedger(data.entries), [data.entries]);

  const persist = useCallback(
    (next: StoredLedger) => {
      saveLedger(date, next);
      setData(next);
    },
    [date]
  );

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

      {showPosSeparationNote ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          POS 판매 내역과 이 장부는 분리되어 있습니다. 카드·이체 매출은 판매내역·매출
          리포트에서, 현금 시재만 여기서 마감합니다.
        </p>
      ) : null}

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
