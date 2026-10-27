import React, { useState, useMemo, useEffect } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Package,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Warehouse,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  FileCheck2,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import {
  applyStockMovement,
  checkSafetyStockWarning,
  validateStockInLot,
  allocateStockLotsFefo,
  evaluateInventoryExpiryStatus,
  formatPickingLocation,
  calculateStockAuditDiscrepancy,
  createStockAuditSlip,
  type InventoryItem,
  type StockLotItem,
  type WarehouseLocation,
  type StockAuditItem,
  type StockAuditSlip,
  type ExpiryAlertStatus,
} from '../domain/inventoryEngine';

const STORAGE_KEY_ITEMS = 'moa_inventory_items';
const STORAGE_KEY_LOTS = 'moa_inventory_lots';

export interface InventoryManagementViewProps {
  title?: string;
  subtitle?: string;
  defaultItemType?: 'goods' | 'textbook' | 'consumable';
  allowedItemTypes?: ('goods' | 'textbook' | 'consumable')[];
  itemTypeLabel?: string;
  showItemTypeFilter?: boolean;
}

const DEFAULT_INVENTORY_ITEMS: (InventoryItem & { location?: WarehouseLocation })[] = [
  {
    id: 'inv-01',
    name: '스페셜티 에스프레소 원두',
    sku: 'COF-ESP-01',
    itemType: 'goods',
    barcode: '8801234560012',
    currentStock: 45,
    safetyStock: 15,
    unitPrice: 25000,
    vendorName: '(주)모아커피로스터스',
    location: { zoneId: 'ZONE-A (상온)', rackNo: 'RACK-01', binNo: 'BIN-03' },
  },
  {
    id: 'inv-02',
    name: '신선 1등급 우유 1000ml',
    sku: 'DAIRY-MILK-01',
    itemType: 'consumable',
    barcode: '8801234560029',
    currentStock: 12,
    safetyStock: 20, // 안전재고 미달
    unitPrice: 2400,
    vendorName: '서울유업',
    location: { zoneId: 'ZONE-C (냉장)', rackNo: 'RACK-01', binNo: 'BIN-01' },
  },
  {
    id: 'inv-03',
    name: '수제 바닐라 빈 시럽 750ml',
    sku: 'SYR-VAN-01',
    itemType: 'consumable',
    barcode: '8801234560036',
    currentStock: 18,
    safetyStock: 8,
    unitPrice: 16000,
    vendorName: '(주)달콤푸드',
    location: { zoneId: 'ZONE-A (상온)', rackNo: 'RACK-02', binNo: 'BIN-05' },
  },
  {
    id: 'inv-04',
    name: '바이엘 1 (기초 피아노 교본)',
    sku: 'BK-PIANO-B01',
    itemType: 'textbook',
    barcode: '9788932612341',
    currentStock: 15,
    safetyStock: 5,
    unitPrice: 8000,
    vendorName: '세광음악출판사',
    metadata: { publisher: '세광음악출판사', level: '바이엘 상', author: 'F. Beyer' },
    location: { zoneId: 'BOOK-A (교재보관함)', rackNo: 'RACK-01', binNo: 'BIN-01' },
  },
  {
    id: 'inv-05',
    name: '체르니 100번 연습곡',
    sku: 'BK-PIANO-C100',
    itemType: 'textbook',
    barcode: '9788932612358',
    currentStock: 10,
    safetyStock: 4,
    unitPrice: 9000,
    vendorName: '세광음악출판사',
    metadata: { publisher: '세광음악출판사', level: '체르니 100', author: 'C. Czerny' },
    location: { zoneId: 'BOOK-A (교재보관함)', rackNo: 'RACK-01', binNo: 'BIN-02' },
  },
];

const DEFAULT_LOTS: (StockLotItem & { location?: WarehouseLocation })[] = [
  {
    id: 'lot-01',
    itemId: 'inv-02',
    lotNumber: 'LOT-261015-M1',
    expiryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10), // 3일 후 만료 (임박)
    quantity: 4,
    locationName: 'ZONE-C (냉장) / RACK-01 / BIN-01',
  },
  {
    id: 'lot-02',
    itemId: 'inv-02',
    lotNumber: 'LOT-261025-M2',
    expiryDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10), // 10일 후 만료 (30일 이내)
    quantity: 8,
    locationName: 'ZONE-C (냉장) / RACK-01 / BIN-01',
  },
  {
    id: 'lot-03',
    itemId: 'inv-01',
    lotNumber: 'LOT-261101-C1',
    expiryDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().slice(0, 10), // 정상
    quantity: 45,
    locationName: 'ZONE-A (상온) / RACK-01 / BIN-03',
  },
  {
    id: 'lot-04',
    itemId: 'inv-03',
    lotNumber: 'LOT-260930-S1',
    expiryDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10), // 만료됨
    quantity: 2,
    locationName: 'ZONE-A (상온) / RACK-02 / BIN-05',
  },
];

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  title = '엔터프라이즈 스마트 재고·자재 관제',
  subtitle = '로트 번호, 유효기간(FEFO), 창고 랙/빈 위치 및 정기 실사 대사표',
  defaultItemType,
  allowedItemTypes,
  itemTypeLabel = '품목',
  showItemTypeFilter = true,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'lots' | 'audit'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>(defaultItemType || 'ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutFefoModalOpen, setIsStockOutFefoModalOpen] = useState(false);
  const [selectedItemForFefo, setSelectedItemForFefo] = useState<InventoryItem | null>(null);

  const storageKeyItems = getTenantStorageKey(STORAGE_KEY_ITEMS);
  const storageKeyLots = getTenantStorageKey(STORAGE_KEY_LOTS);

  // Refine v5 데이터 페칭
  const { query: itemsQuery } = useList<any>({
    resource: 'inventory_items',
    pagination: { mode: 'off' },
  });

  const refineItems = itemsQuery?.data?.data as (InventoryItem & { location?: WarehouseLocation })[] | undefined;
  const refetchItems = itemsQuery?.refetch ?? (() => {});

  const { mutate: mutateCreateItem } = useCreate();
  const { mutate: mutateUpdateItem } = useUpdate();

  // 로컬 폴백 상태
  const [localItems, setLocalItems] = useState<(InventoryItem & { location?: WarehouseLocation })[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyItems);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INVENTORY_ITEMS;
  });

  const [lots, setLots] = useState<(StockLotItem & { location?: WarehouseLocation })[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyLots);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LOTS;
  });

  const items = useMemo(() => {
    if (refineItems && refineItems.length > 0) return refineItems;
    return localItems;
  }, [refineItems, localItems]);

  const saveLocalItems = (next: (InventoryItem & { location?: WarehouseLocation })[]) => {
    setLocalItems(next);
    try {
      localStorage.setItem(storageKeyItems, JSON.stringify(next));
    } catch {}
  };

  const saveLots = (next: (StockLotItem & { location?: WarehouseLocation })[]) => {
    setLots(next);
    try {
      localStorage.setItem(storageKeyLots, JSON.stringify(next));
    } catch {}
  };

  // 실사 대사표 데이터 상태
  const [auditQuantities, setAuditQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    DEFAULT_INVENTORY_ITEMS.forEach((it) => {
      init[it.id] = it.currentStock;
    });
    // 샘플 차이 생성
    init['inv-02'] = 10; // 전산 12 대비 2개 부족 (감모)
    init['inv-03'] = 20; // 전산 18 대비 2개 잉여
    return init;
  });

  const auditItems: StockAuditItem[] = useMemo(() => {
    return items.map((it) => ({
      itemId: it.id,
      itemName: it.name,
      sku: it.sku,
      bookQuantity: it.currentStock,
      actualQuantity: auditQuantities[it.id] !== undefined ? auditQuantities[it.id] : it.currentStock,
      unitPrice: it.unitPrice,
      location: it.location,
    }));
  }, [items, auditQuantities]);

  const auditAnalysis = useMemo(() => {
    return calculateStockAuditDiscrepancy(auditItems);
  }, [auditItems]);

  // 안전재고 미달 품목 수
  const safetyWarningCount = useMemo(() => {
    return items.filter((it) => checkSafetyStockWarning(it)).length;
  }, [items]);

  // 유통기한 위험 품목 수 (만료 + 7일 임박)
  const expiryRiskLots = useMemo(() => {
    return lots.filter((l) => {
      const status = evaluateInventoryExpiryStatus(l.expiryDate);
      return status === 'EXPIRED' || status === 'CRITICAL_7_DAYS';
    });
  }, [lots]);

  // 필터링된 품목 목록
  const filteredItems = useMemo(() => {
    let result = items;
    if (itemTypeFilter !== 'ALL') {
      result = result.filter((it) => (it.itemType || 'goods') === itemTypeFilter);
    }
    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(
      (it) =>
        it.name.toLowerCase().includes(term) ||
        it.sku.toLowerCase().includes(term) ||
        (it.barcode && it.barcode.includes(term))
    );
  }, [items, itemTypeFilter, searchTerm]);

  // 필터링된 로트 목록
  const filteredLots = useMemo(() => {
    let result = lots;
    if (expiryFilter !== 'ALL') {
      result = result.filter((l) => evaluateInventoryExpiryStatus(l.expiryDate) === expiryFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((l) => l.lotNumber.toLowerCase().includes(term));
    }
    return result;
  }, [lots, expiryFilter, searchTerm]);

  // 실사 감모 승인 전표 발행
  const handleCreateAuditSlip = () => {
    const slip = createStockAuditSlip('AUDIT-AUTO-01', auditAnalysis.discrepancies, '관리자');
    showToast(
      `실사 전표(${slip.slipNumber})가 발행되었습니다. ${
        slip.approvalRequired ? '[감모손실 10만 원 이상: 관리자 승인 필요]' : ''
      }`,
      slip.approvalRequired ? 'warning' : 'success'
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-semibold mb-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>실무형 스마트 재고·선입선출(FIFO) 관제</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStockInModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>로트 정밀 입고</span>
          </button>
        </div>
      </div>

      {/* 4대 주요 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>총 등록 품목</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length}개 품목</div>
          <p className="text-[11px] text-slate-400">보관 랙/빈 위치 100% 매핑</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>안전재고 미달 품목</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{safetyWarningCount}개 품목</div>
          <p className="text-[11px] text-amber-600 font-medium">자동 발주(Auto-PO) 권고</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>유효기간 위험 로트</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-950">{expiryRiskLots.length}건</div>
          <p className="text-[11px] text-rose-600 font-bold">만료 및 7일 이내 (폐기/할인)</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold">
            <span>실사 감모손실액</span>
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-950">
            {auditAnalysis.totalShortageAmount.toLocaleString('ko-KR')}원
          </div>
          <p className="text-[11px] text-indigo-600 font-medium">
            전산 대비 {auditAnalysis.discrepancies.filter((d) => d.status === 'SHORTAGE').length}건 차이 발생
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'items'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>품목 및 창고 랙/빈 위치 ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lots')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'lots'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>로트 번호 및 유효기간 관제 (FEFO) ({lots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'audit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>정기 재고 실사 대사표 (Stock Audit)</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 품목 및 랙/빈 위치 목록 */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`${itemTypeLabel}명, SKU, 바코드 검색`}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {showItemTypeFilter && (
                <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                  {(allowedItemTypes ?? ['ALL', 'goods', 'textbook', 'consumable']).map((typeKey) => {
                    const isAll = typeKey === 'ALL';
                    const label = isAll
                      ? '전체 유형'
                      : typeKey === 'goods'
                        ? '일반상품'
                        : typeKey === 'textbook'
                          ? '교재'
                          : '소모품';
                    const isSelected = itemTypeFilter === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setItemTypeFilter(typeKey)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-xs text-slate-400 font-semibold text-right">
              전체 <strong className="text-blue-600">{filteredItems.length}</strong>/{items.length}개 {itemTypeLabel}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">품목명</th>
                    <th className="px-4 py-3">물리적 적재 위치 (Zone / Rack / Bin)</th>
                    <th className="px-4 py-3">현재고 / 안전재고</th>
                    <th className="px-4 py-3">단위 단가</th>
                    <th className="px-4 py-3">공급처</th>
                    <th className="px-4 py-3 text-right">FEFO 출고 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((it) => {
                    const isShortage = checkSafetyStockWarning(it);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{it.sku}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{it.name}</span>
                            {it.itemType === 'textbook' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                                {it.metadata?.level ? String(it.metadata.level) : '교재'}
                              </span>
                            )}
                            {it.itemType === 'consumable' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                                소모품
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                            <Warehouse className="w-3 h-3 text-blue-600" />
                            <span>{formatPickingLocation(it.location)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">
                          <span className={isShortage ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                            {it.currentStock}개
                          </span>
                          <span className="text-slate-400 text-[11px] font-normal ml-1">
                            (안전: {it.safetyStock}개)
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {it.unitPrice.toLocaleString('ko-KR')}원
                        </td>
                        <td className="px-4 py-3 text-slate-500">{it.vendorName || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForFefo(it);
                              setIsStockOutFefoModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <span>FEFO 출고 추천</span>
                            <ArrowDownRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 로트 및 유효기간 관제 */}
      {activeTab === 'lots' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="로트 번호 검색"
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                aria-label="유효기간 필터"
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 유효기간 상태</option>
                <option value="CRITICAL_7_DAYS">7일 이내 임박 (위험)</option>
                <option value="WARNING_30_DAYS">30일 이내 임박 (경고)</option>
                <option value="EXPIRED">만료됨 (폐기 대상)</option>
                <option value="NORMAL">정상</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">로트 번호</th>
                    <th className="px-4 py-3">대상 품목</th>
                    <th className="px-4 py-3">유효기간</th>
                    <th className="px-4 py-3">상태 판정</th>
                    <th className="px-4 py-3">로트 잔여 수량</th>
                    <th className="px-4 py-3">적재 위치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLots.map((lot) => {
                    const status = evaluateInventoryExpiryStatus(lot.expiryDate);
                    const targetItem = items.find((it) => it.id === lot.itemId);

                    const badgeMap: Record<ExpiryAlertStatus, { bg: string; text: string; label: string }> = {
                      EXPIRED: { bg: 'bg-rose-100', text: 'text-rose-800', label: '유효기간 만료' },
                      CRITICAL_7_DAYS: { bg: 'bg-rose-50', text: 'text-rose-700', label: '7일 이내 임박' },
                      WARNING_30_DAYS: { bg: 'bg-amber-50', text: 'text-amber-700', label: '30일 이내' },
                      NORMAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '정상 유효' },
                    };

                    const b = badgeMap[status];

                    return (
                      <tr key={lot.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-extrabold text-blue-900">{lot.lotNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{targetItem?.name || lot.itemId}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{lot.expiryDate}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${b.bg} ${b.text}`}>
                            {b.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{lot.quantity}개</td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">{lot.locationName || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 정기 재고 실사 대사표 */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  전산 재고 vs 현장 실사 대조표 (순 차이액:{' '}
                  <span className={auditAnalysis.netVarianceAmount < 0 ? 'text-rose-600 font-extrabold' : 'text-blue-600 font-extrabold'}>
                    {auditAnalysis.netVarianceAmount.toLocaleString('ko-KR')}원
                  </span>
                  )
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  총 감모손실: <strong className="text-rose-600">{auditAnalysis.totalShortageAmount.toLocaleString('ko-KR')}원</strong> | 총 잉여: <strong className="text-blue-600">{auditAnalysis.totalSurplusAmount.toLocaleString('ko-KR')}원</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateAuditAuditSlipClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>감모 승인 전표 발행</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">품목명 / SKU</th>
                    <th className="px-4 py-3">전산 현재고</th>
                    <th className="px-4 py-3">현장 실사 수량</th>
                    <th className="px-4 py-3">수량 차이</th>
                    <th className="px-4 py-3">단가</th>
                    <th className="px-4 py-3">차이 금액</th>
                    <th className="px-4 py-3">판정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditAnalysis.discrepancies.map((d) => (
                    <tr key={d.itemId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {d.itemName}
                        <span className="text-[10px] text-slate-400 font-mono block">{d.sku}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{d.bookQuantity}개</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={auditQuantities[d.itemId] !== undefined ? auditQuantities[d.itemId] : d.bookQuantity}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setAuditQuantities((prev) => ({ ...prev, [d.itemId]: val }));
                          }}
                          className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg text-right font-mono focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold font-mono">
                        <span className={d.diffQuantity < 0 ? 'text-rose-600' : d.diffQuantity > 0 ? 'text-blue-600' : 'text-slate-400'}>
                          {d.diffQuantity > 0 ? `+${d.diffQuantity}` : d.diffQuantity}개
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {items.find((it) => it.id === d.itemId)?.unitPrice.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3 font-extrabold font-mono">
                        <span className={d.diffAmount < 0 ? 'text-rose-600' : d.diffAmount > 0 ? 'text-blue-600' : 'text-slate-400'}>
                          {d.diffAmount > 0 ? `+${d.diffAmount.toLocaleString('ko-KR')}` : d.diffAmount.toLocaleString('ko-KR')}원
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.status === 'MATCH' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            일치
                          </span>
                        )}
                        {d.status === 'SHORTAGE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            감모손실
                          </span>
                        )}
                        {d.status === 'SURPLUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            재고잉여
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FEFO 출고 추천 모달 */}
      {isStockOutFefoModalOpen && selectedItemForFefo && (
        <FefoStockOutModal
          item={selectedItemForFefo}
          lots={lots.filter((l) => l.itemId === selectedItemForFefo.id)}
          onClose={() => {
            setIsStockOutFefoModalOpen(false);
            setSelectedItemForFefo(null);
          }}
          onDeducted={(allocatedLots, totalDeducted) => {
            // 로트 수량 차감
            const lotAllocMap = new Map<string, number>();
            allocatedLots.forEach((al) => lotAllocMap.set(al.lotNumber, al.allocatedQuantity));

            const nextLots = lots.map((l) => {
              if (l.itemId === selectedItemForFefo.id && lotAllocMap.has(l.lotNumber)) {
                return {
                  ...l,
                  quantity: l.quantity - (lotAllocMap.get(l.lotNumber) || 0),
                };
              }
              return l;
            });
            saveLots(nextLots);

            // 품목 총 재고 차감
            const nextItems = items.map((it) =>
              it.id === selectedItemForFefo.id
                ? { ...it, currentStock: it.currentStock - totalDeducted }
                : it
            );
            saveLocalItems(nextItems);
            showToast(`[${selectedItemForFefo.name}] ${totalDeducted}개 FEFO 선입선출 출고 완료`, 'success');
            setIsStockOutFefoModalOpen(false);
            setSelectedItemForFefo(null);
          }}
        />
      )}

      {/* 로트 입고 모달 */}
      {isStockInModalOpen && (
        <StockInLotModal
          items={items}
          onClose={() => setIsStockInModalOpen(false)}
          onCreated={(newLot, targetItem, inQty) => {
            saveLots([newLot, ...lots]);
            const nextItems = items.map((it) =>
              it.id === targetItem.id ? { ...it, currentStock: it.currentStock + inQty } : it
            );
            saveLocalItems(nextItems);
            showToast(`[${targetItem.name}] 로트 '${newLot.lotNumber}' ${inQty}개 입고 완료`, 'success');
            setIsStockInModalOpen(false);
          }}
        />
      )}
    </div>
  );

  function handleCreateAuditAuditSlipClick() {
    handleCreateAuditSlip();
  }
};

// ============================================================================
// FEFO 출고 추천 모달
// ============================================================================

interface FefoStockOutModalProps {
  item: InventoryItem;
  lots: StockLotItem[];
  onClose: () => void;
  onDeducted: (allocatedLots: { lotNumber: string; allocatedQuantity: number }[], total: number) => void;
}

const FefoStockOutModal: React.FC<FefoStockOutModalProps> = ({ item, lots, onClose, onDeducted }) => {
  const [requestQty, setRequestQty] = useState(5);

  const fefoResult = useMemo(() => {
    return allocateStockLotsFefo(lots, requestQty);
  }, [lots, requestQty]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-blue-600">FEFO (First Expired, First Out)</span>
            <h3 className="text-base font-bold text-slate-900">{item.name} 선입선출 출고</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            출고 요청 수량 (개)
          </label>
          <input
            type="number"
            min="1"
            max={item.currentStock}
            value={requestQty}
            onChange={(e) => setRequestQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-xs font-bold text-slate-800">시스템 권고 출고 로트 순서</span>
          <div className="divide-y divide-slate-200/60">
            {fefoResult.allocatedLots.map((al) => (
              <div key={al.lotNumber} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-800">{al.lotNumber}</span>
                  <span className="text-[11px] text-slate-400 ml-2">(유효: {al.expiryDate})</span>
                </div>
                <span className="font-bold text-blue-600 font-mono">{al.allocatedQuantity}개 차감</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            취소
          </button>
          <button
            type="button"
            disabled={!fefoResult.isFullyAllocated}
            onClick={() => onDeducted(fefoResult.allocatedLots, fefoResult.totalAllocated)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-xs"
          >
            권고 로트로 즉시 출고 확정
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 로트 입고 모달
// ============================================================================

interface StockInLotModalProps {
  items: (InventoryItem & { location?: WarehouseLocation })[];
  onClose: () => void;
  onCreated: (lot: StockLotItem, targetItem: InventoryItem, inQty: number) => void;
}

const StockInLotModal: React.FC<StockInLotModalProps> = ({ items, onClose, onCreated }) => {
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [lotNumber, setLotNumber] = useState(`LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-01`);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [quantity, setQuantity] = useState('20');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inQty = Number(quantity) || 0;
    const validation = validateStockInLot({
      lotNumber,
      expiryDate,
      quantity: inQty,
    });

    if (!validation.isValid) {
      showToast(validation.error || '입력값을 확인해주세요.', 'warning');
      return;
    }

    const targetItem = items.find((it) => it.id === selectedItemId);
    if (!targetItem) return;

    const newLot: StockLotItem = {
      id: `lot-${Date.now()}`,
      itemId: targetItem.id,
      lotNumber: lotNumber.trim(),
      expiryDate,
      quantity: inQty,
      locationName: formatPickingLocation(targetItem.location),
    };

    onCreated(newLot, targetItem, inQty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">신규 로트 정밀 입고</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">입고 대상 품목</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">로트 번호 (Lot Number)</label>
            <input
              type="text"
              required
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="예: LOT-202610-01"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">유효기간 (Expiry Date)</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">입고 수량 (개)</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              입고 처리 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
