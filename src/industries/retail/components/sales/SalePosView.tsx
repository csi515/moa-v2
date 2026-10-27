import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  ShoppingCart,
  Camera,
  Barcode,
  Sparkles,
  PauseCircle,
  PlayCircle,
  Trash2,
  Tag,
  Keyboard,
  Clock,
  Check,
  Flame,
  Calculator,
  PlusCircle,
  Package,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader, Modal } from '@/shared/components';
import { SearchField } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import {
  useBarcodeScanner,
  playScannerSound,
} from '@/capabilities/inventory';
import {
  resolveCurrentPrice,
  type PromotionalDeal,
  PromotionListPage,
  promotionalDealService,
} from '@/capabilities/promotional_deal';
import { PosReconciliationListPage } from '@/capabilities/daily_pos_reconciliation';
import { saleService } from '../../services/saleService';
import {
  cartTotalAmount,
  type SaleCartLine,
  type SaleCatalogItem,
} from '../../types/sale';
import { SALE_POS_COPY as COPY } from './salePosCopy';
import { SaleCartLineRow } from './SaleCartLineRow';
import { SaleCheckoutModal } from './SaleCheckoutModal';
import { SaleQuickReturnModal } from './SaleQuickReturnModal';
import { SaleCameraScannerModal } from './SaleCameraScannerModal';
import { SaleReceiptPrintModal, type ReceiptData } from './SaleReceiptPrintModal';
import { SaleQuickProductCreateModal } from './SaleQuickProductCreateModal';
import { SalePosGuideModal } from './SalePosGuideModal';
import { matchCatalogItem } from './saleCatalogMatch';

interface HeldCart {
  id: string;
  createdAt: string;
  lines: SaleCartLine[];
  totalAmount: number;
}

export const SalePosView: FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [catalog, setCatalog] = useState<SaleCatalogItem[]>([]);
  const [promotionalDeals, setPromotionalDeals] = useState<PromotionalDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleCartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  // [기성품 바코드] 미등록 바코드 즉석 등록 모달 상태
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [scannedUnregisteredCode, setScannedUnregisteredCode] = useState('');

  // [개선안 3] 주문 보류(Hold / Park) 및 복원 상태
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [heldModalOpen, setHeldModalOpen] = useState(false);

  // [개선안 4] 장바구니 전체 할인 모달
  const [totalDiscountModalOpen, setTotalDiscountModalOpen] = useState(false);
  const [totalDiscountType, setTotalDiscountType] = useState<'won' | 'percent'>('won');
  const [totalDiscountInput, setTotalDiscountInput] = useState('');

  // [승격 Capability 연동] 특가 프로모션 관리 & POS 일일 시재 마감 모달
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);

  // [개선안 2] 스마트 영수증 반품 모달 상태
  const [quickReturnOpen, setQuickReturnOpen] = useState(false);

  // [사용자 친절도] POS 사용 가이드 모달 상태
  const [guideOpen, setGuideOpen] = useState(false);

  // [빠른 터치 매대] 펼치기/접기 상태
  const [quickTouchExpanded, setQuickTouchExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setCatalog([]);
      setPromotionalDeals([]);
      return;
    }
    setLoading(true);
    try {
      const [catalogItems, deals] = await Promise.all([
        saleService.listCatalog(orgId),
        promotionalDealService.listActiveDeals(orgId),
      ]);

      setCatalog(catalogItems);
      setPromotionalDeals(deals);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // 상품 ID별 활성 프로모션 매핑
  const promoMapByProductId = useMemo(() => {
    const map = new Map<string, PromotionalDeal>();
    for (const d of promotionalDeals) {
      if (d.target_type === 'RETAIL' && d.target_id) {
        map.set(d.target_id, d);
      }
    }
    return map;
  }, [promotionalDeals]);

  // 바코드가 없는 제품 목록 (상단 빠른 터치 매대용)
  const noBarcodeItems = useMemo(() => {
    return catalog.filter((item) => !item.productCode || item.productCode.trim() === '');
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        (row.variantName?.toLowerCase().includes(q) ?? false) ||
        (row.productCode?.toLowerCase().includes(q) ?? false)
    );
  }, [catalog, search]);

  const total = useMemo(() => cartTotalAmount(cart), [cart]);

  // [promotional_deal 승격 엔진 연동] 상품 담을 때 특가 자동 판정
  const addToCart = useCallback(
    (item: SaleCatalogItem) => {
      setLastAddedKey(item.key);
      setTimeout(() => setLastAddedKey(null), 1500);

      const deal = promoMapByProductId.get(item.productId);
      const priceResolution = resolveCurrentPrice(item.unitPrice, deal);
      const isPromoActive = priceResolution.isDiscounted && priceResolution.status === 'ACTIVE';
      const unitPrice = item.unitPrice;
      const discountAmount = isPromoActive ? Math.max(0, unitPrice - priceResolution.currentPrice) : 0;

      setCart((prev) => {
        const existing = prev.find((line) => line.key === item.key);
        if (existing) {
          const nextQty = existing.quantity + 1;
          const lineDiscount = isPromoActive ? discountAmount * nextQty : (existing.discountAmount ?? 0);
          return prev.map((line) =>
            line.key === item.key
              ? { ...line, quantity: nextQty, discountAmount: lineDiscount }
              : line
          );
        }
        return [
          ...prev,
          {
            key: item.key,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            unitPrice: item.unitPrice,
            quantity: 1,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
          },
        ];
      });
    },
    [promoMapByProductId]
  );

  const setQty = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity } : line))
    );
  };

  const handleApplyLineDiscount = (key: string, discountAmount: number) => {
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, discountAmount } : line))
    );
  };

  // 장바구니 전체 할인 일괄 배분
  const handleApplyTotalDiscount = () => {
    const rawVal = Number(totalDiscountInput.replace(/[^\d]/g, '')) || 0;
    if (rawVal <= 0 || cart.length === 0) {
      setTotalDiscountModalOpen(false);
      return;
    }

    const currentBaseTotal = cart.reduce(
      (sum, line) => sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity),
      0
    );
    if (currentBaseTotal <= 0) return;

    let targetDiscountTotal = 0;
    if (totalDiscountType === 'percent') {
      const pct = Math.min(100, Math.max(0, rawVal));
      targetDiscountTotal = Math.round((currentBaseTotal * pct) / 100);
    } else {
      targetDiscountTotal = Math.min(currentBaseTotal, Math.max(0, rawVal));
    }

    let remainingDiscount = targetDiscountTotal;
    setCart((prev) =>
      prev.map((line, idx) => {
        const lineBase = Math.max(0, line.unitPrice) * Math.max(0, line.quantity);
        if (idx === prev.length - 1) {
          const discountAmount = remainingDiscount;
          return { ...line, discountAmount };
        }
        const ratio = lineBase / currentBaseTotal;
        const lineDiscount = Math.min(lineBase, Math.round(targetDiscountTotal * ratio));
        remainingDiscount -= lineDiscount;
        return { ...line, discountAmount: lineDiscount };
      })
    );

    showToast(`전체 할인 ${formatCurrency(targetDiscountTotal)}이 적용되었습니다.`, 'success');
    setTotalDiscountModalOpen(false);
    setTotalDiscountInput('');
  };

  // [개선안 3] 주문 보류(Park / Hold)
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHold: HeldCart = {
      id: `hold_${Date.now()}`,
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      lines: [...cart],
      totalAmount: total,
    };
    setHeldCarts((prev) => [newHold, ...prev]);
    setCart([]);
    showToast(`현재 주문이 보류되었습니다 (보류 목록: ${heldCarts.length + 1}건)`, 'info');
  };

  // [개선안 3] 보류된 주문 복원
  const handleRestoreHeldCart = (held: HeldCart) => {
    if (cart.length > 0) {
      openConfirmDialog({
        title: '장바구니 교체 확인',
        message: '현재 장바구니에 상품이 있습니다. 현재 상품을 비우고 보류된 주문을 불러오시겠습니까?',
        confirmText: '불러오기',
        cancelText: '취소',
        onConfirm: () => {
          setCart(held.lines);
          setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
          setHeldModalOpen(false);
          showToast('보류된 주문을 복원했습니다.', 'success');
        },
      });
    } else {
      setCart(held.lines);
      setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
      setHeldModalOpen(false);
      showToast('보류된 주문을 복원했습니다.', 'success');
    }
  };

  const handleDeleteHeldCart = (id: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  };

  // [기성품 바코드] USB/블루투스 HID 바코드/QR 스캐너 입력 감지
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      const matched = matchCatalogItem(cleanCode, catalog);
      if (matched) {
        addToCart(matched);
        showToast(`'${matched.productName}' 상품이 추가되었습니다 (+1)`, 'success');
      } else {
        // [신규 워크플로우] 미등록 바코드 감지 시 에러로 끝내지 않고 3초 즉석 등록 모달 팝업!
        playScannerSound('error');
        setScannedUnregisteredCode(cleanCode);
        setQuickCreateOpen(true);
      }
    },
    [catalog, addToCart, showToast]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled:
      Boolean(orgId) &&
      !checkoutOpen &&
      !cameraOpen &&
      !totalDiscountModalOpen &&
      !heldModalOpen &&
      !promoModalOpen &&
      !reconciliationModalOpen &&
      !quickCreateOpen,
    feedbackOnScan: true,
  });

  // [개선안 2] 데스크톱 키보드 단축키 시스템 (F1, F2, Space, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        checkoutOpen ||
        cameraOpen ||
        totalDiscountModalOpen ||
        heldModalOpen ||
        promoModalOpen ||
        reconciliationModalOpen ||
        quickCreateOpen
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (cart.length > 0) setCheckoutOpen(true);
      } else if (e.key === 'F1') {
        e.preventDefault();
        if (cart.length > 0) setCheckoutOpen(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) setCheckoutOpen(true);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (cart.length > 0) {
          openConfirmDialog({
            title: '장바구니 비우기',
            message: '장바구니의 모든 상품을 비우시겠습니까?',
            confirmText: '비우기',
            cancelText: '취소',
            isDestructive: true,
            onConfirm: () => setCart([]),
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    checkoutOpen,
    cameraOpen,
    totalDiscountModalOpen,
    heldModalOpen,
    promoModalOpen,
    reconciliationModalOpen,
    quickCreateOpen,
    openConfirmDialog,
  ]);

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<ShoppingCart className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 판매할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="p-4 sm:p-6 space-y-3 flex-1">
        <PageHeader
          icon={<ShoppingCart className="w-5 h-5" />}
          iconClassName="text-teal-600"
          title={COPY.title}
          description={COPY.description}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* 실시간 접객 핵심 액션 */}
              {heldCarts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHeldModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>보류 주문 ({heldCarts.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setQuickReturnOpen(true)}
                className="px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 cursor-pointer"
                title="단말기 영수증 금액/고객명으로 즉시 반품"
              >
                <RotateCcw className="w-4 h-4 text-teal-600" />
                <span>영수증 반품</span>
              </button>

              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="POS 실무 사용 가이드 및 키보드 단축키 모음"
              >
                <HelpCircle className="w-4 h-4 text-teal-600" />
                <span>사용 가이드</span>
              </button>

              {/* 보조 관리 도구 (프로모션 / 마감 정산 - 데스크톱 전용 콤팩트 링크) */}
              <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  title="기간 한정 특가 및 프로모션 관리"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>프로모션</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReconciliationModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  title="일일 현금 시재 정산 및 POS 마감"
                >
                  <Calculator className="w-3.5 h-3.5 text-slate-500" />
                  <span>시재 마감</span>
                </button>
              </div>
            </div>
          }
        />

        {/* 바코드 스캐너 대기 및 카메라 스캔 툴바 */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={COPY.searchPlaceholder}
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="스마트폰/태블릿 카메라로 바코드·QR 연속 스캔"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">카메라 스캔</span>
          </button>
        </div>

        {/* [바코드 없는 제품 전용] 무바코드 빠른 터치 매대 (Quick Touch Goods Bar) */}
        {noBarcodeItems.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-600" />
                무바코드 빠른 터치 매대
                <span className="text-[10px] font-normal text-slate-400">({noBarcodeItems.length}종)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 hidden sm:inline">터치 시 즉시 +1 담김</span>
                {noBarcodeItems.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setQuickTouchExpanded((prev) => !prev)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-teal-50 cursor-pointer"
                  >
                    <span>{quickTouchExpanded ? '접기' : '펼치기'}</span>
                    {quickTouchExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {quickTouchExpanded ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1 animate-in fade-in duration-150">
                {noBarcodeItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 text-left transition-all shadow-2xs cursor-pointer flex flex-col justify-between min-h-[58px]"
                  >
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.productName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-teal-700 tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {noBarcodeItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition-all shadow-2xs cursor-pointer flex items-center gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                        {item.productName}
                      </p>
                      <p className="text-[11px] font-bold text-teal-700 tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <PlusCircle className="w-4 h-4 text-teal-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HID 스캐너 상시 활성 & 단축키 안내 뱃지 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-1.5 bg-slate-100/90 rounded-xl text-[11px] text-slate-600 font-medium gap-1">
          <div className="flex items-center gap-1.5">
            <Barcode className="w-3.5 h-3.5 text-teal-600" />
            <span>기성품 바코드 즉각 감지 활성 (미등록 상품은 3초 즉석 등록)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
            <span className="flex items-center gap-1">
              <Keyboard className="w-3 h-3 text-slate-400" />
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] shadow-2xs">Space</kbd> 결제
            </span>
            <span>·</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] shadow-2xs">Del</kbd> 비우기</span>
          </div>
        </div>

        {loading ? (
          <PageListSkeleton rows={3} message="목록을 불러오는 중..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-10 h-10" />}
            title={catalog.length === 0 ? COPY.emptyCatalog : COPY.emptySearch}
            description={catalog.length === 0 ? COPY.emptyCatalogHint : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const isJustAdded = lastAddedKey === item.key;
              const deal = promoMapByProductId.get(item.productId);
              const priceRes = resolveCurrentPrice(item.unitPrice, deal);
              const hasDeal = priceRes.isDiscounted && priceRes.status === 'ACTIVE';

              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 min-h-[72px] transition-all cursor-pointer ${
                      isJustAdded
                        ? 'border-teal-500 bg-teal-50/50 shadow-sm ring-1 ring-teal-400'
                        : 'border-slate-200 active:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                          {hasDeal && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-rose-500" /> {priceRes.discountRate}% 특가
                            </span>
                          )}
                          {!item.productCode && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              무바코드
                            </span>
                          )}
                          {isJustAdded && (
                            <span className="text-[10px] font-bold text-teal-600 flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3" /> 담김!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.variantName ?? COPY.singleOption}
                          {item.productCode ? ` · 바코드: ${item.productCode}` : ' · 바코드 없음 (터치 판매)'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {hasDeal ? (
                          <>
                            <p className="text-xs text-slate-400 line-through tabular-nums">
                              {formatCurrency(item.unitPrice)}
                            </p>
                            <p className="font-bold tabular-nums text-rose-600 text-base">
                              {formatCurrency(priceRes.currentPrice)}
                            </p>
                          </>
                        ) : (
                          <p className="font-bold tabular-nums text-teal-700">
                            {formatCurrency(item.unitPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 데스크톱 장바구니 패널 */}
        <section className="hidden md:block mt-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">{COPY.cartTitle}</h2>
              <span className="text-xs font-bold text-slate-500">
                {COPY.cartCount(cart.length)}
              </span>
            </div>
            {cart.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTotalDiscountModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-3 h-3" /> 전체 할인
                </button>
                <button
                  type="button"
                  onClick={handleHoldCart}
                  className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <PauseCircle className="w-3 h-3" /> 주문 보류
                </button>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> 비우기
                </button>
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{COPY.cartEmpty}</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {cart.map((line) => (
                <li key={line.key}>
                  <SaleCartLineRow
                    line={line}
                    onDecrease={() => setQty(line.key, line.quantity - 1)}
                    onIncrease={() => setQty(line.key, line.quantity + 1)}
                    onRemove={() => setQty(line.key, 0)}
                    onApplyDiscount={(discount) => handleApplyLineDiscount(line.key, discount)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700">{COPY.totalLabel}</span>
            <span className="text-xl font-bold tabular-nums text-teal-700">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{COPY.checkout}</span>
            <span className="text-xs font-normal opacity-80">(Space)</span>
          </button>
        </section>
      </div>

      {/* 모바일 하단 플로팅 장바구니 바 */}
      <div className="md:hidden fixed left-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        {cart.length > 0 && (
          <div className="max-h-[35vh] overflow-y-auto px-4 pt-3 space-y-2 border-b border-slate-100">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-600">장바구니 품목</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTotalDiscountModalOpen(true)}
                  className="text-xs font-bold text-teal-700"
                >
                  전체할인
                </button>
                <button
                  type="button"
                  onClick={handleHoldCart}
                  className="text-xs font-bold text-amber-700"
                >
                  보류
                </button>
              </div>
            </div>
            {cart.map((line) => (
              <div key={line.key}>
                <SaleCartLineRow
                  line={line}
                  compact
                  onDecrease={() => setQty(line.key, line.quantity - 1)}
                  onIncrease={() => setQty(line.key, line.quantity + 1)}
                  onRemove={() => setQty(line.key, 0)}
                  onApplyDiscount={(discount) => handleApplyLineDiscount(line.key, discount)}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">
              {cart.length === 0 ? COPY.cartEmpty : COPY.cartCount(cart.length)}
            </p>
            <p className="text-lg font-bold tabular-nums text-slate-900 truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="shrink-0 min-h-[48px] px-5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {COPY.checkout}
          </button>
        </div>
      </div>

      {/* 결제 모달 */}
      <SaleCheckoutModal
        isOpen={checkoutOpen}
        organizationId={orgId}
        lines={cart}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={(amount, sale, changeInfo, splitDetail) => {
          let msg = COPY.saleDone(formatCurrency(amount));
          if (splitDetail) {
            msg += ` [복합결제: 현금 ${formatCurrency(splitDetail.cashAmount)} + 카드 ${formatCurrency(splitDetail.cardAmount)}]`;
          }
          if (changeInfo && changeInfo.change > 0) {
            msg += ` (거스름돈: ${formatCurrency(changeInfo.change)})`;
          }
          showToast(msg, 'success');
          if (sale) {
            setCompletedReceipt({
              id: sale.id,
              createdAt: sale.createdAt,
              totalAmount: sale.totalAmount,
              pointsUsed: sale.pointsUsed,
              paymentMethod: sale.paymentMethod,
              splitDetail,
              items: sale.items.map((i) => ({
                productNameSnapshot: i.productNameSnapshot,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountAmount: i.discountAmount,
                lineAmount: i.lineAmount,
              })),
            });
          }
          setCart([]);
          setCheckoutOpen(false);
        }}
        onError={(message) => showToast(message, 'error')}
      />

      {/* [방식 B] 모바일/태블릿 카메라 바코드·QR 연속 스캔 모달 */}
      <SaleCameraScannerModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        catalog={catalog}
        cart={cart}
        onScanItem={addToCart}
        onUpdateQty={setQty}
        onRemoveItem={(key) => setQty(key, 0)}
      />

      {/* 결제 완료 시 영수증 즉시 출력 모달 */}
      <SaleReceiptPrintModal
        isOpen={Boolean(completedReceipt)}
        onClose={() => setCompletedReceipt(null)}
        receipt={completedReceipt}
      />

      {/* [개선안 2] 스마트 영수증 반품 모달 */}
      <SaleQuickReturnModal
        isOpen={quickReturnOpen}
        organizationId={orgId}
        onClose={() => setQuickReturnOpen(false)}
        onReturnCompleted={(refundAmount) => {
          showToast(`반품 환불(${formatCurrency(refundAmount)})이 정상 완료되었습니다. 재고가 복구되었습니다.`, 'success');
          void load();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* [사용자 친절도] POS 사용 가이드 모달 */}
      <SalePosGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      {/* [기성품 바코드] 미등록 바코드 즉석 상품 등록 모달 */}
      <SaleQuickProductCreateModal
        isOpen={quickCreateOpen}
        organizationId={orgId}
        initialBarcode={scannedUnregisteredCode}
        onClose={() => setQuickCreateOpen(false)}
        onSuccess={(newItem) => {
          setCatalog((prev) => [newItem, ...prev]);
          addToCart(newItem);
          showToast(`'${newItem.productName}' 등록 및 장바구니 추가 완료!`, 'success');
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* [개선안 3] 주문 보류 목록 모달 */}
      <Modal
        isOpen={heldModalOpen}
        onClose={() => setHeldModalOpen(false)}
        title="보류된 주문 목록"
        maxWidth="md"
      >
        <div className="p-4 sm:p-6 space-y-3">
          {heldCarts.length === 0 ? (
            <p className="text-center text-slate-500 py-6 text-sm">보류된 주문이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {heldCarts.map((held) => (
                <li key={held.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {held.createdAt}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {held.lines[0]?.productName}
                        {held.lines.length > 1 && ` 외 ${held.lines.length - 1}건`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      총 {held.lines.reduce((s, l) => s + l.quantity, 0)}개 · {formatCurrency(held.totalAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestoreHeldCart(held)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> 불러오기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHeldCart(held.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="보류 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* [개선안 4] 장바구니 전체 할인 모달 */}
      <Modal
        isOpen={totalDiscountModalOpen}
        onClose={() => setTotalDiscountModalOpen(false)}
        title="장바구니 전체 할인 적용"
        maxWidth="sm"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTotalDiscountType('won')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                totalDiscountType === 'won' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              금액 할인 (원)
            </button>
            <button
              type="button"
              onClick={() => setTotalDiscountType('percent')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                totalDiscountType === 'percent' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              할인율 (%)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {totalDiscountType === 'won' ? '할인 금액 입력' : '할인율 입력 (%)'}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={totalDiscountInput}
                onChange={(e) => setTotalDiscountInput(e.target.value.replace(/[^\d]/g, ''))}
                placeholder={totalDiscountType === 'won' ? '예: 3000' : '예: 10'}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-bold tabular-nums text-slate-900 focus:outline-teal-600"
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                {totalDiscountType === 'won' ? '원' : '%'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTotalDiscountModalOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApplyTotalDiscount}
              className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> 적용하기
            </button>
          </div>
        </div>
      </Modal>

      {/* [승격 Capability] promotional_deal (특가 프로모션 모달) */}
      <Modal
        isOpen={promoModalOpen}
        onClose={() => {
          setPromoModalOpen(false);
          void load();
        }}
        title="기간 한정 특가 & 이벤트 프로모션"
        maxWidth="4xl"
      >
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          <PromotionListPage />
        </div>
      </Modal>

      {/* [승격 Capability] daily_pos_reconciliation (일일 POS 마감 정산 모달) */}
      <Modal
        isOpen={reconciliationModalOpen}
        onClose={() => setReconciliationModalOpen(false)}
        title="일일 POS 마감 및 현금 시재 정산"
        maxWidth="4xl"
      >
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          <PosReconciliationListPage />
        </div>
      </Modal>
    </div>
  );
};
