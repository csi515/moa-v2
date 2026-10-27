import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useApp } from '@/context/AppContext';
import {
  customerLinkService,
  type CustomerSearchResult,
} from '@/core/customer/services/customerLinkService';
import { pointQueryService, type PointTransaction } from '@/capabilities/commerce';
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
        const [profile, txs, balMap, salesRes] = await Promise.all([
          customerLinkService.getCustomerProfile(orgId, customerId),
          pointQueryService.listPointTransactions(orgId, customerId, {
            limit: DETAIL_RECENT_TXS,
          }),
          pointQueryService.getPointBalances(orgId, [customerId]),
          customerPurchaseService.listCustomerPurchases(orgId, customerId, {
            limit: DETAIL_RECENT_SALES,
          }),
        ]);
        if (!profile) throw new Error('고객을 찾을 수 없습니다.');
        setDetailData({
          profile,
          recentTransactions: txs,
          recentSales: salesRes.data,
          balance: balMap.get(customerId) ?? 0,
          purchaseCount: salesRes.data.length,
          latestAmount: salesRes.data[0]?.totalAmount || 0,
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : '오류가 발생했습니다.', 'error');
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
        showToast(err instanceof Error ? err.message : '오류가 발생했습니다.', 'error');
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
        showToast(err instanceof Error ? err.message : '오류가 발생했습니다.', 'error');
      }
    },
    [orgId, showToast]
  );

  const renderPanel = () => {
    if (panel === 'list') {
      return (
        <RetailCustomerListPanel
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          customers={customers}
          filtered={filtered}
          balances={balances}
          onSelect={handleSelectCustomer}
          onOpenManualPoint={() => setManualPointOpen(true)}
        />
      );
    }

    if (panel === 'detail' && selectedCustomer) {
      return (
        <RetailCustomerDetailPanel
          loading={detailLoading}
          data={detailData}
          onBack={() => setPanel('list')}
          onOpenPoints={handleOpenPoints}
          onOpenSale={handleOpenSale}
        />
      );
    }

    if (panel === 'points' && selectedCustomer && detailData) {
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

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {renderPanel()}

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
    </div>
  );
};
