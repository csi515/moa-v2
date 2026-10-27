import { useCallback, useEffect, useState, type FC } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Coins, History, MapPin, Store } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useCustomerLink } from '@/core/customer/hooks/useCustomerLink';
import { pointQueryService, customerPurchaseService } from '@/capabilities/commerce';
import { EmptyState, Section } from '@/shared/components';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';

interface Props {
  onNavigate: (tab: string) => void;
}

export const RetailCustomerHome: FC<Props> = ({ onNavigate }) => {
  const { currentOrganization } = useOrganization();
  const organization = currentOrganization;
  const orgId = currentOrganization?.id;
  const { currentCustomer } = useCustomerLink();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!orgId || !currentCustomer) return;
      try {
        const [balMap, salesRes] = await Promise.all([
          pointQueryService.getPointBalances(orgId, [currentCustomer.id]),
          customerPurchaseService.listCustomerPurchases(orgId, currentCustomer.id, { limit: 3 }),
        ]);
        setBalance(balMap.get(currentCustomer.id) ?? 0);
        setRecentPurchases(salesRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orgId, currentCustomer]);

  if (!currentCustomer) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* 바코드 / 멤버십 카드 영역 */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Store className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-300 text-sm font-medium mb-1">
            {organization?.name || '매장'} 멤버십
          </p>
          <h2 className="text-2xl font-black">{currentCustomer.name}님</h2>

          <div className="mt-6 flex flex-col items-center bg-white rounded-xl p-4">
            {/* 임시로 customer.id를 바코드로 사용 */}
            <QRCodeSVG value={currentCustomer.id} size={140} />
            <p className="text-slate-900 font-mono text-xs mt-3 tracking-widest uppercase">
              {currentCustomer.id.split('-')[0]}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <PageListSkeleton rows={2} message="멤버십 정보를 불러오는 중입니다..." />
      ) : (
        <>
          <Section title="내 포인트">
            <button
              onClick={() => onNavigate('stamps')}
              className="w-full bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">사용 가능 포인트</p>
                  <p className="text-xs text-slate-500">클릭하여 적립/사용 내역 보기</p>
                </div>
              </div>
              <p className="text-xl font-black text-indigo-600">
                {balance.toLocaleString('ko-KR')} <span className="text-sm font-bold text-slate-500">P</span>
              </p>
            </button>
          </Section>

          <Section title="최근 구매 내역">
            {recentPurchases.length === 0 ? (
              <EmptyState title="최근 구매 내역이 없습니다." className="!bg-transparent !border-none !p-4" />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {recentPurchases.map((sale) => (
                  <button
                    key={sale.id}
                    onClick={() => onNavigate('reports')}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-start"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {sale.title || '상품 구매'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {new Date(sale.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-slate-900 tabular-nums">
                      {sale.netAmount.toLocaleString('ko-KR')}원
                    </p>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('reports')}
              className="w-full mt-3 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              전체 구매 내역 보기
            </button>
          </Section>
        </>
      )}
    </div>
  );
};
