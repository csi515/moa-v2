import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { SearchField } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import { saleService } from '../../services/saleService';
import {
  cartTotalAmount,
  type SaleCartLine,
  type SaleCatalogItem,
} from '../../types/sale';
import { SALE_POS_COPY as COPY } from './salePosCopy';
import { SaleCartLineRow } from './SaleCartLineRow';
import { SaleCheckoutModal } from './SaleCheckoutModal';

export const SalePosView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [catalog, setCatalog] = useState<SaleCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleCartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setCatalog([]);
      return;
    }
    setLoading(true);
    try {
      setCatalog(await saleService.listCatalog(orgId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        (row.variantName?.toLowerCase().includes(q) ?? false) ||
        (row.productCode?.toLowerCase().includes(q) ?? false)
    );
  }, [catalog, search]);

  const total = useMemo(() => cartTotalAmount(cart), [cart]);

  const addToCart = (item: SaleCatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.key === item.key);
      if (existing) {
        return prev.map((line) =>
          line.key === item.key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key: item.key,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          quantity: 1,
        },
      ];
    });
  };

  const setQty = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity } : line))
    );
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<ShoppingCart className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 판매할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="p-4 sm:p-6 space-y-3 flex-1">
        <PageHeader
          icon={<ShoppingCart className="w-5 h-5" />}
          iconClassName="text-teal-600"
          title={COPY.title}
          description={COPY.description}
        />

        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={COPY.searchPlaceholder}
          className="w-full"
        />

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-10 h-10" />}
            title={catalog.length === 0 ? COPY.emptyCatalog : COPY.emptySearch}
            description={catalog.length === 0 ? COPY.emptyCatalogHint : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 min-h-[72px] active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.variantName ?? COPY.singleOption}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold tabular-nums text-teal-700">
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="hidden md:block mt-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{COPY.cartTitle}</h2>
            <span className="text-xs font-bold text-slate-500">
              {COPY.cartCount(cart.length)}
            </span>
          </div>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{COPY.cartEmpty}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.key}>
                  <SaleCartLineRow
                    line={line}
                    onDecrease={() => setQty(line.key, line.quantity - 1)}
                    onIncrease={() => setQty(line.key, line.quantity + 1)}
                    onRemove={() => setQty(line.key, 0)}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700">{COPY.totalLabel}</span>
            <span className="text-xl font-bold tabular-nums text-teal-700">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {COPY.checkout}
          </button>
        </section>
      </div>

      <div className="md:hidden fixed left-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        {cart.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto px-4 pt-3 space-y-2 border-b border-slate-100">
            {cart.map((line) => (
              <div key={line.key}>
                <SaleCartLineRow
                  line={line}
                  compact
                  onDecrease={() => setQty(line.key, line.quantity - 1)}
                  onIncrease={() => setQty(line.key, line.quantity + 1)}
                  onRemove={() => setQty(line.key, 0)}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">
              {cart.length === 0 ? COPY.cartEmpty : COPY.cartCount(cart.length)}
            </p>
            <p className="text-lg font-bold tabular-nums text-slate-900 truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="shrink-0 min-h-[48px] px-5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {COPY.checkout}
          </button>
        </div>
      </div>

      <SaleCheckoutModal
        isOpen={checkoutOpen}
        organizationId={orgId}
        lines={cart}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={(amount) => {
          showToast(COPY.saleDone(formatCurrency(amount)), 'success');
          setCart([]);
          setCheckoutOpen(false);
        }}
        onError={(message) => showToast(message, 'error')}
      />
    </div>
  );
};
