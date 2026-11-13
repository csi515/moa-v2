import React, { useState } from 'react';
import { Copy, Check, Share2, MessageSquare, Building, Calendar, DollarSign, X } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import { formatCurrency } from '@/utils/formatters';
import { showToast } from '@/shared/feedback/uiFeedback';

interface TuitionInvoiceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: TuitionInvoice | null;
  academyName: string;
  bankAccountText: string;
  guardianName?: string;
}

export function buildTuitionNoticeMessage(params: {
  academyName: string;
  studentName: string;
  guardianName?: string;
  yearMonth: string;
  totalAmount: number;
  unpaidAmount: number;
  dueDate: string;
  bankAccountText: string;
}): string {
  const org = params.academyName || '학원';
  const guardianGreeting = params.guardianName
    ? `${params.guardianName} 학부모님`
    : `${params.studentName} 학생 학부모님`;
  const [year, month] = params.yearMonth.split('-');
  const ymLabel = year && month ? `${year}년 ${Number(month)}월` : params.yearMonth;
  const targetAmount = params.unpaidAmount > 0 ? params.unpaidAmount : params.totalAmount;
  const accountInfo = params.bankAccountText
    ? `- 입금 계좌: ${params.bankAccountText}`
    : '- 입금 계좌: 학원으로 문의 부탁드립니다.';

  return `[${org}] ${guardianGreeting} 안녕하세요!

${ymLabel} 수강료 납부 안내드립니다.

- 고객명: ${params.studentName}
- 수강료: ${formatCurrency(targetAmount)}
- 납부기한: ${params.dueDate || '해당월 10일'}
${accountInfo}

자녀의 알림장, 출결 및 시간표는 '모아 학부모 앱'에서도 실시간으로 확인하실 수 있습니다.
궁금하신 점은 언제든 학원으로 편하게 연락해 주세요. 감사합니다.`;
}

export const TuitionInvoiceShareModal: React.FC<TuitionInvoiceShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
  academyName,
  bankAccountText,
  guardianName,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const defaultMessage = buildTuitionNoticeMessage({
    academyName,
    studentName: invoice.studentName,
    guardianName,
    yearMonth: invoice.yearMonth,
    totalAmount: invoice.totalAmount,
    unpaidAmount: invoice.unpaidAmount,
    dueDate: invoice.dueDate,
    bankAccountText,
  });

  const [message, setMessage] = useState(defaultMessage);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('클립보드에 복사되었습니다! 카카오톡이나 문자에 붙여넣기(Ctrl+V) 하세요.', 'success');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `[${academyName}] ${invoice.yearMonth} 원비 납부 안내`,
          text: message,
        });
        showToast('청구 안내를 공유했습니다.', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          void handleCopy('msg', message);
        }
      }
    } else {
      void handleCopy('msg', message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${invoice.studentName} 수강료 카톡/문자 안내`}
      maxWidth="md"
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* 청구 정보 요약 카드 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block">청구월 / 대상자</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {invoice.yearMonth} · {invoice.studentName}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-semibold block">청구(미납) 금액</span>
            <span className="font-black text-indigo-600 text-base mt-0.5 block">
              {formatCurrency(invoice.unpaidAmount > 0 ? invoice.unpaidAmount : invoice.totalAmount)}
            </span>
          </div>
        </div>

        {/* 입금 계좌 안내 경고 배너 (계좌 미등록 시) */}
        {!bankAccountText && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            ⚠️ 학원 입금 계좌번호가 아직 등록되지 않았습니다. 학원 설정에서 계좌를 등록하시면 안내 문구에 계좌가 자동 삽입됩니다.
          </div>
        )}

        {/* 메시지 에디터 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>카카오톡 / 문자 발송 문구</span>
            </label>
            <span className="text-[10px] text-slate-400">필요 시 수정하여 전송할 수 있습니다</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 액션 버튼 */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => void handleCopy('msg', message)}
            className="flex-1 min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedKey === 'msg' ? (
              <>
                <Check className="w-4 h-4" />
                <span>문구 복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>카톡 / 문자 문구 전체 복사</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>카톡 / 앱으로 공유</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
