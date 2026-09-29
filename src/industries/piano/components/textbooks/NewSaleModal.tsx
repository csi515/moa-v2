import React, { useState, useEffect } from 'react';
import { Student, Textbook, PaymentMethod } from '@/types';
import { StorageService } from '@/services/storage';
import { useApp } from '@/context/AppContext';
import { X, ShoppingBag, User, BookOpen, Calculator, AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { todayIsoLocal } from '@/shared/utils/localDate';

interface NewSaleModalProps {
  initialStudentId?: string;
  initialTextbookId?: string;
  onSuccess: (saleId: string) => void;
  onClose: () => void;
  /** 활성 교재가 없을 때 교재 관리로 이동 */
  onRegisterTextbooks?: () => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  initialStudentId,
  initialTextbookId,
  onSuccess,
  onClose,
  onRegisterTextbooks,
}) => {
  const { showToast, setActiveTab } = useApp();
  const students = StorageService.getStudents().filter((s) => s.status === 'active');
  const textbooks = StorageService.getActiveTextbooks
    ? StorageService.getActiveTextbooks()
    : StorageService.getTextbooks().filter((t) => t.isForSale !== false);

  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || (students[0]?.id || ''));
  const [selectedTextbookId, setSelectedTextbookId] = useState(
    initialTextbookId && textbooks.some((t) => t.id === initialTextbookId)
      ? initialTextbookId
      : textbooks[0]?.id || ''
  );
  const [saleDate, setSaleDate] = useState(todayIsoLocal);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(15000);
  const [discount, setDiscount] = useState<number>(0);
  const [initialPaymentType, setInitialPaymentType] = useState<'full' | 'partial' | 'unpaid'>('full');
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [memo, setMemo] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [textbookSearch, setTextbookSearch] = useState('');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedTextbook = textbooks.find((t) => t.id === selectedTextbookId);

  // When selected textbook changes, update default unitPrice
  useEffect(() => {
    if (selectedTextbook) {
      const price = selectedTextbook.salePrice || selectedTextbook.price || 15000;
      setUnitPrice(price);
    }
  }, [selectedTextbookId, selectedTextbook]);

  // Calculations
  const calculatedTotal = Math.max(0, quantity * unitPrice - discount);

  // Calculate actual initial paid amount
  let paidAmount = 0;
  if (initialPaymentType === 'full') {
    paidAmount = calculatedTotal;
  } else if (initialPaymentType === 'partial') {
    paidAmount = Math.min(calculatedTotal, Math.max(0, customPaidAmount));
  } else {
    paidAmount = 0;
  }

  const unpaidAmount = Math.max(0, calculatedTotal - paidAmount);
  const status: 'paid' | 'partial' | 'unpaid' =
    unpaidAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const isStockLow = selectedTextbook ? selectedTextbook.stock < quantity : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId) {
      showToast('학생을 선택해주세요.', 'warning');
      return;
    }
    if (!selectedTextbookId) {
      showToast('교재를 선택해주세요.', 'warning');
      return;
    }
    if (quantity <= 0) {
      showToast('판매 수량은 1권 이상이어야 합니다.', 'warning');
      return;
    }

    try {
      const res = await StorageService.createSale({
        studentId: selectedStudentId,
        textbookId: selectedTextbookId,
        quantity,
        unitPrice,
        discount,
        initialPaymentAmount: paidAmount,
        paymentMethod: paidAmount > 0 ? paymentMethod : null,
        saleDate,
        memo: memo.trim()
      });

      showToast(
        `교재 판매가 완료되었습니다! (재고 ${selectedTextbook?.stock}권 ➔ ${res.transaction.currentStock}권 차감)`,
        'success'
      );
      onSuccess(res.sale.id);
    } catch (err: any) {
      showToast(err.message || '교재 판매 등록 중 오류가 발생했습니다.', 'error');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.school && s.school.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.parentPhone && s.parentPhone.includes(studentSearch))
  );

  const filteredTextbooks = textbooks.filter(
    (t) =>
      t.title.toLowerCase().includes(textbookSearch.toLowerCase()) ||
      t.publisher.toLowerCase().includes(textbookSearch.toLowerCase()) ||
      (t.level && t.level.toLowerCase().includes(textbookSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">학생 교재 판매 등록</h3>
              <p className="text-xs text-slate-500">
                학생에게 교재를 지급/판매하며, 교재 재고가 자동으로 차감됩니다.
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
          {/* 1. 학생 및 판매일 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">
                  학생 선택 <span className="text-rose-500">*</span>
                </label>
                {students.length > 5 && (
                  <input
                    type="text"
                    placeholder="학생 검색..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="text-[11px] px-2 py-0.5 border border-slate-200 rounded-md w-28"
                  />
                )}
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.grade || '일반'} / {s.level || '레벨미정'} / 학부모: {s.parentName || '미지정'})
                  </option>
                ))}
              </select>
              {selectedStudent && (
                <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>학부모: {selectedStudent.parentName || '미지정'} ({selectedStudent.parentPhone || '-'})</span>
                  <span>담당: {selectedStudent.teacherName || '원장'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                판매일자 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 2. 교재 선택 및 재고 알림 */}
          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/70 space-y-3">
            {textbooks.length === 0 ? (
              <div className="text-center space-y-3 py-4">
                <BookOpen className="w-8 h-8 text-indigo-300 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800">등록된 교재가 없습니다</p>
                  <p className="text-xs text-slate-500 mt-1">
                    교재 마스터를 먼저 등록한 뒤 학생에게 일회성으로 판매할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRegisterTextbooks) onRegisterTextbooks();
                    else setActiveTab('textbooks');
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  교재 등록하기
                </button>
              </div>
            ) : (
              <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-800 font-semibold">
                  판매할 교재 선택 <span className="text-rose-500">*</span>
                </label>
                {textbooks.length > 5 && (
                  <input
                    type="text"
                    placeholder="교재명/출판사 검색..."
                    value={textbookSearch}
                    onChange={(e) => setTextbookSearch(e.target.value)}
                    className="text-[11px] px-2 py-0.5 border border-indigo-200 bg-white rounded-md w-36"
                  />
                )}
              </div>
              <select
                value={selectedTextbookId}
                onChange={(e) => setSelectedTextbookId(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-indigo-200 bg-white text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {filteredTextbooks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} - {t.publisher} (정가 ₩{(t.salePrice || t.price).toLocaleString()} | 재고 {t.stock}권)
                  </option>
                ))}
              </select>
            </div>

            {selectedTextbook && (
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-indigo-700 font-medium">
                    {selectedTextbook.level}
                  </span>
                  <span className="text-slate-500">현재 보유 재고:</span>
                  <span className={`font-bold ${selectedTextbook.stock <= selectedTextbook.minStock ? 'text-amber-600' : 'text-slate-800'}`}>
                    {selectedTextbook.stock}권
                  </span>
                </div>
                {isStockLow && (
                  <div className="flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    현재 재고({selectedTextbook.stock}권)가 판매 수량보다 부족합니다.
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>

          {/* 3. 수량, 단가, 할인, 최종금액 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">수량 (권)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">판매단가 (₩)</label>
              <CurrencyInput
                value={unitPrice}
                onChange={setUnitPrice}
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">할인금액 (₩)</label>
              <CurrencyInput
                value={discount}
                onChange={setDiscount}
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">최종 판매금액</label>
              <div className="w-full px-3 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-700 font-black text-sm flex items-center h-[42px]">
                ₩{calculatedTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 4. 현장 수납 및 결제 방식 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <label className="block text-slate-800 font-bold">현장 수납 및 납부 상태</label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInitialPaymentType('full')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  initialPaymentType === 'full'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                현장 전액 완납
              </button>

              <button
                type="button"
                onClick={() => {
                  setInitialPaymentType('partial');
                  if (customPaidAmount === 0) setCustomPaidAmount(Math.round(calculatedTotal / 2));
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  initialPaymentType === 'partial'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                일부 부분 납부
              </button>

              <button
                type="button"
                onClick={() => setInitialPaymentType('unpaid')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  initialPaymentType === 'unpaid'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                나중에 수납 (미납)
              </button>
            </div>

            {/* If partial payment, show amount input */}
            {initialPaymentType === 'partial' && (
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold">이번 납부할 금액 (₩)</label>
                  <span className="text-xs font-bold text-rose-600">
                    미납 잔액: ₩{(calculatedTotal - customPaidAmount).toLocaleString()}
                  </span>
                </div>
                <CurrencyInput
                  value={customPaidAmount}
                  onChange={setCustomPaidAmount}
                  max={calculatedTotal}
                  showQuickButtons
                />
              </div>
            )}

            {/* Payment Method (if paid > 0) */}
            {paidAmount > 0 && (
              <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                <span className="text-slate-600 font-semibold shrink-0">결제 수단:</span>
                <div className="flex gap-2 flex-1">
                  {(['card', 'transfer', 'cash', 'other'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        paymentMethod === method
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'card' ? '신용카드' : method === 'transfer' ? '계좌이체' : method === 'cash' ? '현금' : '기타'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. 메모 */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">판매 메모 / 비고</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 신학기 진도 교재 지급, 수강료 납부일에 잔액 합산 요청 등"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Real-time Summary Card */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-400">판매 요약: {selectedStudent?.name} - {selectedTextbook?.title} ({quantity}권)</p>
              <p className="font-semibold text-slate-200">
                수납: ₩{paidAmount.toLocaleString()} / 미납 잔액: ₩{unpaidAmount.toLocaleString()} (
                {status === 'paid' ? '완납' : status === 'partial' ? '일부납부' : '미납'})
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">판매 후 재고</p>
              <p className="text-base font-bold text-amber-400">
                {selectedTextbook ? selectedTextbook.stock - quantity : 0}권
              </p>
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
              disabled={textbooks.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 disabled:pointer-events-none"
            >
              <ShoppingBag className="w-4 h-4" />
              교재 판매 등록 (재고 자동 차감)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
