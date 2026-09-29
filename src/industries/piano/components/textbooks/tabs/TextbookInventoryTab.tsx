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
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="교재명, 저자, 출판사, ISBN 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="all">전체 상태</option>
            <option value="active">사용중</option>
            <option value="inactive">사용안함</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
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
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
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
            className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="title">교재명순</option>
            <option value="price_desc">판매가격 높은순</option>
            <option value="price_asc">판매가격 낮은순</option>
            <option value="stock_asc">재고 적은순 (부족순)</option>
            <option value="stock_desc">재고 많은순</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 min-h-[44px] rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTextbooks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">
                {searchQuery.trim() ||
                levelFilter !== 'all' ||
                publisherFilter !== 'all' ||
                onlyLowStock ||
                statusFilter !== 'all'
                  ? '조건에 맞는 교재가 없습니다'
                  : '등록된 교재가 없습니다'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                교재는 학원별 마스터로 관리되며, 필요할 때만 학생에게 일회성으로 판매합니다.
              </p>
            </div>
          </div>
        ) : (
          filteredTextbooks.map((tb) => {
            const isLow = tb.stock <= tb.minStock;
            const isActive = tb.isForSale !== false;
            const salePrice = tb.salePrice || tb.price || 0;
            const costPrice = tb.costPrice || Math.round(salePrice * 0.6);

            return (
              <div
                key={tb.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  !isActive
                    ? 'border-slate-200 opacity-75'
                    : isLow
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : 'border-slate-200'
                } shadow-xs hover:shadow-md`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isActive ? '사용중' : '사용안함'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                        {tb.level}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                        {tb.publisher}
                      </span>
                    </div>

                    {isActive &&
                      (isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          재고 부족
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                          재고 양호
                        </span>
                      ))}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{tb.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tb.author ? `저자: ${tb.author}` : '저자 미상'}{' '}
                    {tb.isbn ? `| ISBN: ${tb.isbn}` : ''}
                  </p>

                  {tb.memo && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-2.5 line-clamp-2">
                      {tb.memo}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">판매단가</span>
                      <span className="font-bold text-slate-900 text-sm">
                        ₩{salePrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        원가 ₩{costPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">현재 보유 재고</span>
                      <span
                        className={`font-black text-base ${isLow ? 'text-rose-600' : 'text-slate-900'}`}
                      >
                        {tb.stock}권
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        최소 {tb.minStock}권 유지
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenStockModal(tb)}
                      className="px-2.5 py-1.5 min-h-[44px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      title="입고/조정"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-indigo-600" />
                      입고/조정
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTextbook(tb)}
                      className="p-1.5 min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="교재 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => onDeactivateTextbook(tb.id, tb.title)}
                        className="p-1.5 min-h-[44px] min-w-[44px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="사용 중지"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReactivateTextbook(tb.id, tb.title)}
                        className="p-1.5 min-h-[44px] min-w-[44px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
                      className="px-3 py-1.5 min-h-[44px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      판매하기
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 px-2">판매 불가</span>
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
