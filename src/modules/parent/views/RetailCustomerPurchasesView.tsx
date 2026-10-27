import React, { useCallback, useEffect, useState, type FC } from 'react';
import { History } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { customerPurchaseService } from '@/capabilities/commerce';
import { EmptyState, Section } from '@/shared/components';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';

interface Props {
  student: { id: string; name?: string };
}

export const RetailCustomerPurchasesView: FC<Props> = ({ student }) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!orgId) return;
      try {
        const res = await customerPurchaseService.listCustomerPurchases(orgId, student.id, { limit: 50 });
        setSales(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orgId, student.id]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Section title="결제 및 구매 내역">
        {loading ? (
          <PageListSkeleton rows={3} message="구매 내역을 불러오는 중입니다..." />
        ) : sales.length === 0 ? (
          <EmptyState title="구매 내역이 없습니다." className="!bg-transparent !border-none !p-4" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {sales.map((sale) => (
              <div key={sale.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{sale.title || '상품 구매'}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {new Date(sale.createdAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-base text-slate-900 tabular-nums">
                    {sale.netAmount.toLocaleString('ko-KR')}원
                  </p>
                </div>
                {sale.status === 'refunded' && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600">
                    환불/반품
                  </span>
                )}
                {sale.status === 'partial_refunded' && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">
                    부분 환불
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
