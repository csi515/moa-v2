import React, { useState } from 'react';
import { useCreate } from '@refinedev/core';
import { X, Tag, Calendar, AlertCircle } from 'lucide-react';
import { validatePromoDraft, type PromoTargetType } from '../domain/promoEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PromotionFormModal: React.FC<PromotionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { mutate: createDeal } = useCreate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [targetType, setTargetType] = useState<PromoTargetType>('PASS');
  const [targetId, setTargetId] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [specialPrice, setSpecialPrice] = useState<number | ''>('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [limitedQuantity, setLimitedQuantity] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const draft = {
      title,
      target_type: targetType,
      target_id: targetId.trim() || `ITEM-${Date.now().toString().slice(-4)}`,
      original_price: Number(originalPrice) || 0,
      special_price: Number(specialPrice) || 0,
      start_at: startAt,
      end_at: endAt,
      limited_quantity: limitedQuantity !== '' ? Number(limitedQuantity) : null,
      is_active: true,
    };

    const validation = validatePromoDraft(draft);
    if (!validation.isValid) {
      setFormError(validation.error || '입력값을 다시 확인해 주세요.');
      return;
    }

    setIsSubmitting(true);
    createDeal(
      {
        resource: 'promotional_deals',
        values: {
          ...draft,
          sold_quantity: 0,
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          showToast('새 [기간 한정 특가] 이벤트가 성공적으로 등록되었습니다.', 'success');
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          setIsSubmitting(false);
          setFormError(error?.message || '이벤트 등록에 실패했습니다. 다시 시도해 주세요.');
        },
      }
    );
  };

  // 실시간 할인율 계산
  const orig = Number(originalPrice) || 0;
  const spec = Number(specialPrice) || 0;
  const calculatedDiscountRate =
    orig > 0 && spec < orig ? Math.round(((orig - spec) / orig) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                새 [기간 한정 특가] 등록
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                사업주가 원하는 기간 동안 특별 할인 가격과 한정 수량을 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 이벤트 제목 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              이벤트 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: [이벤트 할인] 봄맞이 기구 필라테스 3개월권 30% 특가"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
            />
          </div>

          {/* 대상 구분 및 품목 코드/명 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                할인 대상 유형 <span className="text-red-500">*</span>
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as PromoTargetType)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
              >
                <option value="PASS">수강권 / 회원권 (PASS)</option>
                <option value="RETAIL">소매 상품 / 장비 (RETAIL)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                대상 품목명 또는 ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 3개월 프리미엄 정기권"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 정상 가격 및 특별 할인가 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                정상 가격 (정가) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs font-medium text-slate-400">₩</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="300000"
                  value={originalPrice}
                  onChange={(e) =>
                    setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full pl-8 pr-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  특별 할인가 (특가) <span className="text-red-500">*</span>
                </label>
                {calculatedDiscountRate > 0 && (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                    -{calculatedDiscountRate}% 할인
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs font-medium text-slate-400">₩</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="210000"
                  value={specialPrice}
                  onChange={(e) =>
                    setSpecialPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full pl-8 pr-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* 진행 기간 (시작 일시 ~ 종료 일시) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  특가 시작 일시 <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  특가 종료 일시 <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 한정 판매 수량 (선택 사항) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              한정 판매 수량 (선택)
            </label>
            <input
              type="number"
              min="1"
              placeholder="미입력 시 기간 내 무제한 판매"
              value={limitedQuantity}
              onChange={(e) =>
                setLimitedQuantity(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              * 설정한 수량이 모두 소진되면 기간 내라도 자동으로 정가 판매로 복귀합니다.
            </p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '[기간 한정 특가] 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
