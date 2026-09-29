import { useCallback, useEffect, useState, type FC } from 'react';
import { ArrowLeft, Coins } from 'lucide-react';
import {
  POINT_TRANSACTION_TYPE_LABELS,
  type PointTransaction,
} from '@/core/loyalty';
import { formatKoreanDate } from '@/utils/formatters';
import { CUSTOMER_RETAIL_POINTS_COPY as COPY } from './customerRetailPointsCopy';
import type { MyLinkedCustomerOrg } from './services/myLinkedCustomerOrgsService';
import {
  myCustomerPointsService,
  type MyRetailPointsSnapshot,
} from './services/myCustomerPointsService';

interface Props {
  organization: MyLinkedCustomerOrg;
  onBack: () => void;
}

function formatPointAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('ko-KR');
  if (amount > 0) return `+${abs}${COPY.pointsUnit}`;
  if (amount < 0) return `-${abs}${COPY.pointsUnit}`;
  return `0${COPY.pointsUnit}`;
}

function formatTxDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const date = formatKoreanDate(iso);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function txReason(tx: PointTransaction): string {
  const desc = tx.description?.trim();
  if (desc) return desc;
  return POINT_TRANSACTION_TYPE_LABELS[tx.type] || COPY.noReason;
}

function TxList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: PointTransaction[];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((tx) => (
            <li
              key={tx.id}
              className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5"
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs text-slate-500">{formatTxDate(tx.createdAt)}</p>
                <p
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    tx.amount >= 0 ? 'text-teal-700' : 'text-slate-900'
                  }`}
                >
                  {formatPointAmount(tx.amount)}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-800">{txReason(tx)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 일반 사용자 — 단일 Retail 사업장 포인트 조회.
 * 잔액·이력은 해당 organizationId × customerId 만 사용(합산 금지).
 */
export const CustomerRetailPointsView: FC<Props> = ({ organization, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MyRetailPointsSnapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await myCustomerPointsService.getMyRetailPoints({
        organizationId: organization.organizationId,
        customerId: organization.customerId,
        industryType: organization.industryType,
      });
      setSnapshot(data);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : COPY.loadError);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-slate-600"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        {COPY.back}
      </button>

      <div>
        <p className="text-[11px] font-bold text-teal-700 truncate">
          {organization.organizationName}
        </p>
        <h2 className="text-base font-black text-slate-900 mt-0.5">{COPY.title}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">{COPY.loading}</p>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-6 text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Coins className="w-4 h-4" aria-hidden />
              {COPY.balance}
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-teal-900">
              {(snapshot?.balance ?? 0).toLocaleString('ko-KR')}
              <span className="text-lg ml-0.5">{COPY.pointsUnit}</span>
            </p>
          </section>

          <TxList
            title={COPY.recentEarn}
            empty={COPY.emptyEarn}
            rows={snapshot?.recentEarns ?? []}
          />
          <TxList
            title={COPY.recentRedeem}
            empty={COPY.emptyRedeem}
            rows={snapshot?.recentRedeems ?? []}
          />
        </>
      )}
    </div>
  );
};
