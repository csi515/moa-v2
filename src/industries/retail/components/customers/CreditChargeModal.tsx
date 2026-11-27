import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { Wallet, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import { idempotencyCapability } from '@/core/idempotency';
import { creditWalletService } from '@/capabilities/credit_wallet';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';
import { SaleCustomerPicker } from '../sales/SaleCustomerPicker';

interface Props {
  isOpen: boolean;
  organizationId: string;
  initialCustomer?: CustomerSearchResult | null;
  onClose: () => void;
  onCompleted: () => void;
  onError: (message: string) => void;
}

const QUICK_AMOUNTS = [10000, 30000, 50000, 100000, 300000, 500000] as const;

export const CreditChargeModal: FC<Props> = ({
  isOpen,
  organizationId,
  initialCustomer = null,
  onClose,
  onCompleted,
  onError,
}) => {
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(initialCustomer);
  const [amountInput, setAmountInput] = useState('');
  const [bonusInput, setBonusInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [memo, setMemo] = useState('');
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomer(initialCustomer);
      setAmountInput('');
      setBonusInput('');
      setPaymentMethod('cash');
      setMemo('');
    }
  }, [isOpen, initialCustomer]);

  useEffect(() => {
    if (!isOpen || !organizationId || !customer) {
      setCurrentBalance(0);
      return;
    }
    let cancelled = false;
    setLoadingBalance(true);
    void (async () => {
      try {
        const wallet = await creditWalletService.getWallet(organizationId, customer.id);
        if (!cancelled) {
          setCurrentBalance(wallet.totalBalance);
        }
      } catch {
        if (!cancelled) setCurrentBalance(0);
      } finally {
        if (!cancelled) setLoadingBalance(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, organizationId, customer]);

  const chargeAmount = useMemo(() => {
    const val = Number(amountInput.replace(/[^\d]/g, ''));
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [amountInput]);

  const bonusAmount = useMemo(() => {
    const val = Number(bonusInput.replace(/[^\d]/g, ''));
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [bonusInput]);

  const totalCreditAmount = chargeAmount + bonusAmount;
  const expectedBalance = currentBalance + totalCreditAmount;

  const handleQuickAdd = (add: number) => {
    setAmountInput(String(chargeAmount + add));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!customer) {
      onError('충전할 고객을 선택해 주세요.');
      return;
    }
    if (chargeAmount <= 0) {
      onError('충전 금액을 1원 이상 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const idempotencyKey = idempotencyCapability.newKey();
      const methodLabel =
        paymentMethod === 'card'
          ? '카드'
          : paymentMethod === 'transfer'
          ? '계좌이체'
          : '현금';
      const description = memo.trim()
        ? `${memo.trim()} (${methodLabel})`
        : `예치금 충전 (${methodLabel})`;

      await creditWalletService.chargeCredit({
        organizationId,
        customerId: customer.id,
        amount: chargeAmount,
        bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
        description,
        idempotencyKey,
      });

      onCompleted();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : '예치금 충전에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="예치금 / 선입금 충전"
      maxWidth="md"
      intent="form"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {/* 고객 선택 영역 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            충전 대상 회원
          </label>
          <SaleCustomerPicker
            organizationId={organizationId}
            customer={customer}
            onChange={setCustomer}
            onError={onError}
          />
        </div>

        {/* 현재 잔액 안내 */}
        {customer && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-teal-900">
                {customer.name} 님의 현재 보유 예치금
              </span>
            </div>
            <span className="text-base font-black tabular-nums text-teal-700">
              {loadingBalance ? '조회 중…' : formatCurrency(currentBalance)}
            </span>
          </div>
        )}

        {/* 충전 금액 입력 */}
        <FormField label="충전 금액 (원)" required>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              required
              value={chargeAmount > 0 ? chargeAmount.toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, '');
                setAmountInput(val);
              }}
              className={FORM_CONTROL_CLASS + " min-h-[48px] pr-10 text-base font-bold tabular-nums"}
              placeholder="충전할 실결제 금액 입력"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
              원
            </span>
          </div>
        </FormField>

        {/* 빠른 금액 증액 버튼 */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAdd(amt)}
              className="min-h-[40px] px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer text-center shadow-2xs transition-colors"
            >
              +{amt >= 10000 ? `${amt / 10000}만` : `${amt}`}
            </button>
          ))}
        </div>

        {/* 보너스 충전액 (선택) */}
        <FormField label="보너스 지급액 (추가 적립)" hint="이벤트나 선입금 우대 적립 시 보너스로 추가될 금액을 입력합니다">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={bonusAmount > 0 ? bonusAmount.toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, '');
                setBonusInput(val);
              }}
              className={FORM_CONTROL_CLASS + " min-h-[44px] pr-10 text-sm font-bold tabular-nums"}
              placeholder="0 (선택 사항)"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              원
            </span>
          </div>
        </FormField>

        {/* 수납 수단 선택 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            수납 수단
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'cash', label: '현금' },
                { id: 'card', label: '카드' },
                { id: 'transfer', label: '계좌이체' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`min-h-[44px] rounded-xl text-sm font-bold border cursor-pointer transition-colors ${
                  paymentMethod === m.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 메모 / 비고 */}
        <FormField label="충전 사유 / 비고">
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={FORM_CONTROL_CLASS + " min-h-[44px] text-sm"}
            placeholder="예: VIP 선결제 이벤트 우대 충전"
          />
        </FormField>

        {/* 충전 요약 카드 */}
        {chargeAmount > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>수납 금액</span>
              <span className="font-bold tabular-nums text-slate-900">
                {formatCurrency(chargeAmount)}
              </span>
            </div>
            {bonusAmount > 0 && (
              <div className="flex justify-between items-center text-teal-800">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  보너스 추가 적립
                </span>
                <span className="font-bold tabular-nums text-teal-700">
                  +{formatCurrency(bonusAmount)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-teal-200/80 flex justify-between items-center font-bold">
              <span className="text-slate-800">충전 후 총 보유액</span>
              <span className="text-base tabular-nums text-teal-800 font-black">
                {formatCurrency(expectedBalance)}
              </span>
            </div>
          </div>
        )}

        <div className="pt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || !customer || chargeAmount <= 0}
            className="flex-[1.5] min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {saving ? (
              '충전 처리 중…'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                충전 완료 ({formatCurrency(totalCreditAmount)})
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
