import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  customerLinkService,
  type CustomerSearchResult,
} from '@/core/customer/services/customerLinkService';
import { pointQueryService, type PointTransaction } from '@/capabilities/commerce';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState } from '@/shared/components';
import { saleHistoryService } from '../../services/saleHistoryService';
import { customerPurchaseService } from '../../services/customerPurchaseService';
import { saleReturnService } from '../../services/saleReturnService';
import { SaleDetailModal, type SaleDetailData } from '../sales/SaleDetailModal';
import {
  RETAIL_CUSTOMER_COPY as COPY,
  type CustomerPointsTypeFilter,
} from './customerCopy';
import {
  RetailCustomerDetailPanel,
  type RetailCustomerDetailData,
} from './RetailCustomerDetailPanel';
import { RetailCustomerListPanel } from './RetailCustomerListPanel';
import { RetailCustomerPointsPanel } from './RetailCustomerPointsPanel';

type Panel = 'list' | 'detail' | 'points';

const DETAIL_RECENT_SALES = 5;
const DETAIL_RECENT_TXS = 5;

export const RetailCustomerHubView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [panel, setPanel] = useState<Panel>('list');
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<CustomerSearchResult | null>(null);
  const [detailData, setDetailData] = useState<RetailCustomerDetailData | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<CustomerPointsTypeFilter>('ALL');
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);

  const [saleDetailOpen, setSaleDetailOpen] = useState(false);
  const [saleDetailLoading, setSaleDetailLoading] = useState(false);
  const [saleDetail, setSaleDetail] = useState<SaleDetailData | null>(null);

  const loadList = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setCustomers([]);
      setBalances(new Map());
      return;
    }
    setLoading(true);
    try {
      const list = await customerLinkService.listCustomers(orgId);
      setCustomers(list);
      const map = await pointQueryService.getBalancesByCustomerIds(
        orgId,
        list.map((c) => c.id)
      );
      setBalances(map);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setCustomers([]);
      setBalances(new Map());
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    if (panel === 'list') void loadList();
  }, [panel, loadList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = `${c.name} ${c.phone ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [customers, search]);

  const loadDetail = useCallback(
    async (customer: CustomerSearchResult) => {
      if (!orgId) return;
      setDetailLoading(true);
      setDetailData(null);
      try {
        const [profile, purchase, balance, recentTxs] = await Promise.all([
          customerLinkService.getCustomerProfile(orgId, customer.id),
          customerPurchaseService.getCustomerPurchaseSummary({
            organizationId: orgId,
            customerId: customer.id,
            recentLimit: DETAIL_RECENT_SALES,
          }),
          pointQueryService.getBalance(orgId, customer.id),
          pointQueryService.listTransactions({
            organizationId: orgId,
            customerId: customer.id,
            type: 'ALL',
            limit: DETAIL_RECENT_TXS,
          }),
        ]);
        if (!profile) {
          throw new Error(COPY.detailLoadError);
        }
        setDetailData({
          profile,
          balance,
          purchaseCount: purchase.totalCount,
          latestAmount: purchase.latestAmount,
          recentSales: purchase.recentSales,
          recentTransactions: recentTxs,
        });
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : COPY.detailLoadError,
          'error'
        );
        setPanel('list');
        setSelected(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [orgId, showToast]
  );

  const openDetail = (customer: CustomerSearchResult) => {
    setSelected(customer);
    setPanel('detail');
    void loadDetail(customer);
  };

  const loadPoints = useCallback(async () => {
    if (!orgId || !selected) return;
    setPointsLoading(true);
    try {
      const [balance, txs] = await Promise.all([
        pointQueryService.getBalance(orgId, selected.id),
        pointQueryService.listTransactions({
          organizationId: orgId,
          customerId: selected.id,
          type: typeFilter === 'ALL' ? 'ALL' : typeFilter,
        }),
      ]);
      setPointsBalance(balance);
      setTransactions(txs);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.pointsLoadError, 'error');
      setTransactions([]);
    } finally {
      setPointsLoading(false);
    }
  }, [orgId, selected, typeFilter, showToast]);

  useEffect(() => {
    if (panel === 'points') void loadPoints();
  }, [panel, loadPoints]);

  const openSaleDetail = async (saleId: string) => {
    if (!orgId) return;
    setSaleDetailOpen(true);
    setSaleDetail(null);
    setSaleDetailLoading(true);
    try {
      const data = await saleHistoryService.getSaleDetail(orgId, saleId);
      const returns = await saleReturnService.listReturnsForSale(orgId, saleId);
      setSaleDetail({
        id: data.id,
        createdAt: data.createdAt,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        status: data.status,
        customerName: data.customerName,
        items: data.items,
        returnedQtyByItemId: data.returnedQtyByItemId,
        returns,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.pointsLoadError, 'error');
      setSaleDetailOpen(false);
    } finally {
      setSaleDetailLoading(false);
    }
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 고객을 확인할 수 있습니다"
        />
      </div>
    );
  }

  if (panel === 'points' && selected) {
    return (
      <>
        <RetailCustomerPointsPanel
          customerName={selected.name}
          balance={pointsBalance}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          loading={pointsLoading}
          transactions={transactions}
          onBack={() => {
            setPanel('detail');
            void loadDetail(selected);
          }}
          onOpenSale={(saleId) => void openSaleDetail(saleId)}
        />
        <SaleDetailModal
          isOpen={saleDetailOpen}
          detail={saleDetail}
          loading={saleDetailLoading}
          onClose={() => setSaleDetailOpen(false)}
        />
      </>
    );
  }

  if (panel === 'detail' && selected) {
    return (
      <>
        <RetailCustomerDetailPanel
          data={detailData}
          loading={detailLoading}
          onBack={() => {
            setPanel('list');
            setSelected(null);
            setDetailData(null);
          }}
          onOpenPoints={() => {
            setTypeFilter('ALL');
            setPanel('points');
          }}
          onOpenSale={(saleId) => void openSaleDetail(saleId)}
        />
        <SaleDetailModal
          isOpen={saleDetailOpen}
          detail={saleDetail}
          loading={saleDetailLoading}
          onClose={() => setSaleDetailOpen(false)}
        />
      </>
    );
  }

  return (
    <RetailCustomerListPanel
      search={search}
      onSearchChange={setSearch}
      loading={loading}
      customers={customers}
      filtered={filtered}
      balances={balances}
      onSelect={openDetail}
    />
  );
};
