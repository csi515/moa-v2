import React, { useCallback, useEffect, useState, type FC } from "react";
import { Coins } from "lucide-react";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { pointQueryService, type PointTransaction } from "@/capabilities/commerce";
import { EmptyState, Section } from "@/shared/components";
import { PageListSkeleton } from "@/shared/components/ui/Skeleton";
import { formatKoreanDate } from "@/utils/formatters";

function formatPointAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString("ko-KR");
  if (amount > 0) return `+${abs}P`;
  if (amount < 0) return `-${abs}P`;
  return "0P";
}

function formatPointDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = formatKoreanDate(iso);
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

interface Props {
  student: { id: string; name?: string };
}

export const RetailCustomerPointsView: FC<Props> = ({ student }) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<PointTransaction[]>([]);

  useEffect(() => {
    async function load() {
      if (!orgId) return;
      try {
        const [balMap, list] = await Promise.all([
          pointQueryService.getPointBalances(orgId, [student.id]),
          pointQueryService.listPointTransactions(orgId, student.id, { limit: 50 }),
        ]);
        setBalance(balMap.get(student.id) ?? 0);
        setTxs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orgId, student.id]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <p className="text-indigo-200 text-sm font-medium mb-1">사용 가능 포인트</p>
          <h2 className="text-3xl font-black">{balance.toLocaleString("ko-KR")} <span className="text-base font-bold">P</span></h2>
        </div>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Coins className="w-6 h-6 text-indigo-100" />
        </div>
      </div>

      <Section title="적립/사용 내역">
        {loading ? (
          <PageListSkeleton rows={3} message="내역을 불러오는 중입니다..." />
        ) : txs.length === 0 ? (
          <EmptyState title="포인트 내역이 없습니다." className="!bg-transparent !border-none !p-4" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {txs.map((tx) => {
              const amountClass = tx.amount > 0 ? "text-indigo-600" : "text-slate-900";
              const typeLabel = tx.type === "earn" ? "포인트 적립" : tx.type === "redeem" ? "포인트 사용" : "포인트 수동 지급/차감";
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">
                      {tx.description || typeLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      {formatPointDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={"font-bold text-base tabular-nums " + amountClass}>
                      {formatPointAmount(tx.amount)} P
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      잔액 {tx.balanceAfter.toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
};
