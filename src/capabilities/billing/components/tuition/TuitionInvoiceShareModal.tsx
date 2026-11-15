/**
 * [수납] 학부모/회원 청구서 카카오톡/문자 발송 모달
 *
 * 카카오 알림톡/문자 발송 템플릿 문구를 자동 생성하고
 * 클립보드 복사 및 외부 앱 공유를 원클릭으로 지원합니다.
 */

import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Copy, Share2, Check, MessageSquare } from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';

function formatCurrency(amount: number): string {
  return `${Number(amount || 0).toLocaleString()}원`;
}

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
  const org = params.academyName || '사업장';
  const guardianGreeting = params.guardianName
    ? `${params.guardianName} 보호자님`
    : `${params.studentName} 회원/보호자님`;
  const [year, month] = params.yearMonth.split('-');
  const ymLabel = year && month ? `${year}년 ${Number(month)}월` : params.yearMonth;
  const targetAmount = params.unpaidAmount > 0 ? params.unpaidAmount : params.totalAmount;
  const accountInfo = params.bankAccountText
    ? `- 입금 계좌: ${params.bankAccountText}`
    : '- 입금 계좌: 사업장으로 문의 부탁드립니다.';

  return `[${org}] ${guardianGreeting} 안녕하세요!

${ymLabel} 이용료/수강료 납부 안내드립니다.

- 고객명: ${params.studentName}
- 납부금액: ${formatCurrency(targetAmount)}
- 납부기한: ${params.dueDate || '해당월 10일'}
${accountInfo}

자녀/회원 알림장, 출결 및 시간표는 '모아 전용 앱'에서도 실시간으로 확인하실 수 있습니다.
궁금하신 점은 언제든 사업장으로 편하게 연락해 주세요. 감사합니다.`;
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

  if (!invoice) return null;

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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedKey('text');
      showToast('청구 안내 문구가 클립보드에 복사되었습니다. 카카오톡이나 문자에 붙여넣기 하세요.', 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[${academyName || '이용료/수강료'}] 납부 안내`,
          text: message,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast('공유하기에 실패했습니다.', 'error');
        }
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="청구서 안내 메시지 발송"
      description={`${invoice.studentName} 회원님의 ${invoice.yearMonth} 이용료/수강료 납부 안내 문구입니다.`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" onClick={handleCopyText} className="gap-1.5">
            {copiedKey === 'text' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>문구 복사</span>
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button variant="primary" onClick={handleNativeShare} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              <Share2 className="w-4 h-4" />
              <span>외부 앱으로 바로 공유</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* 청구 정보 요약 카드 */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">청구 대상</span>
            <span className="font-bold text-slate-800">{invoice.studentName} {guardianName ? `(보호자: ${guardianName})` : ''}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">청구 월 / 납부 기한</span>
            <span className="text-slate-700">{invoice.yearMonth} / {invoice.dueDate || '해당월 10일'}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span className="text-slate-500 font-medium">납부 요청 금액</span>
            <span className="font-extrabold text-indigo-600 text-sm">
              {formatCurrency(invoice.unpaidAmount > 0 ? invoice.unpaidAmount : invoice.totalAmount)}
            </span>
          </div>
        </div>

        {/* 입금 계좌 안내 경고 배너 (계좌 미등록 시) */}
        {!bankAccountText && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            ⚠️ 수납 입금 계좌번호가 아직 등록되지 않았습니다. 사업장 설정에서 계좌를 등록하시면 안내 문구에 계좌가 자동 삽입됩니다.
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
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 leading-relaxed shadow-inner"
          />
        </div>
      </div>
    </Modal>
  );
};
