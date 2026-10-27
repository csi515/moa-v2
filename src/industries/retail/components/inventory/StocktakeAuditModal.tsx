import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Save,
  Search,
} from 'lucide-react';
import { Modal } from '@/shared/components';
import { useBarcodeScanner, playScannerSound } from '@/capabilities/inventory';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryStockRow } from '../../types/inventory';

interface Props {
  isOpen: boolean;
  organizationId: string;
  stockRows: InventoryStockRow[];
  stockLocationId?: string | null;
  onClose: () => void;
  onCompleted: (adjustedCount: number) => void;
  onError: (message: string) => void;
}

interface StocktakeItem {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  productCode: string | null;
  systemQty: number;
  countedQty: number;
  isCounted: boolean;
}

export const StocktakeAuditModal: React.FC<Props> = ({
  isOpen,
  organizationId,
  stockRows,
  stockLocationId,
  onClose,
  onCompleted,
  onError,
}) => {
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [search, setSearch] = useState('');
  const [lastScannedKey, setLastScannedKey] = useState<string | null>(null);
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [onlyDiffFilter, setOnlyDiffFilter] = useState(false);

  // 모달 오픈 시 초기화: stockRows를 기반으로 실사 목록 생성
  useEffect(() => {
    if (!isOpen) return;
    const initial: StocktakeItem[] = stockRows.map((r) => {
      const key = `${r.productId}:${r.variantId ?? ''}`;
      return {
        key,
        productId: r.productId,
        variantId: r.variantId,
        productName: r.productName,
        variantName: r.variantName,
        productCode: r.productCode,
        systemQty: r.quantity,
        countedQty: 0,
        isCounted: false,
      };
    });
    setItems(initial);
    setSearch('');
    setLastScannedKey(null);
    setLastScannedName(null);
    setOnlyDiffFilter(false);
  }, [isOpen, stockRows]);

  // 바코드 스캔 처리 (HID 키웨지)
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      if (!isOpen || saving) return;
      const clean = code.trim().toLowerCase();
      if (!clean) return;

      setItems((prev) => {
        const idx = prev.findIndex(
          (item) => item.productCode && item.productCode.trim().toLowerCase() === clean
        );
        if (idx === -1) {
          onError(`바코드 [${code}]에 일치하는 상품이 재고 목록에 없습니다.`);
          return prev;
        }

        playScannerSound();
        const target = prev[idx];
        const nextCount = (target.isCounted ? target.countedQty : 0) + 1;
        setLastScannedKey(target.key);
        setLastScannedName(`${target.productName} (실사: ${nextCount}개)`);

        const next = [...prev];
        next[idx] = {
          ...target,
          countedQty: nextCount,
          isCounted: true,
        };
        return next;
      });
    },
    [isOpen, saving, onError]
  );

  // useBarcodeScanner 훅 연결
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: isOpen && !saving,

  });

  // 수량 직접 증감
  const handleUpdateQty = (key: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const base = item.isCounted ? item.countedQty : item.systemQty;
        const next = Math.max(0, base + delta);
        return {
          ...item,
          countedQty: next,
          isCounted: true,
        };
      })
    );
  };

  const handleSetExactQty = (key: string, val: string) => {
    const digits = val.replace(/[^\d]/g, '');
    const num = digits === '' ? 0 : Math.max(0, parseInt(digits, 10));
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        return {
          ...item,
          countedQty: num,
          isCounted: true,
        };
      })
    );
  };

  // 모든 미실사 품목을 전산 수량과 일치시키는 편의 기능
  const handleMatchAllToSystem = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        countedQty: item.isCounted ? item.countedQty : item.systemQty,
        isCounted: true,
      }))
    );
  };

  // 통계 계산
  const stats = useMemo(() => {
    let countedCount = 0;
    let diffCount = 0;
    let totalLoss = 0;
    let totalSurplus = 0;

    for (const item of items) {
      if (item.isCounted) {
        countedCount += 1;
        const diff = item.countedQty - item.systemQty;
        if (diff < 0) {
          diffCount += 1;
          totalLoss += Math.abs(diff);
        } else if (diff > 0) {
          diffCount += 1;
          totalSurplus += diff;
        }
      }
    }
    return { countedCount, diffCount, totalLoss, totalSurplus };
  }, [items]);

  // 필터링된 상품 목록
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (onlyDiffFilter) {
        if (!item.isCounted || item.countedQty === item.systemQty) return false;
      }
      if (!q) return true;
      const hay = [
        item.productName.toLowerCase(),
        item.variantName?.toLowerCase() ?? '',
        item.productCode?.toLowerCase() ?? '',
      ].join(' ');
      return hay.includes(q);
    });
  }, [items, search, onlyDiffFilter]);

  // 실사 결과 일괄 적용
  const handleApplyStocktake = async () => {
    // 차이가 있고 실사가 완료된 항목만 추출
    const diffItems = items.filter(
      (item) => item.isCounted && item.countedQty !== item.systemQty
    );

    if (diffItems.length === 0) {
      onError('전산 재고와 차이가 있는 실사 항목이 없습니다.');
      return;
    }

    setSaving(true);
    let successCount = 0;
    try {
      for (const item of diffItems) {
        const delta = item.countedQty - item.systemQty;
        await inventoryService.applyAdjustment({
          organizationId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: delta,
          reason: '정기 재고 실사 차이 조정',
          stockLocationId: stockLocationId ?? null,
        });
        successCount += 1;
      }
      onCompleted(successCount);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : '재고 실사 반영 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="바코드 연속 스캔 재고 실사 (Stocktake)" maxWidth="2xl">
      <div className="flex flex-col max-h-[88vh]">
        {/* 상단 스캔 상태 & 통계 안내 */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 space-y-3">
          {/* 바코드 감지 안내 배너 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-teal-600 text-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Barcode className="w-5 h-5 text-teal-200 shrink-0 animate-pulse" />
              <div>
                <p>무선 바코드 스캐너 상시 대기 중</p>
                <p className="text-[11px] text-teal-100 font-normal">
                  진열대를 돌며 바코드를 연속으로 '삑-삑' 찍으면 실사 수량이 1씩 자동 누적됩니다.
                </p>
              </div>
            </div>
            {lastScannedName && (
              <div className="bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate max-w-[200px]">{lastScannedName}</span>
              </div>
            )}
          </div>

          {/* 실사 통계 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <p className="text-slate-400 font-bold">전체 품목</p>
              <p className="text-base font-black text-slate-800 mt-0.5 tabular-nums">
                {items.length}개
              </p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <p className="text-slate-400 font-bold">실사 진행</p>
              <p className="text-base font-black text-teal-700 mt-0.5 tabular-nums">
                {stats.countedCount} / {items.length}
              </p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <p className="text-slate-400 font-bold">오차 발생 품목</p>
              <p className={`text-base font-black mt-0.5 tabular-nums ${stats.diffCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {stats.diffCount}개 품목
              </p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <p className="text-slate-400 font-bold">로스(부족) 수량</p>
              <p className={`text-base font-black mt-0.5 tabular-nums ${stats.totalLoss > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                -{stats.totalLoss}개
              </p>
            </div>
          </div>

          {/* 필터 및 검색 바 */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="상품명, 바코드 검색"
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-teal-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyDiffFilter(!onlyDiffFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
                onlyDiffFilter
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {onlyDiffFilter ? '오차 품목만 보기 (ON)' : '오차 품목만 보기'}
            </button>
            <button
              type="button"
              onClick={handleMatchAllToSystem}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
              title="미실사 상품들의 수량을 전산 재고와 똑같이 맞춥니다"
            >
              미실사 $\rightarrow$ 전산동일
            </button>
          </div>
        </div>

        {/* 품목 실사 테이블 리스트 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100 max-h-[460px]">
          {filteredItems.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400">
              일치하는 상품이 없습니다.
            </p>
          ) : (
            filteredItems.map((item) => {
              const diff = item.isCounted ? item.countedQty - item.systemQty : 0;
              const isHighlight = lastScannedKey === item.key;

              return (
                <div
                  key={item.key}
                  className={`py-3 px-2 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isHighlight
                      ? 'bg-teal-50/70 border border-teal-300'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* 품목 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {item.productCode ? `바코드: ${item.productCode}` : '무바코드'}
                    </p>
                  </div>

                  {/* 전산 재고 */}
                  <div className="text-right shrink-0 w-20">
                    <p className="text-[10px] text-slate-400 font-bold">전산 재고</p>
                    <p className="text-sm font-black text-slate-700 tabular-nums">
                      {item.systemQty}개
                    </p>
                  </div>

                  {/* 실사 수량 조절 컨트롤 */}
                  <div className="shrink-0 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.key, -1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.isCounted ? item.countedQty : ''}
                      onChange={(e) => handleSetExactQty(item.key, e.target.value)}
                      placeholder={item.isCounted ? '0' : '미실사'}
                      className="w-14 text-center text-sm font-black tabular-nums text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.key, 1)}
                      className="w-7 h-7 rounded flex items-center justify-center text-teal-700 hover:bg-teal-50 cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 오차 상태 뱃지 */}
                  <div className="shrink-0 w-24 text-right">
                    {!item.isCounted ? (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-400 font-bold">
                        미실사
                      </span>
                    ) : diff === 0 ? (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        일치 (0)
                      </span>
                    ) : diff < 0 ? (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-rose-100 text-rose-800 font-black">
                        로스 {diff}개
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-black">
                        초과 +{diff}개
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 하단 실행 액션바 */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            닫기
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              오차 {stats.diffCount}개 품목의 재고가 실재고로 조정됩니다.
            </span>
            <button
              type="button"
              disabled={saving || stats.diffCount === 0}
              onClick={handleApplyStocktake}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-40 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '재고 조정 반영 중…' : `실사 결과 반영하기 (${stats.diffCount}건 조정)`}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
