import React, { useState } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import {
  createPurchaseRequisition,
  lookupItemProcurementHistory,
  type ItemProcurementHistory,
  type RequisitionItem,
  type PurchaseRequisition,
} from '../domain/procurementPipelineEngine';
import { todayIsoLocal, shiftDateIso } from '@/shared/utils/localDate';
import { useDirtyFormGuard } from '@/shared/hooks/useDirtyFormGuard';

interface PurchaseRequisitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (pr: PurchaseRequisition) => void;
  historyList?: ItemProcurementHistory[];
}

const DEFAULT_DEPARTMENTS = [
  '생산1팀',
  '생산2팀',
  '품질보증(QA)팀',
  '연구개발(R&D)팀',
  '설비보전팀',
  '총무자재팀',
  '영업지원팀',
];

// 예시 과거 구매 이력 기본값
const SAMPLE_HISTORIES: ItemProcurementHistory[] = [
  {
    sku: 'BOLT-M8-SUS',
    itemName: '고장력 육각볼트 M8',
    specification: 'SUS304, 30mm',
    lastVendor: '한국정밀화스너',
    purchaseAccount: 'MRO 도매몰 (법인계정)',
    lastUnitPrice: 450,
    lastPurchasedAt: '2026-09-15',
  },
  {
    sku: 'OIL-VG46-20L',
    itemName: '유압 작동유 VG46',
    specification: '20L 말통',
    lastVendor: '극동루브리컨츠',
    purchaseAccount: '쿠팡 비즈니스',
    lastUnitPrice: 55000,
    lastPurchasedAt: '2026-08-20',
  },
  {
    sku: 'GLOVE-NBR-M',
    itemName: '산업용 니트릴 장갑 (M)',
    specification: '100매/BOX, 무분형',
    lastVendor: '오피스디포 B2B',
    purchaseAccount: '오피스디포',
    lastUnitPrice: 12000,
    lastPurchasedAt: '2026-10-01',
  },
  {
    sku: 'FILTER-AIR-01',
    itemName: '에어컴프레셔 흡기 필터',
    specification: '10마력용 원형',
    lastVendor: '삼원공조필터',
    purchaseAccount: '도매 직거래',
    lastUnitPrice: 18000,
    lastPurchasedAt: '2026-07-10',
  },
];

export const PurchaseRequisitionFormModal: React.FC<PurchaseRequisitionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  historyList = SAMPLE_HISTORIES,
}) => {
  const [department, setDepartment] = useState('생산1팀');
  const [requesterName, setRequesterName] = useState('현장 담당자');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState(
    shiftDateIso(todayIsoLocal(), 5)
  );
  // ★ 구매 사유 필수
  const [justification, setJustification] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 품목 목록
  const [items, setItems] = useState<
    Array<{
      sku: string;
      itemName: string;
      specification: string;
      quantity: number;
      unit: string;
      estimatedUnitPrice: number;
      lastVendor?: string;
      purchaseAccount?: string;
      lastUnitPrice?: number;
    }>
  >([
    {
      sku: '',
      itemName: '',
      specification: '',
      quantity: 1,
      unit: 'EA',
      estimatedUnitPrice: 0,
    },
  ]);

  const isDirty = Boolean(
    justification.trim() ||
    items.some((i) => i.itemName.trim() || i.sku.trim() || i.estimatedUnitPrice > 0)
  );
  const { confirmDiscard } = useDirtyFormGuard({ isDirty });

  const handleSafeClose = async () => {
    if (await confirmDiscard()) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: '',
        itemName: '',
        specification: '',
        quantity: 1,
        unit: 'EA',
        estimatedUnitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ★ 과거 구매 이력 불러오기 (SKU 또는 품목명 매칭)
  const handleAutoFillHistory = (index: number, query: string) => {
    const matched = lookupItemProcurementHistory(query, historyList);
    if (!matched) return;

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sku: matched.sku,
        itemName: matched.itemName,
        specification: matched.specification || next[index].specification,
        estimatedUnitPrice: matched.lastUnitPrice,
        lastVendor: matched.lastVendor,
        purchaseAccount: matched.purchaseAccount,
        lastUnitPrice: matched.lastUnitPrice,
      };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = createPurchaseRequisition({
      department,
      requesterName,
      targetDeliveryDate,
      justification,
      items,
      historyList,
    });

    if (res.error || !res.pr) {
      setErrorMessage(res.error || '구매 요청서 생성에 실패했습니다.');
      return;
    }

    onSubmitSuccess(res.pr);
    onClose();
  };

  const totalEstimatedAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitPrice) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">신규 구매 요청서 (PR) 작성</h2>
              <p className="text-xs text-slate-400">
                1단계: 부서별 구매 요청 & 구매 사유(Justification) 필수 기안
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 기본 요청 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                신청 부서 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {DEFAULT_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                신청자 성명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="예: 홍길동 책임"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                희망 납기일 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={targetDeliveryDate}
                  onChange={(e) => setTargetDeliveryDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 2. ★ 필수 구매 사유 (Justification) */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-900">
                구매 사유 (Justification) <span className="text-rose-500">* (필수 5자 이상)</span>
              </label>
              <span className="text-[11px] text-amber-700/80">
                사후 사내 감사 및 ISO 9001(공급자 관리) 필수 심사 증빙
              </span>
            </div>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="왜 이 물품이 지금 필요한가? 구체적인 사유를 서술하세요.&#10;예) 3호 가공설비 긴급 누유 수리용 소모품 소진, 신규 프로젝트 1차 시제품 제작을 위한 특수 자재 긴급 확보 등"
              className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* 3. 품목 등록 & 과거 구매 이력 불러오기 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">요청 품목 명세</h3>
                <p className="text-[11px] text-slate-500">
                  품목번호(SKU)나 품목명을 입력하면 과거 구매처 및 직전 단가가 자동 연동됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                품목 추가
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">품목 #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-500 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        품목번호(Part No/SKU)
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          placeholder="예: BOLT-M8-SUS"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          title="과거 구매 이력 매칭"
                          onClick={() => handleAutoFillHistory(idx, item.sku || item.itemName)}
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        품목명 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                        placeholder="예: 고장력 육각볼트 M8"
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-0.5">수량 / 단위</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-12 px-1 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">추정 단가(원)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.estimatedUnitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, 'estimatedUnitPrice', Number(e.target.value))
                        }
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* 직전 구매처 및 계정 자동 채움 배지 */}
                  {item.lastVendor && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 bg-white/70 px-2 py-1 rounded-md border border-slate-100">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <span>
                        직전 구매처: <strong className="text-slate-800">{item.lastVendor}</strong>
                        {item.purchaseAccount && ` (${item.purchaseAccount})`}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>
                        과거 입고단가:{' '}
                        <strong className="text-slate-800">
                          {Number(item.lastUnitPrice).toLocaleString()}원
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 소계 및 합계 */}
          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">총 추정 소요 예산</span>
            <span className="text-sm font-black text-slate-900">
              {totalEstimatedAmount.toLocaleString()}원
            </span>
          </div>

          {/* 버튼 액션 */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition"
            >
              구매 요청서(PR) 상신
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
