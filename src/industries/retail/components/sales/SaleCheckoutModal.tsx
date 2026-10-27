import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { Banknote, Calculator } from 'lucide-react';
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
  type SaleWithItems,
  type SplitPaymentDetail,
} from '../../types/sale';
import { POS_PAYMENT_OPTIONS, SALE_POS_COPY as COPY } from './salePosCopy';
import { SaleCustomerPicker } from './SaleCustomerPicker';

interface Props {
  isOpen: boolean;
  organizationId: string;
  lines: SaleCartLine[];
  onClose: () => void;
  onCompleted: (
    totalAmount: number,
    sale?: SaleWithItems,
    changeInfo?: { received: number; change: number },
    splitDetail?: SplitPaymentDetail
  ) => void;
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
  const [selectedMethod, setSelectedMethod] = useState<SalePaymentMethod | 'split'>('card');
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [pointsEnabled, setPointsEnabled] = useState(false);
  const [pointBalance, setPointBalance] = useState(0);
  const [pointsUseInput, setPointsUseInput] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // 현금 결제용 받은 금액 & 거스름돈 계산기
  const [receivedInput, setReceivedInput] = useState<string>('');

  // 복합 결제용 (현금 + 카드) 분할 입력값
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitReceivedInput, setSplitReceivedInput] = useState<string>('');

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

  const receivedAmount = useMemo(() => {
    const n = Number(receivedInput.replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [receivedInput]);

  const changeAmount = useMemo(() => {
    return receivedAmount - payable;
  }, [receivedAmount, payable]);

  // 복합 결제 계산
  const splitCashAmount = useMemo(() => {
    const n = Number(splitCashInput.replace(/[^\d]/g, ''));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, payable);
  }, [splitCashInput, payable]);

  const splitCardAmount = useMemo(() => {
    return Math.max(0, payable - splitCashAmount);
  }, [payable, splitCashAmount]);

  const splitReceivedAmount = useMemo(() => {
    const n = Number(splitReceivedInput.replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [splitReceivedInput]);

  const splitChangeAmount = useMemo(() => {
    if (splitReceivedAmount <= 0) return 0;
    return splitReceivedAmount - splitCashAmount;
  }, [splitReceivedAmount, splitCashAmount]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMethod('card');
    setPaymentMethod('card');
    setCustomer(null);
    setPointsUseInput('');
    setPointBalance(0);
    setPointsEnabled(false);
    setReceivedInput('');
    setSplitCashInput('');
    setSplitReceivedInput('');
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
      discountAmount: line.discountAmount ?? 0,
    }));

  const finalizeSale = async () => {
    setSaving(true);
    try {
      if (pointsToUse > maxRedeemablePoints(pointBalance, total)) {
        throw new Error(COPY.pointsExceed);
      }
      const actualPaymentMethod = selectedMethod === 'split' ? 'other' : selectedMethod;
      const sale = await saleService.createSale({
        organizationId,
        customerId: customer?.id ?? null,
        paymentMethod: actualPaymentMethod,
        pointsUsed: pointsToUse > 0 ? pointsToUse : 0,
        items: buildSaleItems(),
      });
      const paid = Math.max(0, sale.totalAmount - (sale.pointsUsed ?? 0));
      let changeInfo: { received: number; change: number } | undefined;
      let splitDetail: SplitPaymentDetail | undefined;

      if (selectedMethod === 'cash' && receivedAmount > 0) {
        changeInfo = { received: receivedAmount, change: Math.max(0, changeAmount) };
      } else if (selectedMethod === 'split') {
        splitDetail = { cashAmount: splitCashAmount, cardAmount: splitCardAmount };
        if (splitReceivedAmount > 0) {
          changeInfo = { received: splitReceivedAmount, change: Math.max(0, splitChangeAmount) };
        }
      }
      onCompleted(paid, sale, changeInfo, splitDetail);
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

  const handleQuickCash = (amount: number, isAddition = false) => {
    if (isAddition) {
      setReceivedInput(String(receivedAmount + amount));
    } else {
      setReceivedInput(String(amount));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (lines.length === 0) {
      onError(COPY.needItems);
      return;
    }
    if (!selectedMethod) {
      onError(COPY.needPayment);
      return;
    }
    if (pointsUseInput !== '' && Number(pointsUseInput) > maxPoints) {
      onError(COPY.pointsExceed);
      return;
    }
    if (selectedMethod === 'cash' && receivedAmount > 0 && changeAmount < 0) {
      onError(`받은 금액이 ${formatCurrency(-changeAmount)} 부족합니다.`);
      return;
    }
    if (selectedMethod === 'split') {
      if (splitCashAmount <= 0) {
        onError('복합 결제 시 현금 결제액을 입력해 주세요.');
        return;
      }
      if (splitReceivedAmount > 0 && splitChangeAmount < 0) {
        onError(`현금 받은 금액이 ${formatCurrency(-splitChangeAmount)} 부족합니다.`);
        return;
      }
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
                      {Boolean(line.discountAmount && line.discountAmount > 0) && (
                        <span className="ml-1 text-xs text-rose-600 font-medium">
                          (-{formatCurrency(line.discountAmount)})
                        </span>
                      )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POS_PAYMENT_OPTIONS.map((opt) => {
                const active = selectedMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(opt.id);
                      setPaymentMethod(opt.id);
                    }}
                    className={`min-h-[48px] rounded-xl text-sm font-bold border cursor-pointer transition-colors ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {/* 복합 결제 옵션 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('split');
                  setPaymentMethod('other');
                }}
                className={`min-h-[48px] rounded-xl text-sm font-bold border cursor-pointer transition-colors col-span-2 sm:col-span-1 ${
                  selectedMethod === 'split'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs ring-2 ring-teal-300'
                    : 'bg-teal-50/50 text-teal-800 border-teal-200 hover:bg-teal-100/50'
                }`}
              >
                복합 결제 (현금+카드)
              </button>
            </div>
          </section>

          {/* [개선안 1] 현금 결제 전용 받은 금액 & 거스름돈 계산기 */}
          {selectedMethod === 'cash' && (
            <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase tracking-wide">
                  <Calculator className="w-4 h-4 text-teal-600" />
                  <span>현금 계산기 (거스름돈 자동 계산)</span>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  결제 예정: {formatCurrency(payable)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  고객에게 받은 금액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={receivedInput ? Number(receivedInput).toLocaleString('ko-KR') : ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, '');
                      setReceivedInput(val);
                    }}
                    placeholder="받은 금액 입력"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-bold tabular-nums text-slate-900 focus:outline-teal-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    원
                  </span>
                </div>
              </div>

              {/* 빠른 지폐 및 금액 버튼 (모바일 터치 최적화) */}
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickCash(payable)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-bold hover:bg-teal-700 cursor-pointer text-center shadow-2xs"
                >
                  딱맞게
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(10000)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  1만원
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(50000)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  5만원
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(1000, true)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  +1천
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(5000, true)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  +5천
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(10000, true)}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  +1만
                </button>
                <button
                  type="button"
                  onClick={() => setReceivedInput('')}
                  className="col-span-3 sm:col-span-1 min-h-[42px] px-2 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-slate-200 cursor-pointer text-center"
                >
                  초기화
                </button>
              </div>

              {/* 거스름돈 / 부족액 실시간 안내 */}
              {receivedAmount > 0 && (
                <div
                  className={`p-3 rounded-xl flex items-center justify-between text-sm font-bold ${
                    changeAmount >= 0
                      ? 'bg-emerald-100/80 border border-emerald-300 text-emerald-900'
                      : 'bg-amber-100/80 border border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    <span>{changeAmount >= 0 ? '거슬러 줄 금액' : '부족한 금액'}</span>
                  </div>
                  <span className="text-base tabular-nums">
                    {changeAmount >= 0
                      ? formatCurrency(changeAmount)
                      : `${formatCurrency(-changeAmount)} 부족`}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* [개선안 1-2] 복합 결제 (현금 + 카드 분할 수납) 전용 섹션 */}
          {selectedMethod === 'split' && (
            <section className="space-y-3 rounded-2xl border border-teal-300 bg-teal-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase tracking-wide">
                  <Calculator className="w-4 h-4 text-teal-600" />
                  <span>복합 결제 (현금 수납 + 카드 분할)</span>
                </div>
                <span className="text-xs font-bold text-teal-900">
                  총 결제액: {formatCurrency(payable)}
                </span>
              </div>

              {/* 1단계: 현금 수납액 지정 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. 현금 결제 분할액
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={splitCashInput ? Number(splitCashInput).toLocaleString('ko-KR') : ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, '');
                      setSplitCashInput(val);
                    }}
                    placeholder="현금으로 받을 금액"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-bold tabular-nums text-slate-900 focus:outline-teal-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    원
                  </span>
                </div>
              </div>

              {/* 빠른 현금 분할 버튼 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitCashInput('5000')}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  5천원
                </button>
                <button
                  type="button"
                  onClick={() => setSplitCashInput('10000')}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  1만원
                </button>
                <button
                  type="button"
                  onClick={() => setSplitCashInput('20000')}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  2만원
                </button>
                <button
                  type="button"
                  onClick={() => setSplitCashInput('50000')}
                  className="min-h-[42px] px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer text-center shadow-2xs"
                >
                  5만원
                </button>
              </div>

              {/* 2단계: 자동 계산된 카드 결제액 카드 */}
              <div className="p-3 rounded-xl bg-white border border-teal-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">2. 카드 단말기 승인 요청액</p>
                  <p className="text-xs text-slate-400 mt-0.5">외부 카드단말기에 아래 금액을 긁어주세요</p>
                </div>
                <p className="text-lg font-black tabular-nums text-teal-700">
                  {formatCurrency(splitCardAmount)}
                </p>
              </div>

              {/* 3단계: 현금 거스름돈 계산 (선택) */}
              {splitCashAmount > 0 && (
                <div className="pt-2 border-t border-teal-200/60 space-y-2">
                  <label className="block text-xs font-bold text-slate-600">
                    고객에게 실제로 받은 현금 (거스름돈 계산)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={splitReceivedInput ? Number(splitReceivedInput).toLocaleString('ko-KR') : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setSplitReceivedInput(val);
                      }}
                      placeholder={`현금 수납액: ${formatCurrency(splitCashAmount)}`}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-bold tabular-nums text-slate-900 focus:outline-teal-600"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      원
                    </span>
                  </div>

                  {splitReceivedAmount > 0 && (
                    <div
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                        splitChangeAmount >= 0
                          ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100/90 text-rose-900 border border-rose-300'
                      }`}
                    >
                      <span>{splitChangeAmount >= 0 ? '현금 거스름돈' : '현금 부족액'}</span>
                      <span className="text-sm tabular-nums">
                        {splitChangeAmount >= 0
                          ? formatCurrency(splitChangeAmount)
                          : `${formatCurrency(-splitChangeAmount)} 부족`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex gap-2 p-4 sm:p-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            {COPY.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || lines.length === 0}
            className="flex-[1.4] min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {saving ? COPY.confirming : COPY.confirmSale}
          </button>
        </div>
      </form>
    </Modal>
  );
};
