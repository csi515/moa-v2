import React, { useState, useEffect, useMemo } from 'react';
import { Textbook } from '@/types';
import {
  BookOpen,
  Search,
  AlertTriangle,
  Ban,
  RotateCcw,
  Edit2,
  PackagePlus,
  ShoppingBag,
} from 'lucide-react';
import { TextbookSortOption } from '../textbookViewTypes';

interface TextbookInventoryTabProps {
  textbooks: Textbook[];
  focusLowStock?: boolean;
  onFocusLowStockHandled?: () => void;
  onDeactivateTextbook: (id: string, title: string) => void;
  onReactivateTextbook: (id: string, title: string) => void;
  onOpenStockModal: (textbook: Textbook) => void;
  onEditTextbook: (textbook: Textbook) => void;
  onOpenSaleModal: (textbookId: string) => void;
}

export const TextbookInventoryTab: React.FC<TextbookInventoryTabProps> = ({
  textbooks,
  focusLowStock,
  onFocusLowStockHandled,
  onDeactivateTextbook,
  onReactivateTextbook,
  onOpenStockModal,
  onEditTextbook,
  onOpenSaleModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [publisherFilter, setPublisherFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortOption, setSortOption] = useState<TextbookSortOption>('title');

  useEffect(() => {
    if (focusLowStock) {
      setOnlyLowStock(true);
      onFocusLowStockHandled?.();
    }
  }, [focusLowStock, onFocusLowStockHandled]);

  const publishers = useMemo(
    () => Array.from(new Set(textbooks.map((t) => t.publisher).filter(Boolean))),
    [textbooks]
  );
  const levels = useMemo(
    () => Array.from(new Set(textbooks.map((t) => t.level).filter(Boolean))),
    [textbooks]
  );

  const filteredTextbooks = useMemo(
    () =>
      textbooks
        .filter((t) => {
          const matchQuery =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.author && t.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.isbn && t.isbn.includes(searchQuery)) ||
            (t.publisher && t.publisher.toLowerCase().includes(searchQuery.toLowerCase()));

          const matchLevel = levelFilter === 'all' || t.level === levelFilter;
          const matchPublisher = publisherFilter === 'all' || t.publisher === publisherFilter;
          const matchLowStock = !onlyLowStock || t.stock <= t.minStock;
          const isActive = t.isForSale !== false;
          const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && isActive) ||
            (statusFilter === 'inactive' && !isActive);

          return matchQuery && matchLevel && matchPublisher && matchLowStock && matchStatus;
        })
        .sort((a, b) => {
          const priceA = a.salePrice || a.price || 0;
          const priceB = b.salePrice || b.price || 0;
          if (sortOption === 'price_asc') return priceA - priceB;
          if (sortOption === 'price_desc') return priceB - priceA;
          if (sortOption === 'stock_asc') return a.stock - b.stock;
          if (sortOption === 'stock_desc') return b.stock - a.stock;
          return a.title.localeCompare(b.title, 'ko');
        }),
    [textbooks, searchQuery, levelFilter, publisherFilter, onlyLowStock, sortOption, statusFilter]
  );

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 헤더 */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="교재명, 저자, 출판사, ISBN 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-900 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">전체 상태</option>
            <option value="active">사용중</option>
            <option value="inactive">사용안함</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">전체 레벨</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>

          <select
            value={publisherFilter}
            onChange={(e) => setPublisherFilter(e.target.value)}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">전체 출판사</option>
            {publishers.map((pub) => (
              <option key={pub} value={pub}>
                {pub}
              </option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as TextbookSortOption)}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="title">교재명순</option>
            <option value="stock_asc">재고 적은순 (부족순)</option>
            <option value="stock_desc">재고 많은순</option>
            <option value="price_desc">판매가 높은순</option>
            <option value="price_asc">판매가 낮은순</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 min-h-[44px] rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              onlyLowStock
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            재고 부족만 보기
          </button>
        </div>
      </div>

      {/* 교재 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredTextbooks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800">
                {searchQuery.trim() ||
                levelFilter !== 'all' ||
                publisherFilter !== 'all' ||
                onlyLowStock ||
                statusFilter !== 'all'
                  ? '조건에 맞는 교재가 없습니다'
                  : '등록된 교재가 없습니다'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                상단의 '+ 새 교재 등록' 버튼으로 학원에서 사용할 교재를 추가해보세요.
              </p>
            </div>
          </div>
        ) : (
          filteredTextbooks.map((tb) => {
            const isOutOfStock = tb.stock <= 0;
            const isLow = tb.stock <= tb.minStock;
            const isActive = tb.isForSale !== false;
            const salePrice = tb.salePrice || tb.price || 0;
            const costPrice = tb.costPrice || Math.round(salePrice * 0.6);

            return (
              <div
                key={tb.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  !isActive
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : isOutOfStock
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : isLow
                        ? 'border-amber-300 ring-2 ring-amber-500/10'
                        : 'border-slate-200/90'
                } shadow-xs hover:shadow-sm`}
              >
                <div>
                  {/* 상단 태그들 */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isActive ? '사용중' : '사용안함'}
                      </span>
                      {tb.level && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                          {tb.level}
                        </span>
                      )}
                      {tb.publisher && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {tb.publisher}
                        </span>
                      )}
                    </div>

                    {isActive && (
                      isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-extrabold shadow-xs">
                          품절
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          재고 부족
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                          재고 양호
                        </span>
                      )
                    )}
                  </div>

                  {/* 교재 제목 & 저자 정보 */}
                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug tracking-tight">
                    {tb.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {tb.author ? `저자: ${tb.author}` : '저자 미상'}{' '}
                    {tb.isbn ? `| ISBN: ${tb.isbn}` : ''}
                  </p>

                  {tb.memo && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 line-clamp-2 border border-slate-100">
                      {tb.memo}
                    </p>
                  )}

                  {/* 가격 및 재고 박스 */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">교재 판매가</span>
                      <span className="font-black text-slate-900 text-sm tabular-nums">
                        ₩{salePrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 tabular-nums">
                        원가 ₩{costPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block font-medium">현재 재고</span>
                      <span
                        className={`font-black text-base tabular-nums ${
                          isOutOfStock ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {tb.stock}권
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 tabular-nums">
                        최소 {tb.minStock}권 권장
                      </span>
                    </div>
                  </div>
                </div>

                {/* 하단 액션 버튼 바 */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenStockModal(tb)}
                      className="px-2.5 py-1.5 min-h-[40px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="입고 및 재고 조정"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-indigo-600" />
                      입고/조정
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTextbook(tb)}
                      className="p-2 min-h-[40px] min-w-[40px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                      title="교재 정보 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => onDeactivateTextbook(tb.id, tb.title)}
                        className="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                        title="사용 중지"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReactivateTextbook(tb.id, tb.title)}
                        className="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                        title="다시 사용"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => onOpenSaleModal(tb.id)}
                      className="px-3 py-1.5 min-h-[40px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      교재 배부
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 px-2">지급 중단</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
