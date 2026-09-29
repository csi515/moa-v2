import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';
import {
  maxRedeemablePoints,
  pointRedeemService,
} from '@/capabilities/commerce';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { saleService } from '../../services/saleService';
import {
  cartLineAmount,
  cartTotalAmount,
  buildProductNameSnapshot,
  type SaleCartLine,
  type SaleCreateInput,
  type SalePaymentMethod,
} from '../../types/sale';
import { POS_PAYMENT_OPTIONS, SALE_POS_COPY as COPY } from './salePosCopy';
import { SaleCustomerPicker } from './SaleCustomerPicker';

interface Props {
  isOpen: boolean;
  organizationId: string;
  lines: SaleCartLine[];
  onClose: () => void;
  onCompleted: (totalAmount: number) => void;
  onError: (message: string) => void;
}

export const SaleCheckoutModal: FC<Props> = ({
  isOpen,
  organizationId,
  lines,
  onClose,
  onCompleted,
  onError,
}) => {
  const { openConfirmDialog } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('card');
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [pointsEnabled, setPointsEnabled] = useState(false);
  const [pointBalance, setPointBalance] = useState(0);
  const [pointsUseInput, setPointsUseInput] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  const total = useMemo(() => cartTotalAmount(lines), [lines]);

  const maxPoints = useMemo(
    () => maxRedeemablePoints(pointBalance, total),
    [pointBalance, total]
  );

  const pointsToUse = useMemo(() => {
    if (!pointsEnabled || !customer || maxPoints <= 0) return 0;
    const raw = Math.floor(Number(pointsUseInput) || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw, maxPoints);
  }, [pointsEnabled, customer, maxPoints, pointsUseInput]);

  const payable = Math.max(0, total - pointsToUse);
  const canUsePoints = pointsEnabled && !!customer && maxPoints > 0;

  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod('card');
    setCustomer(null);
    setPointsUseInput('');
    setPointBalance(0);
    setPointsEnabled(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !organizationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const enabled = await pointRedeemService.isRedeemEnabled(organizationId);
        if (!cancelled) setPointsEnabled(enabled);
      } catch {
        if (!cancelled) setPointsEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, organizationId]);

  useEffect(() => {
    if (!isOpen || !organizationId || !customer || !pointsEnabled) {
      setPointBalance(0);
      setPointsUseInput('');
      return;
    }
    let cancelled = false;
    setPointsLoading(true);
    void (async () => {
      try {
        const balance = await pointRedeemService.getBalance(
          organizationId,
          customer.id
        );
        if (cancelled) return;
        setPointBalance(balance);
        setPointsUseInput('');
      } catch (err) {
        if (cancelled) return;
        setPointBalance(0);
        onError(err instanceof Error ? err.message : COPY.saleError);
      } finally {
        if (!cancelled) setPointsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, organizationId, customer, pointsEnabled, onError]);

  const buildSaleItems = (): SaleCreateInput['items'] =>
    lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      productNameSnapshot: buildProductNameSnapshot(line.productName, line.variantName),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: 0,
    }));

  const finalizeSale = async () => {
    setSaving(true);
    try {
      if (pointsToUse > maxRedeemablePoints(pointBalance, total)) {
        throw new Error(COPY.pointsExceed);
      }
      const sale = await saleService.createSale({
        organizationId,
        customerId: customer?.id ?? null,
        paymentMethod,
        pointsUsed: pointsToUse > 0 ? pointsToUse : 0,
        items: buildSaleItems(),
      });
      const paid = Math.max(0, sale.totalAmount - (sale.pointsUsed ?? 0));
      onCompleted(paid);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.saleError);
    } finally {
      setSaving(false);
    }
  };

  const handlePointsInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    if (digits === '') {
      setPointsUseInput('');
      return;
    }
    const n = Math.floor(Number(digits));
    if (!Number.isFinite(n) || n < 0) {
      setPointsUseInput('');
      return;
    }
    setPointsUseInput(String(Math.min(n, maxPoints)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (lines.length === 0) {
      onError(COPY.needItems);
      return;
    }
    if (!paymentMethod) {
      onError(COPY.needPayment);
      return;
    }
    if (pointsUseInput !== '' && Number(pointsUseInput) > maxPoints) {
      onError(COPY.pointsExceed);
      return;
    }

    setSaving(true);
    try {
      const items = buildSaleItems();
      const shortfalls = await saleService.checkStockShortfalls(organizationId, items);
      if (shortfalls.length > 0) {
        setSaving(false);
        const detail = shortfalls
          .map((s) => COPY.stockShortLine(s.label, s.available, s.required))
          .join('\n');
        openConfirmDialog({
          title: COPY.stockShortTitle,
          message: COPY.stockShortMessage(detail),
          confirmText: COPY.stockShortConfirm,
          cancelText: COPY.cancel,
          isDestructive: true,
          onConfirm: () => {
            void finalizeSale();
          },
        });
        return;
      }
      await finalizeSale();
    } catch (err) {
      setSaving(false);
      onError(err instanceof Error ? err.message : COPY.saleError);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.checkoutTitle} maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {COPY.itemsLabel}
            </h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {lines.map((line) => (
                <li key={line.key} className="px-3 py-3">
                  <p className="font-bold text-slate-900 text-sm">{line.productName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {COPY.optionLabel}: {line.variantName ?? COPY.singleOption}
                  </p>
                  <div className="flex justify-between items-end mt-2 text-sm">
                    <span className="text-slate-600">
                      {COPY.qtyLabel}{' '}
                      <span className="font-bold tabular-nums">{line.quantity}</span>
                      {COPY.qtyUnit} · {formatCurrency(line.unitPrice)}
                    </span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatCurrency(cartLineAmount(line))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-slate-700">{COPY.totalLabel}</span>
              <span className="text-lg font-bold tabular-nums text-teal-700">
                {formatCurrency(total)}
              </span>
            </div>
          </section>

          <SaleCustomerPicker
            organizationId={organizationId}
            customer={customer}
            onChange={setCustomer}
            onError={onError}
          />

          {pointsEnabled && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {COPY.pointsSection}
              </h3>

              {!customer ? (
                <p className="text-sm text-slate-600">{COPY.pointsNeedCustomer}</p>
              ) : pointsLoading ? (
                <p className="text-sm text-slate-500">…</p>
              ) : maxPoints <= 0 ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{COPY.pointsBalance}</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {pointBalance.toLocaleString('ko-KR')}
                      {COPY.pointsUnit}
                    </span>
                  </div>
                  <p className="text-slate-500">{COPY.pointsDisabled}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{COPY.pointsBalance}</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {pointBalance.toLocaleString('ko-KR')}
                      {COPY.pointsUnit}
                    </span>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      {COPY.pointsUse}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pointsUseInput}
                        onChange={(e) => handlePointsInput(e.target.value)}
                        placeholder={COPY.pointsUsePlaceholder}
                        disabled={!canUsePoints || saving}
                        className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums text-slate-900 disabled:opacity-60"
                        aria-label={COPY.pointsUse}
                      />
                      <span className="text-sm font-bold text-slate-600 shrink-0">
                        {COPY.pointsUnit}
                      </span>
                    </div>
                  </label>

                  <p className="text-xs text-slate-500">{COPY.pointsHint}</p>

                  <dl className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="flex justify-between items-center text-sm">
                      <dt className="text-slate-600">{COPY.pointsUse}</dt>
                      <dd className="font-bold tabular-nums text-slate-900">
                        {pointsToUse.toLocaleString('ko-KR')}
                        {COPY.pointsUnit}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm font-bold text-slate-800">
                        {COPY.pointsPayable}
                      </dt>
                      <dd className="text-lg font-bold tabular-nums text-teal-700">
                        {formatCurrency(payable)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {COPY.paymentMethod}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {POS_PAYMENT_OPTIONS.map((opt) => {
                const active = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`min-h-[48px] rounded-xl text-sm font-bold border ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex gap-2 p-4 sm:p-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
          >
            {COPY.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || lines.length === 0}
            className="flex-[1.4] min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.confirming : COPY.confirmSale}
          </button>
        </div>
      </form>
    </Modal>
  );
};
