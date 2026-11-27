import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  User,
  FileCheck,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react';
import type { AdminTenantSummary } from '@/services/admin/adminTenantService';

interface ManualPaymentModalProps {
  tenant: AdminTenantSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (data: {
    amount: number;
    depositorName: string;
    extendedMonths: number;
    isTaxInvoiceIssued: boolean;
    memo?: string;
  }) => Promise<void>;
}

const EXTEND_MONTHS_OPTIONS = [
  { label: '1개월', value: 1, amount: 30000 },
  { label: '3개월', value: 3, amount: 90000 },
  { label: '6개월 (5% 할인)', value: 6, amount: 171000 },
  { label: '1년 (15% 할인)', value: 12, amount: 306000 },
];

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onApprove,
}) => {
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [amount, setAmount] = useState<number>(30000);
  const [depositorName, setDepositorName] = useState<string>('');
  const [isTaxInvoiceIssued, setIsTaxInvoiceIssued] = useState<boolean>(false);
  const [memo, setMemo] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;

  const handleSelectMonths = (opt: (typeof EXTEND_MONTHS_OPTIONS)[0]) => {
    setSelectedMonths(opt.value);
    setAmount(opt.amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositorName.trim()) {
      setError('입금자명을 입력해주세요.');
      return;
    }
    if (amount <= 0) {
      setError('올바른 입금 금액을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onApprove({
        amount,
        depositorName: depositorName.trim(),
        extendedMonths: selectedMonths,
        isTaxInvoiceIssued,
        memo: memo.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '납부 승인 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">계좌이체 수동 납부 확인</h3>
              <p className="text-xs text-slate-500">
                {tenant.name} ({tenant.publicCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 현재 구독 상태 안내 */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">현재 만료일</span>
              <span className="font-bold text-slate-950 text-sm">
                {tenant.subscriptionExpiresAt || '설정 없음 (체험중)'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">현재 플랜 / 상태</span>
              <span className="font-semibold text-slate-900">
                {tenant.subscriptionPlan} · {tenant.subscriptionStatus}
              </span>
            </div>
          </div>

          {/* 1. 연장 개월 수 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              이용 기간 연장 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXTEND_MONTHS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectMonths(opt)}
                  className={`py-2 px-3 rounded-xl border text-left transition-all ${
                    selectedMonths === opt.value
                      ? 'border-slate-900 bg-slate-50/50 text-slate-900 font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className="text-[11px] text-slate-500">
                    ₩{opt.amount.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 입금 금액 & 입금자명 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                실제 입금 금액 (₩)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="예: 30000"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                입금자명 (통장 표기)
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="예: 홍길동 / (주)대성"
                required
              />
            </div>
          </div>

          {/* 3. 세금계산서 발행 여부 */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={isTaxInvoiceIssued}
              onChange={(e) => setIsTaxInvoiceIssued(e.target.checked)}
              className="w-4 h-4 rounded text-slate-800 focus:ring-slate-900 border-slate-300"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">
                전자세금계산서 / 현금영수증 발행 완료
              </span>
              <p className="text-[11px] text-slate-500">
                국세청 홈택스 또는 PG사를 통해 사업자 증빙이 발행된 경우 체크합니다.
              </p>
            </div>
          </label>

          {/* 4. 비고 / 메모 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              관리자 메모 (선택)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="예: 기업은행 입금 확인, 1년 선납 특별 할인 적용"
            />
          </div>

          {/* 이전 납부 이력 (최근 2건만 미리보기) */}
          {tenant.paymentLogs && tenant.paymentLogs.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1.5">
                <History className="w-3.5 h-3.5" />
                최근 납부 승인 내역
              </span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {tenant.paymentLogs.slice(0, 2).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 flex justify-between"
                  >
                    <span>
                      ₩{log.amount.toLocaleString()} ({log.depositorName}) +{log.extendedMonths}개월
                    </span>
                    <span className="text-slate-400">
                      {log.approvedAt ? log.approvedAt.split('T')[0] : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 transition-all shadow-sm flex items-center gap-1.5"
            >
              {submitting ? '처리 중...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  납부 승인 및 {selectedMonths}개월 연장
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
