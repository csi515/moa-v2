import { useRef, type FC } from 'react';
import { Download, Printer } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { getAppBaseUrl } from '@/core/parent/services/parentInviteService';
import { Modal } from '@/shared/components/ui/Modal';

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
  const code = (publicCode || '').trim().toUpperCase();
  const consultUrl = code ? `${getAppBaseUrl()}/c/${code}/consultation` : '';

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
          <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 no-print">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              이미지 저장
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              인쇄하기
            </button>
          </div>
        )}
    </Modal>
  );
};
