import React, { useState, useMemo } from 'react';
import { Printer, Copy, Check, X, FileText, Settings2 } from 'lucide-react';
import { Modal } from '@/shared/components';
import {
  type InventoryItem,
  type LabelSheetLayoutType,
  LABEL_LAYOUT_CONFIGS,
  generatePrintLabelItems,
  formatLabelSheetPages,
  type PrintableBarcodeLabel,
} from '../domain/inventoryEngine';
import { BarcodeSvg, QrCodeSvg } from './BarcodeQrSvg';

export interface BarcodeLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  organizationName?: string;
}

export const BarcodeLabelPrintModal: React.FC<BarcodeLabelPrintModalProps> = ({
  isOpen,
  onClose,
  item,
  organizationName = '모아 비즈니스',
}) => {
  const [quantity, setQuantity] = useState<number>(24);
  const [layout, setLayout] = useState<LabelSheetLayoutType>('A4_24_FORMTEC');
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  const printLabels = useMemo(() => {
    if (!item) return [];
    return generatePrintLabelItems({
      item,
      quantity,
    });
  }, [item, quantity]);

  const pages = useMemo(() => {
    return formatLabelSheetPages(printLabels, layout);
  }, [printLabels, layout]);

  const activeConfig = LABEL_LAYOUT_CONFIGS[layout];

  const handlePrint = () => {
    window.print();
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="바코드 & QR 라벨 스티커 인쇄">
      <div className="p-6 space-y-6">
        {/* 인쇄 옵션 컨트롤 바 (화면에서만 보이고 인쇄 시 제외) */}
        <div className="print:hidden space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 text-sm">{item.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                SKU: {item.sku} {item.barcode ? `· 바코드: ${item.barcode}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">인쇄 매수:</label>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-2.5 py-1.5 text-sm font-bold border border-slate-300 rounded-xl bg-white text-center"
              />
              <span className="text-xs text-slate-500 font-medium">장</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
            {(Object.keys(LABEL_LAYOUT_CONFIGS) as LabelSheetLayoutType[]).map((key) => {
              const cfg = LABEL_LAYOUT_CONFIGS[key];
              const isSelected = layout === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setLayout(key);
                    if (key === 'A4_24_FORMTEC' && quantity === 16) setQuantity(24);
                    if (key === 'A4_16_FORMTEC' && quantity === 24) setQuantity(16);
                    if (key === 'THERMAL_50_30') setQuantity(Math.min(quantity, 50));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-bold ring-1 ring-teal-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{cfg.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {cfg.labelWidthMm}mm × {cfg.labelHeightMm}mm
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>판매 단가 표기</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQr}
                  onChange={(e) => setIncludeQr(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>QR 코드 함께 표기</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                라벨 인쇄하기 ({printLabels.length}장)
              </button>
            </div>
          </div>
        </div>

        {/* 인쇄 영역 (미리보기 및 print CSS 적용) */}
        <div className="print-area max-h-[60vh] overflow-y-auto print:max-h-none print:overflow-visible p-2 border border-slate-200 rounded-2xl bg-slate-100/50">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-area, .print-area * {
                visibility: visible;
              }
              .print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0 !important;
                background: transparent !important;
                border: none !important;
              }
              .label-page {
                page-break-after: always;
                break-after: page;
                margin: 0 auto;
                padding: 5mm;
              }
              @page {
                size: ${layout === 'THERMAL_50_30' ? '50mm 30mm' : 'A4'};
                margin: 0;
              }
            }
          `}</style>

          {pages.map((pageLabels, pageIdx) => (
            <div
              key={pageIdx}
              className={`label-page bg-white shadow-xs rounded-xl p-4 mb-4 print:mb-0 print:p-0 print:shadow-none print:rounded-none ${
                layout === 'A4_24_FORMTEC'
                  ? 'grid grid-cols-3 gap-2'
                  : layout === 'A4_16_FORMTEC'
                    ? 'grid grid-cols-2 gap-2'
                    : 'flex flex-col gap-2'
              }`}
              style={{
                minHeight: layout === 'THERMAL_50_30' ? 'auto' : '280mm',
              }}
            >
              {pageLabels.map((label, labelIdx) => (
                <div
                  key={`${pageIdx}-${labelIdx}`}
                  className="border border-slate-300 print:border-slate-400 p-2 rounded-lg flex flex-col justify-between bg-white text-slate-900 overflow-hidden"
                  style={{
                    height: layout === 'THERMAL_50_30' ? '28mm' : `${activeConfig.labelHeightMm - 3}mm`,
                  }}
                >
                  {/* 상단: 상품명 및 매장명 */}
                  <div className="flex items-start justify-between gap-1 leading-tight">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[11px] truncate">{label.itemName}</p>
                      <p className="text-[9px] text-slate-500 truncate">{organizationName}</p>
                    </div>
                    {includePrice && label.unitPrice !== undefined && (
                      <span className="font-black text-xs text-teal-800 whitespace-nowrap ml-1">
                        {label.unitPrice.toLocaleString('ko-KR')}원
                      </span>
                    )}
                  </div>

                  {/* 하단: 바코드 및 QR 영역 */}
                  <div className="flex items-end justify-between gap-1 pt-1">
                    <div className="flex-1 overflow-hidden">
                      <BarcodeSvg
                        value={label.barcode}
                        height={24}
                        barWidthMultiplier={layout === 'A4_16_FORMTEC' ? 1.4 : 1.0}
                        showText={true}
                      />
                    </div>
                    {includeQr && (
                      <div className="flex-shrink-0">
                        <QrCodeSvg value={label.qrCodeValue} size={38} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
