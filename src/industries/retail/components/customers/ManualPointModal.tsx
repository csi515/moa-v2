import { useState, type FC } from 'react';
import { Modal, PageHeader } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { SaleCustomerPicker } from '../sales/SaleCustomerPicker';
import { applyPointManualAdjust } from '@/capabilities/commerce/loyalty/pointEarnService';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';

interface Props {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onCompleted: () => void;
  onError: (message: string) => void;
}

export const ManualPointModal: FC<Props> = ({
  isOpen,
  organizationId,
  onClose,
  onCompleted,
  onError,
}) => {
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      onError('고객을 선택해주세요.');
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      onError('올바른 포인트를 입력해주세요. (0 제외)');
      return;
    }

    setSaving(true);
    try {
      await applyPointManualAdjust({
        organizationId,
        customerId: customer.id,
        amount: parsed,
        description: description.trim() || '매장 수동 포인트 지급/차감',
      });
      onCompleted();
      onClose();
    } catch (err: any) {
      onError(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="포인트 수동 지급/차감">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            회원 검색 (이름 또는 전화번호 뒷자리)
          </label>
          <SaleCustomerPicker
            organizationId={organizationId}
            customer={customer}
            onChange={setCustomer}
            onError={onError}
          />
        </div>

        <FormField label="포인트 금액 (+적립 / -차감)" required>
          <input
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={FORM_CONTROL_CLASS + " min-h-[44px]"}
            placeholder="예: 500 (적립), -500 (차감)"
          />
        </FormField>

        <FormField label="사유/메모">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={FORM_CONTROL_CLASS + " min-h-[44px]"}
            placeholder="예: 방문 이벤트 적립"
          />
        </FormField>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || !customer}
            className="flex-1 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl disabled:opacity-60"
          >
            {saving ? '처리 중...' : '적용하기'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
