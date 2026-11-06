import { useState, useRef, type FC } from 'react';
import { Download, Printer, ExternalLink, Copy, Check } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { getAppBaseUrl } from '@/core/parent/services/parentInviteService';
import { Modal } from '@/shared/components/ui/Modal';
import { showToast } from '@/shared/feedback/uiFeedback';

interface ConsultationQrModalProps {
  organizationName: string;
  publicCode: string | null | undefined;
  onClose: () => void;
}

/** 상담 신청 QR — 저장·인쇄 (public_code 기반 URL) */
export const ConsultationQrModal: FC<ConsultationQrModalProps> = ({
  organizationName,
  publicCode,
  onClose,
}) => {
  const { industry } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const code = (publicCode || '').trim().toUpperCase();
  const consultUrl = code ? `${getAppBaseUrl()}/c/${code}/consultation` : '';

  const handleOpenCustomerView = () => {
    if (!consultUrl) return;
    window.open(consultUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    if (!consultUrl) return;
    try {
      await navigator.clipboard.writeText(consultUrl);
      setCopied(true);
      showToast('상담 신청 링크가 클립보드에 복사되었습니다.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('링크 복사에 실패했습니다.', 'error');
    }
  };

  const handleDownloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas || !code) return;
    const link = document.createElement('a');
    link.download = `consultation-qr-${code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen onClose={onClose} title="상담 신청 QR" description={organizationName}>
      <div className="p-6 overflow-y-auto printable-area">
        {!code ? (
          <div className="text-center space-y-2 py-8">
            <p className="text-sm font-bold text-slate-800">공개 코드가 없습니다</p>
            <p className="text-xs text-slate-500">
              설정에서 {placeLabel} 공개 코드를 확인한 뒤 다시 시도하세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="hidden print:block space-y-1">
              <p className="text-2xl font-black text-slate-900">{organizationName}</p>
              <p className="text-lg font-bold text-slate-800">상담 신청</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <QRCodeSVG value={consultUrl} size={200} level="H" includeMargin={false} />
            </div>

            {/* PNG 다운로드용 숨김 캔버스 */}
            <div ref={canvasWrapRef} className="absolute -left-[9999px] top-0" aria-hidden>
              <QRCodeCanvas value={consultUrl} size={512} level="H" includeMargin />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900 print:hidden">{organizationName}</p>
              <p className="text-sm text-slate-600">
                QR을 스캔하면 상담 신청 페이지로 이동합니다.
              </p>
              <p className="text-[11px] text-slate-400 font-mono break-all max-w-[280px] mx-auto">
                {consultUrl}
              </p>
            </div>

            <p className="hidden print:block text-sm text-slate-700 mt-4">
              QR을 스캔하여 상담을 신청해주세요.
            </p>
          </div>
        )}
      </div>

      {code && (
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleOpenCustomerView}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>고객 화면 미리보기</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>이미지 저장</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄하기</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
