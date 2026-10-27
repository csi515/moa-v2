import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { saleHistoryService } from '../../services/saleHistoryService';
import { saleReturnService } from '../../services/saleReturnService';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleListItem,
} from '../../types/sale';
import type { SaleItemReturnable } from '../../types/saleReturn';
import { SaleReturnModal } from './SaleReturnModal';

interface Props {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onReturnCompleted: (refundAmount: number) => void;
  onError: (message: string) => void;
}

export const SaleQuickReturnModal: React.FC<Props> = ({
  isOpen,
  organizationId,
  onClose,
  onReturnCompleted,
  onError,
}) => {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // 반품 서브 모달 상태
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<SaleItemReturnable[]>([]);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [preparingReturn, setPreparingReturn] = useState(false);

  const loadRecentSales = useCallback(async () => {
    if (!isOpen || !organizationId) return;
    setLoading(true);
    try {
      // 오늘 포함 최근 판매 건 목록 조회 (날짜 필터 없이 오늘 기준)
      const today = saleHistoryService.todayYmd();
      const list = await saleHistoryService.listSales({
        organizationId,
        date: today,
      });
      setSales(list);
    } catch (err) {
      onError(err instanceof Error ? err.message : '판매 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, organizationId, onError]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      void loadRecentSales();
    }
  }, [isOpen, loadRecentSales]);

  // 종이 영수증 금액(23500) 및 고객명, 판매번호 초고속 필터링
  const filteredSales = useMemo(() => {
    const raw = search.trim();
    if (!raw) return sales;
    const q = raw.toLowerCase();
    const digitsOnly = raw.replace(/[^\d]/g, '');

    return sales.filter((row) => {
      // 1. 결제 금액 매칭 (손님이 들고 온 전표 금액)
      if (digitsOnly && String(Math.round(row.totalAmount)).startsWith(digitsOnly)) {
        return true;
      }
      const amountStr = formatCurrency(row.totalAmount).toLowerCase();
      if (amountStr.includes(q)) return true;

      // 2. 판매번호 또는 고객명
      const saleNo = formatSaleNumber(row.id).toLowerCase();
      const hay = [
        saleNo,
        row.id.toLowerCase(),
        row.customerName?.toLowerCase() ?? '',
        ...row.productSummaries.map((p) => p.toLowerCase()),
      ].join(' ');
      return hay.includes(q);
    });
  }, [sales, search]);

  const handleStartReturn = async (saleId: string) => {
    setPreparingReturn(true);
    try {
      const detail = await saleHistoryService.getSaleDetail(organizationId, saleId);
      const returnedMap = new Map<string, number>(
        Object.entries(detail.returnedQtyByItemId) as Array<[string, number]>
      );
      const lines = saleReturnService.buildReturnableLines(detail.items, returnedMap);
      if (!lines.some((l) => l.remainingQuantity > 0)) {
        onError('이미 모든 상품이 반품되었거나 반품 가능한 잔여 수량이 없습니다.');
        return;
      }
      setActiveSaleId(saleId);
      setReturnLines(lines);
      setReturnModalOpen(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : '반품 가능 내역을 조회하지 못했습니다.');
    } finally {
      setPreparingReturn(false);
    }
  };

  const handleReturnSuccess = (refundAmount: number) => {
    setReturnModalOpen(false);
    setActiveSaleId(null);
    onReturnCompleted(refundAmount);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen && !returnModalOpen} onClose={onClose} title="스마트 영수증 반품 / 환불" maxWidth="md">
        <div className="flex flex-col max-h-[85vh]">
          <div className="p-4 sm:p-6 space-y-4">
            {/* 안내 배지 */}
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2.5 text-xs text-teal-800">
              <RotateCcw className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">단말기 종이 영수증의 결제 금액이나 고객명을 검색하세요</p>
                <p className="text-teal-700/80 mt-0.5">
                  외부 카드 단말기에서 카드를 취소한 후, 아래에서 판매 건을 선택하면 재고가 자동으로 복구됩니다.
                </p>
              </div>
            </div>

            {/* 영수증 결제금액 / 고객 퀵 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="영수증 결제금액(예: 23500) 또는 고객명, 판매번호 입력"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
              />
            </div>

            {/* 판매 건 리스트 */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-center py-8 text-xs text-slate-400">판매 내역을 불러오는 중...</p>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-600">일치하는 판매 영수증이 없습니다</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    검색어(금액)를 확인하거나 판매 내역 탭에서 과거 날짜를 조회해 보세요.
                  </p>
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {formatSaleNumber(sale.id)}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {SALE_PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                        </span>
                        {sale.status === 'refunded' && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                            전체환불됨
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {sale.customerName ? `${sale.customerName} 고객 · ` : '일반 고객 · '}
                        {sale.productSummaries.join(', ') || '상품'}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-base font-black tabular-nums text-slate-900">
                          {formatCurrency(sale.totalAmount)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={preparingReturn || sale.status === 'refunded'}
                        onClick={() => handleStartReturn(sale.id)}
                        className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>반품 접수</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>

      {/* 실제 품목 선택 및 환불 확정 모달 */}
      {returnModalOpen && activeSaleId && (
        <SaleReturnModal
          isOpen={returnModalOpen}
          organizationId={organizationId}
          saleId={activeSaleId}
          lines={returnLines}
          onClose={() => setReturnModalOpen(false)}
          onCompleted={handleReturnSuccess}
          onError={onError}
        />
      )}
    </>
  );
};
