import React, { useState } from 'react';
import { Printer, Smartphone, CheckCircle, Sparkles, Building2, QrCode } from 'lucide-react';
import { Modal } from '@/shared/components';
import { QrCodeSvg } from './BarcodeQrSvg';

export interface StoreQrPopPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
  organizationCode?: string;
  industryLabel?: string;
}

export const StoreQrPopPrintModal: React.FC<StoreQrPopPrintModalProps> = ({
  isOpen,
  onClose,
  organizationName = '모아 비즈니스 스토어',
  organizationCode = 'MOA-STORE-01',
  industryLabel = '스마트 매장',
}) => {
  const [popPaperSize, setPopPaperSize] = useState<'A4' | 'A5'>('A4');
  const [customWelcomeText, setCustomWelcomeText] = useState<string>(
    '스마트폰 카메라로 QR 코드를 비추시면 간편 출결 체크인 및 상품 스마트 주문을 바로 이용하실 수 있습니다.'
  );

  const qrTargetUrl = `https://moa.app/store/${encodeURIComponent(organizationCode)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="매장 비치용 QR 안내 POP 인쇄 서식">
      <div className="p-6 space-y-6">
        {/* 컨트롤 패널 (인쇄 시 숨김) */}
        <div className="print:hidden bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">용지 규격:</span>
              <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPopPaperSize('A4')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    popPaperSize === 'A4'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 거치용
                </button>
                <button
                  type="button"
                  onClick={() => setPopPaperSize('A5')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    popPaperSize === 'A5'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A5 미니 스탠드용
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              POP 서식 인쇄하기
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              안내 문구 수정:
            </label>
            <input
              type="text"
              value={customWelcomeText}
              onChange={(e) => setCustomWelcomeText(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            />
          </div>
        </div>

        {/* 인쇄 및 미리보기 영역 */}
        <div className="print-pop-area border border-slate-200 rounded-2xl bg-slate-100/60 p-4 flex justify-center max-h-[65vh] overflow-y-auto print:max-h-none print:p-0 print:border-none print:bg-transparent">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-pop-area, .print-pop-area * {
                visibility: visible;
              }
              .print-pop-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0 !important;
                background: white !important;
              }
              .pop-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                width: 100% !important;
                height: 100vh !important;
              }
              @page {
                size: ${popPaperSize === 'A4' ? 'A4 portrait' : 'A5 portrait'};
                margin: 0;
              }
            }
          `}</style>

          <div
            className={`pop-sheet bg-white shadow-md rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-between text-center border border-slate-200/90 text-slate-900 ${
              popPaperSize === 'A4' ? 'w-[210mm] min-h-[297mm]' : 'w-[148mm] min-h-[210mm]'
            }`}
          >
            {/* 상단 헤더 */}
            <div className="space-y-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-extrabold tracking-wide">
                <Sparkles className="w-4 h-4" />
                <span>{industryLabel} 스마트 체크인 & 주문</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {organizationName}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
                {customWelcomeText}
              </p>
            </div>

            {/* 중앙 대형 QR 코드 영역 */}
            <div className="my-8 p-6 bg-slate-50 border-2 border-indigo-100 rounded-3xl flex flex-col items-center shadow-xs">
              <QrCodeSvg value={qrTargetUrl} size={popPaperSize === 'A4' ? 200 : 160} />
              <div className="mt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500">
                <QrCode className="w-3.5 h-3.5" />
                <span>{organizationCode}</span>
              </div>
            </div>

            {/* 하단 3단계 안내 가이드 */}
            <div className="w-full max-w-lg grid grid-cols-3 gap-3 text-left pt-6 border-t-2 border-slate-100">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  1
                </div>
                <p className="font-bold text-xs text-slate-900">카메라 스캔</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  기본 카메라로 QR을 비춥니다
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  2
                </div>
                <p className="font-bold text-xs text-slate-900">간편 체크인</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  회원 출석 및 주문서를 확인합니다
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-1.5">
                  3
                </div>
                <p className="font-bold text-xs text-slate-900">원터치 완료</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  대기 없이 빠른 서비스를 받으세요
                </p>
              </div>
            </div>

            {/* 풋터 */}
            <div className="pt-6 text-center text-[11px] text-slate-400 font-medium">
              Powered by Moa Platform · 사업장 스마트 운영 솔루션
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
