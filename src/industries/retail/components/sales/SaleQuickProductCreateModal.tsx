import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Sparkles, PackagePlus, Barcode, Check } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import type { SaleCatalogItem } from '../../types/sale';

interface Props {
  isOpen: boolean;
  organizationId: string;
  initialBarcode: string;
  onClose: () => void;
  onSuccess: (item: SaleCatalogItem) => void;
  onError: (message: string) => void;
}

/**
 * POS 판매 중 미등록 기성품 바코드를 찍었을 때 3초 만에 즉석 등록하고 장바구니에 담는 모달
 */
export const SaleQuickProductCreateModal: FC<Props> = ({
  isOpen,
  organizationId,
  initialBarcode,
  onClose,
  onSuccess,
  onError,
}) => {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('10');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBarcode(initialBarcode.trim());
      setName('');
      setPrice('');
      setInitialStock('10');
    }
  }, [isOpen, initialBarcode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      onError('상품명을 입력해 주세요.');
      return;
    }
    const priceNum = Number(price.replace(/[^\d]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      onError('올바른 판매 가격을 입력해 주세요.');
      return;
    }

    const stockNum = Number(initialStock.replace(/[^\d]/g, '')) || 0;

    setSaving(true);
    try {
      // 1. 상품 DB 등록
      const created = await productService.saveProduct(organizationId, {
        name: cleanName,
        productCode: barcode.trim() || null,
        price: priceNum,
        isActive: true,
      });

      // 2. 기초 재고 입고 (0개 초과 시)
      if (stockNum > 0) {
        try {
          await inventoryService.applyInbound({
            organizationId,
            productId: created.id,
            quantity: stockNum,
            reason: '신규 상품 즉석 등록 기초 재고',
          });
        } catch {
          // 재고 입고 실패해도 상품 등록 및 판매는 진행
        }
      }

      const catalogItem: SaleCatalogItem = {
        key: `p:${created.id}`,
        productId: created.id,
        variantId: null,
        productName: created.name,
        variantName: null,
        productCode: created.productCode,
        unitPrice: created.price,
      };

      onSuccess(catalogItem);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : '상품 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 상품 즉석 등록 (3초 완성)" maxWidth="sm">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">미등록 기성품 바코드가 감지되었습니다.</p>
            <p className="text-[11px] text-teal-700 mt-0.5">
              상품명과 가격만 입력하면 즉시 등록되어 장바구니에 +1 담깁니다.
            </p>
          </div>
        </div>

        <FormField label="스캔된 기성품 바코드" required>
          <div className="relative">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-mono text-sm pl-9`}
              placeholder="바코드 번호"
            />
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </FormField>

        <FormField label="상품명" required>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder="예: 신라면, 코카콜라 500ml"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="판매 가격 (원)" required>
            <input
              type="text"
              inputMode="numeric"
              required
              value={price ? Number(price).toLocaleString('ko-KR') : ''}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums`}
              placeholder="예: 1,500"
            />
          </FormField>

          <FormField label="기초 입고 재고">
            <input
              type="text"
              inputMode="numeric"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value.replace(/[^\d]/g, ''))}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums`}
              placeholder="수량 (개)"
            />
          </FormField>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[1.4] min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {saving ? (
              '등록 중...'
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>등록 후 바로 담기</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
