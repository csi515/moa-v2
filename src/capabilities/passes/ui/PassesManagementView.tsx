import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ticket,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Sparkles,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { EmptyStateHero } from '@/shared/components/ui/EmptyStateHero';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useTenantTerms } from '@/core/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchPasses,
  deductPassAtomic,
  issuePass,
  type PassRecord,
} from '../services/passesService';
import type { PassType } from '../domain/passesEngine';
import {
  filterPasses,
  type PassesStatusFilter,
} from '../domain/passesFilterPredicate';
import { invalidateTenantQueries } from '@/core/query/tenantQueryKeys';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import type { PassStarterTemplate } from '@/core/presets/types';
import { cn } from '@/shared/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// 상태 배지
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PassRecord['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shrink-0">이용 가능</span>;
    case 'EXHAUSTED':
      return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 shrink-0">소진됨</span>;
    case 'EXPIRED':
      return <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 shrink-0">기간 만료</span>;
    case 'PAUSED':
      return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 shrink-0">일시 정지</span>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 발급 모달
// ─────────────────────────────────────────────────────────────────────────────

interface IssueModalProps {
  tenantId: string;
  starterTemplates?: readonly PassStarterTemplate[];
  initialTemplate?: PassStarterTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

function IssuePassModal({
  tenantId,
  starterTemplates = [],
  initialTemplate,
  onClose,
  onSuccess,
  showToast,
}: IssueModalProps) {
  const { t } = useTenantTerms();
  const customerTerm = t('customer', '고객');
  const passTerm = t('pass', '이용권');

  const defaultTpl = initialTemplate || (starterTemplates.length > 0 ? starterTemplates[0] : null);

  const [passName, setPassName] = useState(defaultTpl?.name || `10회 ${passTerm}`);
  const [passType, setPassType] = useState<PassType>(defaultTpl?.passType || 'COUNT_BASED');
  const [totalCount, setTotalCount] = useState(defaultTpl?.totalCount || 10);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validityDays, setValidityDays] = useState(defaultTpl?.validityDays || 90);

  const applyTemplate = (tpl: PassStarterTemplate) => {
    setPassName(tpl.name);
    setPassType(tpl.passType);
    setTotalCount(tpl.totalCount);
    setValidityDays(tpl.validityDays);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast(`${customerTerm} 이름을 입력해 주세요.`);
      return;
    }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await issuePass({
        tenantId,
        customerName,
        customerPhone,
        passName,
        passType,
        totalCount,
        validityDays,
      });
      showToast(`${passTerm}이(가) 정상 발급되었습니다!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '발급 실패');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 truncate">신규 {passTerm} 발급</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {starterTemplates.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <label className="block text-[11px] font-bold text-indigo-900 mb-1.5">
                💡 업종 추천 템플릿 원클릭 적용
              </label>
              <div className="flex flex-wrap gap-1.5">
                {starterTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      passName === tpl.name
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    )}
                  >
                    {tpl.badge ? `[${tpl.badge}] ` : ''}{tpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700">{customerTerm} 이름 *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              data-testid="input-pass-customer-name" placeholder="예: 홍길동"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              data-testid="input-pass-customer-phone" placeholder="010-0000-0000"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">{passTerm} 명칭 *</label>
            <input
              type="text"
              required
              value={passName}
              onChange={(e) => setPassName(e.target.value)}
              data-testid="input-pass-name" placeholder={`예: 10회권, 1개월 자유권`}
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">제공 횟수</label>
              <input
                type="number"
                min="1"
                value={totalCount}
                onChange={(e) => setTotalCount(Number(e.target.value))}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">유효기간 (일)</label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="btn-submit-issue-pass"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 min-w-[90px] transition-all"
            >
              {isSubmitting ? '발급 중...' : '발급 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 뷰
// ─────────────────────────────────────────────────────────────────────────────

export const PassesManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { t } = useTenantTerms();
  const customerTerm = t('customer', '고객');
  const passTerm = t('pass', '이용권');

  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get('status');
  const statusFilter: PassesStatusFilter =
    rawStatus === 'ACTIVE' || rawStatus === 'EXHAUSTED' || rawStatus === 'EXPIRED' || rawStatus === 'PAUSED'
      ? rawStatus
      : 'ALL';
  const searchQuery = searchParams.get('q') || '';

  const handleStatusChange = useCallback(
    (newStatus: PassesStatusFilter) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newStatus === 'ALL') {
            next.delete('status');
          } else {
            next.set('status', newStatus);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (newQuery: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!newQuery.trim()) {
            next.delete('q');
          } else {
            next.set('q', newQuery);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedStarterTemplate, setSelectedStarterTemplate] = useState<PassStarterTemplate | null>(null);

  const preset = useMemo(() => {
    return getIndustryPreset(currentOrganization?.industry_type || 'general_academy');
  }, [currentOrganization?.industry_type]);

  const starterTemplates = preset?.starterPassTemplates || [];
  const badgeEmoji = preset?.theme?.badgeEmoji || '🎟️';
  const presetName = preset?.name || '매장';

  // 입장(-1) 버튼 중복 제출 방지: passId → 처리 중 여부
  const [deductingIds, setDeductingIds] = useState<Set<string>>(new Set());
  const deductingIdsRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // ── 목록 조회 (AbortController로 언마운트 경쟁 조건 방지) ─────────────────
  const loadPasses = useCallback(
    async (signal?: AbortSignal) => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
        const result = await fetchPasses(currentOrganization.id, signal);
        if (signal?.aborted) return;
        setPasses(result);
      } catch (err) {
        if (signal?.aborted) return;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [currentOrganization]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPasses(controller.signal);
    return () => controller.abort();
  }, [loadPasses]);

  // ── 입장 -1 차감 ──────────────────────────────────────────────────────────
  const handleDeductPass = useCallback(
    async (pass: PassRecord) => {
      if (pass.status !== 'ACTIVE' || pass.remaining_count <= 0) {
        showToast(`차감할 수 없는 ${passTerm}입니다.`);
        return;
      }
      if (deductingIdsRef.current.has(pass.id)) return;
      deductingIdsRef.current.add(pass.id);

      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

      const nextCount = Math.max(0, pass.remaining_count - 1);
      const nextStatus: PassRecord['status'] =
        nextCount === 0 && pass.pass_type !== 'PERIOD_BASED' ? 'EXHAUSTED' : 'ACTIVE';

      setPasses((prev) =>
        prev.map((item) =>
          item.id === pass.id
            ? { ...item, remaining_count: nextCount, status: nextStatus }
            : item
        )
      );
      setDeductingIds((prev) => new Set(prev).add(pass.id));

      try {
        await deductPassAtomic(pass.id, currentOrganization?.id);
        if (currentOrganization?.id) {
          invalidateTenantQueries('passes', currentOrganization.id);
        }
        notifyStorageFromRefineResource('passes');
        showToast(`[${pass.customer_name || customerTerm}] 입장 완료! (잔여 ${nextCount}회)`);
      } catch (err) {
        setPasses((prev) =>
          prev.map((item) =>
            item.id === pass.id
              ? { ...item, remaining_count: pass.remaining_count, status: pass.status }
              : item
          )
        );
        showToast(err instanceof Error ? err.message : `${passTerm} 차감에 실패했습니다.`);
      } finally {
        deductingIdsRef.current.delete(pass.id);
        setDeductingIds((prev) => {
          const next = new Set(prev);
          next.delete(pass.id);
          return next;
        });
      }
    },
    [showToast, currentOrganization, customerTerm, passTerm]
  );

  // ── 도메인 순수 술어 함수 기반 필터링 ────────────────────────────────────
  const filteredPasses = useMemo(() => {
    return filterPasses(passes, {
      status: statusFilter,
      searchQuery,
    });
  }, [passes, statusFilter, searchQuery]);

  const tenantId = currentOrganization?.id ?? '';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Ticket className="h-6 w-6 shrink-0" />
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl truncate">{passTerm} 관리</h1>
            <span
              data-testid="badge-passes-count"
              className="ml-2 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 shrink-0"
            >
              {filteredPasses.length}건
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {customerTerm}별 잔여 횟수 확인 및 빠른 입장 처리
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          data-testid="btn-open-issue-pass-modal"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 min-w-[120px]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          + {passTerm} 발급
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={`${customerTerm}명, ${passTerm}, 뒷번호 검색`}
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Quick Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
          <button
            type="button"
            data-testid="filter-btn-all"
            onClick={() => handleStatusChange('ALL')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체
          </button>
          <button
            type="button"
            data-testid="filter-btn-active"
            onClick={() => handleStatusChange('ACTIVE')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            이용중
          </button>
          <button
            type="button"
            data-testid="filter-btn-exhausted"
            onClick={() => handleStatusChange('EXHAUSTED')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
              statusFilter === 'EXHAUSTED'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            소진
          </button>
          <button
            type="button"
            data-testid="filter-btn-expired"
            onClick={() => handleStatusChange('EXPIRED')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
              statusFilter === 'EXPIRED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            만료
          </button>
          <button
            type="button"
            data-testid="filter-btn-paused"
            onClick={() => handleStatusChange('PAUSED')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
              statusFilter === 'PAUSED'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            정지
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            data-testid="filter-select-status"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as PassesStatusFilter)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">이용 가능</option>
            <option value="EXHAUSTED">소진됨</option>
            <option value="EXPIRED">기간 만료</option>
            <option value="PAUSED">일시 정지</option>
          </select>
        </div>
      </div>

      {/* Passes List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">{passTerm} 목록을 불러오는 중...</p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-4 sm:p-8 space-y-6">
            {starterTemplates.length > 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-white to-purple-50/50 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{badgeEmoji}</span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {presetName} 전용 {passTerm} 스타터 팩 (추천 템플릿)
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">클릭 시 즉시 발급</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {starterTemplates.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedStarterTemplate(tpl);
                        setIsIssueModalOpen(true);
                      }}
                      className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs hover:border-indigo-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          {tpl.badge || (tpl.passType === 'PERIOD_BASED' ? '기간제' : '횟수제')}
                        </span>
                        {tpl.recommendedPrice ? (
                          <span className="text-xs font-bold text-slate-900">
                            {tpl.recommendedPrice.toLocaleString()}원
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {tpl.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {tpl.passType === 'PERIOD_BASED'
                            ? `${tpl.validityDays}일간 자유 이용`
                            : `기본 ${tpl.totalCount}회 (유효기간 ${tpl.validityDays}일)`}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600">
                        <span>이 템플릿으로 발급하기</span>
                        <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <EmptyStateHero
              icon={<Ticket className="w-8 h-8 text-indigo-600" />}
              title={`발급된 ${passTerm}이 없습니다`}
              description={`${customerTerm}에게 ${passTerm}을 발급하고 편리하게 관리하세요.`}
              action={{
                label: `+ ${passTerm} 발급`,
                onClick: () => setIsIssueModalOpen(true),
                icon: <Plus className="w-4 h-4 mr-1" />,
              }}
              guide={{
                badge: `${passTerm} 운영 가이드`,
                title: `3단계로 끝내는 ${passTerm} 운영`,
                steps: [
                  { stepNumber: 1, title: `${passTerm} 종류 선택`, detail: '횟수 차감형 또는 기간 자유이용권 중 선택' },
                  { stepNumber: 2, title: '유효기간 및 횟수 설정', detail: '정책에 맞는 만료일과 잔여 횟수를 지정' },
                  { stepNumber: 3, title: `${customerTerm} 배정 후 간편 차감`, detail: '입장 시 터치 한 번으로 즉시 차감' },
                ],
                tip: `💡 ${passTerm} 잔여가 0회가 되면 자동으로 소진 상태로 전환됩니다.`,
              }}
              defaultGuideOpen={false}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPasses.map((pass) => {
              const isDeducting = deductingIds.has(pass.id);
              const canDeduct = pass.status === 'ACTIVE' && pass.remaining_count > 0;

              return (
                <div
                  key={pass.id}
                  data-testid="passes-row-item"
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {pass.customer_name || customerTerm}
                        </span>
                        {pass.customer_phone && (
                          <span className="text-xs font-medium text-slate-400 shrink-0">
                            ({pass.customer_phone.slice(-4)})
                          </span>
                        )}
                        <StatusBadge status={pass.status} />
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-700 truncate">{pass.pass_name}</div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>만료일: {pass.expires_at}</span>
                        <span>전체 {pass.total_count}회</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action */}
                  <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">잔여 횟수</div>
                      <div className="text-xl font-black text-indigo-600">
                        {pass.remaining_count}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {pass.total_count}회
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeductPass(pass)}
                      disabled={!canDeduct || isDeducting}
                      aria-label={`${pass.customer_name || customerTerm} 입장 처리 (-1회)`}
                      className="inline-flex h-12 min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none min-w-[90px]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isDeducting ? '처리 중...' : '입장 -1'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 발급 모달 */}
      {isIssueModalOpen && tenantId && (
        <IssuePassModal
          tenantId={tenantId}
          onClose={() => setIsIssueModalOpen(false)}
          onSuccess={() => {
            if (currentOrganization?.id) {
              invalidateTenantQueries('passes', currentOrganization.id);
            }
            notifyStorageFromRefineResource('passes');
            void loadPasses();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
