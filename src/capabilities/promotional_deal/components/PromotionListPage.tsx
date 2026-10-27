import React, { useState } from 'react';
import { useList, useUpdate } from '@refinedev/core';
import {
  Tag,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  TrendingDown,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  PackageCheck,
  Percent,
} from 'lucide-react';
import {
  getPromotionStatus,
  getPromoStatusLabel,
  calculateRemainingQuantity,
  type PromotionalDeal,
  type PromoStatus,
} from '../domain/promoEngine';
import { PromotionFormModal } from './PromotionFormModal';
import { showToast } from '@/shared/feedback/uiFeedback';

type FilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE_OR_FINISHED';

export const PromotionListPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<FilterTab>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refine useList로 promotional_deals 페칭
  const { query } = useList<PromotionalDeal>({
    resource: 'promotional_deals',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 50 },
  });

  const deals = (query?.data?.data as PromotionalDeal[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: updateDeal } = useUpdate();

  const now = new Date();

  // 사업주 조기 마감 토글 스위치 핸들러
  const handleToggleActive = (deal: PromotionalDeal) => {
    const nextActive = !deal.is_active;
    updateDeal(
      {
        resource: 'promotional_deals',
        id: deal.id,
        values: {
          is_active: nextActive,
        },
      },
      {
        onSuccess: () => {
          showToast(
            nextActive
              ? `[${deal.title}] 특가가 다시 활성화되었습니다.`
              : `[${deal.title}] 특가가 조기 마감(비활성화)되었습니다.`,
            'success'
          );
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '상태 변경에 실패했습니다.', 'error');
        },
      }
    );
  };

  // 상태 판정 및 통계 계산
  const activeCount = deals.filter((d) => getPromotionStatus(d, now) === 'ACTIVE').length;
  const soldOutCount = deals.filter((d) => getPromotionStatus(d, now) === 'SOLD_OUT').length;
  const totalCount = deals.length;

  // 탭 필터링 및 검색 필터링
  const filteredDeals = deals.filter((deal) => {
    const status = getPromotionStatus(deal, now);

    if (currentTab === 'ACTIVE' && status !== 'ACTIVE') {
      return false;
    }
    if (currentTab === 'INACTIVE_OR_FINISHED' && status === 'ACTIVE') {
      return false;
    }

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      const matchTitle = deal.title.toLowerCase().includes(q);
      const matchTarget = deal.target_id.toLowerCase().includes(q);
      if (!matchTitle && !matchTarget) return false;
    }

    return true;
  });

  const getStatusBadgeClass = (status: PromoStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'UPCOMING':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'SOLD_OUT':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'EXPIRED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      case 'INACTIVE':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 상단 타이틀 & 조작 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                [기간 한정 특가] & 이벤트 관리
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                사업주가 원하는 기간 동안 특별 할인가와 한정 수량을 정하고 프로모션을 즉시 진행합니다.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>새 [기간 한정 특가] 등록</span>
        </button>
      </div>

      {/* KPI 지표 서머리 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">진행 중 특가</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {activeCount} <span className="text-xs font-normal text-slate-500">건</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">선착순 완판 이벤트</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {soldOutCount} <span className="text-xs font-normal text-slate-500">건</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">전체 등록 특가</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
              {totalCount} <span className="text-xs font-normal text-slate-500">건</span>
            </p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 필터 탭 & 검색 바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setCurrentTab('ALL')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              currentTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            전체 ({totalCount})
          </button>
          <button
            onClick={() => setCurrentTab('ACTIVE')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              currentTab === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            진행 중 ({activeCount})
          </button>
          <button
            onClick={() => setCurrentTab('INACTIVE_OR_FINISHED')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              currentTab === 'INACTIVE_OR_FINISHED'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            예정 / 마감 ({totalCount - activeCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="특가 제목 또는 품목 검색"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
          />
        </div>
      </div>

      {/* 특가 이벤트 목록 테이블 / 카드 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            특가 이벤트 목록을 불러오는 중입니다...
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
              <Tag className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              해당 조건의 [기간 한정 특가] 이벤트가 없습니다.
            </p>
            <p className="text-xs text-slate-400">
              새로운 특가 이벤트를 등록하여 고객 유치와 매출을 증대해 보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-5 py-3.5">구분 / 품목</th>
                  <th className="px-5 py-3.5">이벤트 제목</th>
                  <th className="px-5 py-3.5">정가 ➔ 특별 할인가</th>
                  <th className="px-5 py-3.5">진행 기간</th>
                  <th className="px-5 py-3.5">한정 수량 현황</th>
                  <th className="px-5 py-3.5">상태</th>
                  <th className="px-5 py-3.5 text-center">사업주 조기 마감</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeals.map((deal) => {
                  const status = getPromotionStatus(deal, now);
                  const statusLabel = getPromoStatusLabel(status);
                  const { remaining, isSoldOut, percentSold } = calculateRemainingQuantity(deal);

                  const discountRate =
                    deal.original_price > 0 && deal.special_price < deal.original_price
                      ? Math.round(
                          ((deal.original_price - deal.special_price) / deal.original_price) * 100
                        )
                      : 0;

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 구분 / 대상 품목 */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              deal.target_type === 'PASS'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                            }`}
                          >
                            {deal.target_type === 'PASS' ? '수강권' : '소매 상품'}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {deal.target_id}
                          </span>
                        </div>
                      </td>

                      {/* 이벤트 제목 */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {deal.title}
                        </div>
                      </td>

                      {/* 가격 (취소선 정가 -> 특가) */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="line-through text-slate-400 text-[11px]">
                            ₩{deal.original_price.toLocaleString()}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            ₩{deal.special_price.toLocaleString()}
                          </span>
                          {discountRate > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                              <TrendingDown className="w-2.5 h-2.5" />
                              -{discountRate}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 진행 기간 */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {new Date(deal.start_at).toLocaleDateString()} ~{' '}
                            {new Date(deal.end_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* 한정 수량 프로그레스 바 */}
                      <td className="px-5 py-4 min-w-[140px]">
                        {deal.limited_quantity !== null && deal.limited_quantity !== undefined ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>
                                {deal.sold_quantity} / {deal.limited_quantity}개
                              </span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {percentSold}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isSoldOut ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${percentSold}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">무제한 판매</span>
                        )}
                      </td>

                      {/* 상태 라벨 */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </td>

                      {/* 사업주 조기 마감 토글 버튼 */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleActive(deal)}
                          title={deal.is_active ? '이벤트 조기 마감하기' : '이벤트 다시 활성화하기'}
                          className={`p-1 rounded-lg transition-colors ${
                            deal.is_active
                              ? 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {deal.is_active ? (
                            <ToggleRight className="w-6 h-6 inline" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 inline" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 등록 모달 */}
      <PromotionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
