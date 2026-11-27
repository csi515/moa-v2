import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MasterDetailLayout } from '@/shared/components/layout/MasterDetailLayout';
import {
  customerLinkService,
  type CustomerSearchResult,
} from '@/core/customer/services/customerLinkService';
import { pointQueryService, type PointTransaction } from '@/capabilities/commerce';
import { creditWalletService } from '@/capabilities/credit_wallet';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saleHistoryService } from '../../services/saleHistoryService';
import { customerPurchaseService } from '../../services/customerPurchaseService';
import { saleReturnService } from '../../services/saleReturnService';
import { SaleDetailModal, type SaleDetailData } from '../sales/SaleDetailModal';
import type { CustomerPointsTypeFilter } from './customerCopy';
import {
  RetailCustomerDetailPanel,
  type RetailCustomerDetailData,
} from './RetailCustomerDetailPanel';
import { RetailCustomerListPanel } from './RetailCustomerListPanel';
import { RetailCustomerPointsPanel } from './RetailCustomerPointsPanel';
import { ManualPointModal } from './ManualPointModal';
import { CreditChargeModal } from './CreditChargeModal';

type Panel = 'list' | 'detail' | 'points';

const DETAIL_RECENT_SALES = 5;
const DETAIL_RECENT_TXS = 5;

export const RetailCustomerHubView: FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { showToast } = useApp();

  const [panel, setPanel] = useState<Panel>('list');
  const [loading, setLoading] = useState(true);

  // --- List State ---
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [manualPointOpen, setManualPointOpen] = useState(false);
  const [creditChargeOpen, setCreditChargeOpen] = useState(false);
  const [creditChargeTarget, setCreditChargeTarget] = useState<CustomerSearchResult | null>(null);

  // --- Detail State ---
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [detailData, setDetailData] = useState<RetailCustomerDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Point List State ---
  const [pointTxs, setPointTxs] = useState<PointTransaction[]>([]);
  const [pointTypeFilter, setPointTypeFilter] = useState<CustomerPointsTypeFilter>('ALL');
  const [pointLoading, setPointLoading] = useState(false);

  // --- Sale Detail Modal ---
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalData, setSaleModalData] = useState<SaleDetailData | null>(null);

  const loadList = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const res = await customerLinkService.searchCustomers(orgId, '', 300);
      setCustomers(res);

      if (res.length > 0) {
        const cids = res.map((c) => c.id);
        const map = await pointQueryService.getPointBalances(orgId, cids);
        setBalances(map);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customers, search]);

  const loadDetail = useCallback(
    async (customerId: string) => {
      if (!orgId) return;
      setDetailLoading(true);
      try {
        const [profile, txs, balMap, salesRes, wallet, creditTxs] = await Promise.all([
          customerLinkService.getCustomerProfile(orgId, customerId),
          pointQueryService.listPointTransactions(orgId, customerId, {
            limit: DETAIL_RECENT_TXS,
          }),
          pointQueryService.getPointBalances(orgId, [customerId]),
          customerPurchaseService.listCustomerPurchases(orgId, customerId, {
            limit: DETAIL_RECENT_SALES,
          }),
          creditWalletService.getWallet(orgId, customerId).catch(() => ({ totalBalance: 0, cashBalance: 0, bonusBalance: 0, customerId, id: '', lastUpdatedAt: '' })),
          creditWalletService.listTransactions(orgId, customerId).catch(() => []),
        ]);
        if (!profile) throw new Error('고객을 찾을 수 없습니다.');
        setDetailData({
          profile,
          recentTransactions: txs,
          recentSales: salesRes.data,
          balance: balMap.get(customerId) ?? 0,
          creditBalance: wallet.totalBalance ?? 0,
          recentCreditTransactions: creditTxs.slice(0, 5),
          purchaseCount: salesRes.data.length,
          latestAmount: salesRes.data[0]?.totalAmount || 0,
        });
      } catch (err) {
        showToast.error(err, '오류가 발생했습니다.');
        setPanel('list');
      } finally {
        setDetailLoading(false);
      }
    },
    [orgId, showToast]
  );

  const handleSelectCustomer = useCallback(
    (c: CustomerSearchResult) => {
      setSelectedCustomer(c);
      setPanel('detail');
      void loadDetail(c.id);
    },
    [loadDetail]
  );

  const loadPoints = useCallback(
    async (customerId: string, _type: CustomerPointsTypeFilter) => {
      if (!orgId) return;
      setPointLoading(true);
      try {
        const txs = await pointQueryService.listPointTransactions(orgId, customerId, {
          limit: 100,
        });
        setPointTxs(txs);
      } catch (err) {
        showToast.error(err, '오류가 발생했습니다.');
      } finally {
        setPointLoading(false);
      }
    },
    [orgId, showToast]
  );

  const handleOpenPoints = useCallback(() => {
    if (!selectedCustomer) return;
    setPanel('points');
    setPointTypeFilter('ALL');
    void loadPoints(selectedCustomer.id, 'ALL');
  }, [selectedCustomer, loadPoints]);

  const handleOpenSale = useCallback(
    async (saleId: string) => {
      if (!orgId) return;
      try {
        const detail = await saleHistoryService.getSaleDetail(orgId, saleId);
        const returns = await saleReturnService.listReturnsForSale(orgId, saleId);
        setSaleModalData({
          ...detail,
          totalAmount: detail.totalAmount ?? 0,
          paymentMethod: detail.paymentMethod ?? 'card',
          status: detail.status ?? 'completed',
          customerName: detail.customerName ?? null,
          items: detail.items,
          returnedQtyByItemId: detail.returnedQtyByItemId,
          returns,
        });
        setSaleModalOpen(true);
      } catch (err) {
        showToast.error(err, '오류가 발생했습니다.');
      }
    },
    [orgId, showToast]
  );

  const masterContent = (
    <RetailCustomerListPanel
      search={search}
      onSearchChange={setSearch}
      loading={loading}
      customers={customers}
      filtered={filtered}
      balances={balances}
      onSelect={handleSelectCustomer}
      onOpenManualPoint={() => setManualPointOpen(true)}
      onOpenCreditCharge={() => {
        setCreditChargeTarget(null);
        setCreditChargeOpen(true);
      }}
    />
  );

  const detailContent = useMemo(() => {
    if (!selectedCustomer) return null;

    if (panel === 'points' && detailData) {
      return (
        <RetailCustomerPointsPanel
          customerName={selectedCustomer.name}
          balance={detailData.balance}
          typeFilter={pointTypeFilter}
          onTypeFilterChange={(filter) => {
            setPointTypeFilter(filter);
            void loadPoints(selectedCustomer.id, filter);
          }}
          loading={pointLoading}
          transactions={pointTxs}
          onBack={() => setPanel('detail')}
          onOpenSale={handleOpenSale}
        />
      );
    }

    return (
      <RetailCustomerDetailPanel
        loading={detailLoading}
        data={detailData}
        onBack={() => {
          setSelectedCustomer(null);
          setPanel('list');
        }}
        onOpenPoints={handleOpenPoints}
        onOpenSale={handleOpenSale}
        onOpenChargeCredit={() => {
          setCreditChargeTarget(selectedCustomer);
          setCreditChargeOpen(true);
        }}
      />
    );
  }, [selectedCustomer, panel, detailData, pointTypeFilter, pointLoading, pointTxs, handleOpenPoints, handleOpenSale, loadPoints, detailLoading]);

  const emptyDetailContent = (
    <div className="py-24 text-center text-slate-400 space-y-3" data-testid="customer-empty-detail">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
        <Users className="w-6 h-6" />
      </div>
      <p className="text-sm font-bold text-slate-700">고객을 선택해 주세요</p>
      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
        좌측 목록에서 고객을 클릭하면 상세 정보, 최근 구매 이력 및 적립 포인트를 바로 확인할 수 있습니다.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <MasterDetailLayout
        master={masterContent}
        detail={detailContent}
        selectedId={selectedCustomer?.id}
        emptyDetail={emptyDetailContent}
        ratio="5-7"
        onBack={() => {
          setSelectedCustomer(null);
          setPanel('list');
        }}
      />

      {saleModalOpen && saleModalData && (
        <SaleDetailModal
          isOpen={saleModalOpen}
          detail={saleModalData}
          onClose={() => setSaleModalOpen(false)}
        />
      )}

      {manualPointOpen && (
        <ManualPointModal
          isOpen={manualPointOpen}
          organizationId={orgId!}
          onClose={() => setManualPointOpen(false)}
          onCompleted={() => {
            showToast('수동 포인트 지급/차감이 완료되었습니다.', 'success');
            void loadList();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {creditChargeOpen && (
        <CreditChargeModal
          isOpen={creditChargeOpen}
          organizationId={orgId!}
          initialCustomer={creditChargeTarget}
          onClose={() => setCreditChargeOpen(false)}
          onCompleted={() => {
            showToast('예치금이 성공적으로 충전되었습니다.', 'success');
            if (selectedCustomer) {
              void loadDetail(selectedCustomer.id);
            }
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
};
