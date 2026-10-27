import React, { useState } from 'react';
import { Textbook } from '@/types';
import { StorageService } from '@/services/storage';
import { useApp } from '@/context/AppContext';
import { X, PackagePlus, ArrowRight, Save, RotateCcw, SlidersHorizontal } from 'lucide-react';

interface StockAdjustModalProps {
  textbook: Textbook;
  onSuccess: () => void;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  textbook,
  onSuccess,
  onClose
}) => {
  const { showToast } = useApp();
  const [transactionType, setTransactionType] = useState<'inbound' | 'adjust' | 'return'>('inbound');
  const [deltaQuantity, setDeltaQuantity] = useState<number>(10);
  const [memo, setMemo] = useState('');

  const previousStock = textbook.stock;
  const currentCalculatedStock = Math.max(
    0,
    previousStock + (transactionType === 'inbound' || transactionType === 'return' ? deltaQuantity : deltaQuantity)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deltaQuantity === 0) {
      alert('수량 변동값을 입력해주세요.');
      return;
    }

    try {
      const res = await StorageService.adjustStock(
        textbook.id,
        deltaQuantity,
        transactionType,
        memo.trim()
      );

      if (res) {
        showToast(
          `재고가 성공적으로 반영되었습니다. (${previousStock}권 ➔ ${res.textbook.stock}권)`,
          'success'
        );
        onSuccess();
      }
    } catch (err: any) {
      alert(err.message || '재고 조정 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">교재 입고 및 재고 조정</h3>
              <p className="text-xs text-slate-500">교재 수량을 입고하거나 손망실 조정을 진행합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Target Textbook Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm">{textbook.title}</span>
              <p className="text-slate-500 text-[11px]">{textbook.publisher} | 정가 ₩{(textbook.salePrice || textbook.price).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400">현재 보유고</span>
              <p className="text-base font-black text-slate-800">{previousStock}권</p>
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">작업 유형</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('inbound');
                  if (deltaQuantity <= 0) setDeltaQuantity(10);
                }}
                className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  transactionType === 'inbound'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <PackagePlus className="w-3.5 h-3.5" />
                신규 입고
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('adjust')}
                className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  transactionType === 'adjust'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                수동 조정
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransactionType('return');
                  if (deltaQuantity <= 0) setDeltaQuantity(1);
                }}
                className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  transactionType === 'return'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                반품 입고
              </button>
            </div>
          </div>

          {/* Delta Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-semibold">
                변동 수량 (권) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {transactionType === 'adjust' ? '음수(-) 입력 시 차감' : '양수(+) 입력'}
              </span>
            </div>
            <input
              type="number"
              value={deltaQuantity}
              onChange={(e) => setDeltaQuantity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-base focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {/* Quick buttons */}
            <div className="flex gap-1.5 mt-2">
              {[5, 10, 20, 30].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDeltaQuantity(num)}
                  className="flex-1 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* Reason / Memo */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">입고 / 조정 사유</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 8월 신학기 정기 입고, 도서 파손 손실 처리 등"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Real-time Calculation */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">반영 후 예상 재고:</span>
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mt-0.5">
                <span className="text-slate-400">{previousStock}권</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-indigo-700 text-base font-black">
                  {currentCalculatedStock}권
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-medium">최소 기준 {textbook.minStock}권</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              재고 변동 적용
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
