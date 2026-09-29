import React, { useState, useEffect } from 'react';
import { Textbook } from '@/types';
import { X, BookOpen, AlertCircle, Save, Check } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';

interface TextbookFormModalProps {
  textbook?: Textbook | null;
  onSave: (data: Partial<Textbook> & { title: string }) => void;
  onClose: () => void;
}

const COMMON_PUBLISHERS = ['세광음악출판사', '삼호ETM', '상지원', '음악춘추', '현대음악출판사', '아름출판사', '기타출판'];
const COMMON_LEVELS = ['기초/유치부', '바이엘 기초', '바이엘 상/하', '체르니 100', '체르니 30', '체르니 40/50', '중급/소나티네', '고급/명곡', '성인/실용음악', '전 레벨 공통'];

export const TextbookFormModal: React.FC<TextbookFormModalProps> = ({
  textbook,
  onSave,
  onClose
}) => {
  const isEditing = !!textbook;

  const [title, setTitle] = useState(textbook?.title || '');
  const [publisher, setPublisher] = useState(textbook?.publisher || '세광음악출판사');
  const [customPublisher, setCustomPublisher] = useState('');
  const [author, setAuthor] = useState(textbook?.author || '');
  const [isbn, setIsbn] = useState(textbook?.isbn || '');
  const [level, setLevel] = useState(textbook?.level || '기초/유치부');
  const [salePrice, setSalePrice] = useState<number>(textbook?.salePrice || textbook?.price || 15000);
  const [costPrice, setCostPrice] = useState<number>(textbook?.costPrice || 9000);
  const [stock, setStock] = useState<number>(textbook?.stock !== undefined ? textbook.stock : 10);
  const [minStock, setMinStock] = useState<number>(textbook?.minStock !== undefined ? textbook.minStock : 5);
  const [isForSale, setIsForSale] = useState<boolean>(textbook?.isForSale !== undefined ? textbook.isForSale : true);
  const [memo, setMemo] = useState(textbook?.memo || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const err: Record<string, string> = {};
    if (!title.trim()) {
      err.title = '교재명을 입력해주세요.';
    }
    if (salePrice < 0) {
      err.salePrice = '판매가격은 0원 이상이어야 합니다.';
    }
    if (costPrice < 0) {
      err.costPrice = '매입가격은 0원 이상이어야 합니다.';
    }
    if (stock < 0) {
      err.stock = '재고 수량은 0개 이상이어야 합니다.';
    }
    if (minStock < 0) {
      err.minStock = '최소 재고 수량은 0개 이상이어야 합니다.';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalPublisher = publisher === '직접입력' ? customPublisher.trim() || '기타' : publisher;

    onSave({
      id: textbook?.id,
      title: title.trim(),
      publisher: finalPublisher,
      author: author.trim(),
      isbn: isbn.trim(),
      level: level.trim(),
      price: salePrice,
      salePrice,
      costPrice,
      stock,
      minStock,
      isForSale,
      memo: memo.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? '교재 정보 수정' : '신규 교재 등록'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? '교재 정보 및 재고 기준을 수정합니다.' : '학원에서 판매할 새 교재와 초기 재고를 등록합니다.'}
              </p>
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
          {/* 교재명 */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              교재명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 피아노 기초 1권, 체르니 100번"
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                errors.title ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 bg-white'
              } text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm`}
            />
            {errors.title && <p className="text-rose-500 text-[11px] mt-1">{errors.title}</p>}
          </div>

          {/* 출판사 & 저자 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">출판사</label>
              <select
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {COMMON_PUBLISHERS.map((pub) => (
                  <option key={pub} value={pub}>
                    {pub}
                  </option>
                ))}
                <option value="직접입력">직접 입력...</option>
              </select>
              {publisher === '직접입력' && (
                <input
                  type="text"
                  value={customPublisher}
                  onChange={(e) => setCustomPublisher(e.target.value)}
                  placeholder="출판사명 입력"
                  className="w-full mt-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">저자 / 편저</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="예: C. 체르니, 음악교육연구회"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ISBN & 단계/레벨 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">ISBN (선택)</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="예: 978-89-03-12001-4"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">단계 / 레벨</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {COMMON_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 판매가격 & 매입가격 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                판매가격 (₩) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={salePrice}
                onChange={setSalePrice}
                showQuickButtons
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                매입가격 (원가 ₩)
              </label>
              <CurrencyInput
                value={costPrice}
                onChange={setCostPrice}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                마진: ₩{(salePrice - costPrice).toLocaleString()} (
                {salePrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0}%)
              </p>
            </div>
          </div>

          {/* 현재 재고 & 최소 재고 & 판매 여부 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {isEditing ? '현재 재고 (권)' : '초기 입고 재고 (권)'}
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                최소 유지 재고 (권)
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">이하 도달 시 재고 부족 알림</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">판매 상태</label>
              <div className="flex items-center h-10">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isForSale}
                    onChange={(e) => setIsForSale(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-xs font-medium text-slate-700">
                    {isForSale ? '판매 중' : '판매 중단'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">교재 설명 및 메모</label>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 초등 저학년 추천, 바이엘 후반 필수 진도"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
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
              {isEditing ? '변경사항 저장' : '교재 등록 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
