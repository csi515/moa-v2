import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Users,
  FolderKanban,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import {
  buildYearMonthBuckets,
  collectAvailableYears,
  groupProjectsByPerson,
  resolvePortfolioProjects,
  summarizePortfolio,
  type PortfolioProject,
  type PortfolioViewMode,
} from '../domain/projectPortfolioEngine';
import {
  filterProjectsByCategories,
  listActiveCategories,
  type ProjectCategory,
} from '../domain/projectCategoryEngine';
import type { MboStatus } from '../domain/mboEngine';
import { ProjectCategoryManager } from './ProjectCategoryManager';

const STATUS_LABEL: Record<MboStatus, string> = {
  draft: '작성중',
  submitted: '제출',
  approved: '승인',
  rejected: '반려',
  in_progress: '진행중',
  completed: '완료',
  canceled: '취소',
};

const STATUS_STYLE: Record<MboStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-50 text-amber-800',
  approved: 'bg-blue-50 text-blue-800',
  rejected: 'bg-rose-50 text-rose-800',
  in_progress: 'bg-slate-50 text-indigo-800',
  completed: 'bg-emerald-50 text-emerald-800',
  canceled: 'bg-slate-200 text-slate-500',
};

export type MboProjectPortfolioViewProps = {
  projects: PortfolioProject[];
  categories?: ProjectCategory[];
  organizationId?: string | null;
  title?: string;
  subtitle?: string;
  showQuarterlyReview?: boolean;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onOpenQuarterlyReview?: (projectId: string) => void;
  onCategoriesChanged?: () => void;
};

function ProjectCard({
  project,
  selected,
  onSelect,
  onReview,
}: {
  project: PortfolioProject;
  selected: boolean;
  onSelect?: () => void;
  onReview?: () => void;
}) {
  return (
    <article
      className={[
        'rounded-xl border p-3 transition-shadow',
        selected ? 'border-indigo-400 bg-slate-50/40 shadow-sm' : 'border-slate-200 bg-white hover:shadow-sm',
      ].join(' ')}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{project.title}</h4>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[project.status]}`}>
            {STATUS_LABEL[project.status]}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {project.ownerName} · {project.startDate} ~ {project.targetDate}
        </p>
        {project.categoryLabel ? (
          <span
            className="mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: project.categoryColor || '#64748b' }}
          >
            {project.categoryLabel}
          </span>
        ) : (
          <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            미분류
          </span>
        )}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, project.progressRate))}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] font-semibold text-slate-600">진척 {project.progressRate}%</div>
      </button>
      {onReview ? (
        <button
          type="button"
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700"
          onClick={onReview}
        >
          분기 진척 리뷰
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </article>
  );
}

export const MboProjectPortfolioView: React.FC<MboProjectPortfolioViewProps> = ({
  projects,
  categories = [],
  organizationId,
  title = '진행 프로젝트 포트폴리오',
  subtitle = '실행 프로젝트를 연도·월·담당자·분류 기준으로 조회합니다.',
  showQuarterlyReview = true,
  selectedProjectId,
  onSelectProject,
  onOpenQuarterlyReview,
  onCategoriesChanged,
}) => {
  const fallbackYear = new Date().getFullYear();
  const years = useMemo(
    () => collectAvailableYears(projects, fallbackYear),
    [projects, fallbackYear],
  );
  const [viewMode, setViewMode] = useState<PortfolioViewMode>('year');
  const [year, setYear] = useState<number>(() => years[0] ?? fallbackYear);
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [ownerKey, setOwnerKey] = useState<string>('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [includeUncategorized, setIncludeUncategorized] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const activeCategories = useMemo(() => listActiveCategories(categories), [categories]);

  const categoryFiltered = useMemo(() => {
    if (selectedCategoryIds.length === 0 && !includeUncategorized) {
      return projects;
    }
    return filterProjectsByCategories(projects, selectedCategoryIds, {
      includeUncategorized,
    });
  }, [projects, selectedCategoryIds, includeUncategorized]);

  const personBuckets = useMemo(
    () => groupProjectsByPerson(categoryFiltered),
    [categoryFiltered],
  );
  const monthBuckets = useMemo(
    () => buildYearMonthBuckets(categoryFiltered, year),
    [categoryFiltered, year],
  );

  const visible = useMemo(
    () =>
      resolvePortfolioProjects(categoryFiltered, viewMode, {
        year,
        month,
        ownerKey: ownerKey || undefined,
      }),
    [categoryFiltered, viewMode, year, month, ownerKey],
  );

  const summary = useMemo(() => summarizePortfolio(visible), [visible]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const modeButtons: { mode: PortfolioViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'year', label: '연도별', icon: <Calendar className="h-3.5 w-3.5" /> },
    { mode: 'month', label: '월별', icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { mode: 'person', label: '개인별', icon: <Users className="h-3.5 w-3.5" /> },
  ];

  const reviewHandler = showQuarterlyReview ? onOpenQuarterlyReview : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            <FolderKanban className="h-3.5 w-3.5" />
            {title}
          </div>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {organizationId ? (
            <button
              type="button"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
              onClick={() => setManageOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              분류 관리
            </button>
          ) : null}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {modeButtons.map((btn) => (
              <button
                key={btn.mode}
                type="button"
                onClick={() => setViewMode(btn.mode)}
                className={`inline-flex h-12 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
                  viewMode === btn.mode
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 사용자 정의 분류 필터 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-bold text-slate-600">분류</span>
        <button
          type="button"
          className={`h-12 rounded-full px-3 text-xs font-bold ${
            selectedCategoryIds.length === 0 && !includeUncategorized
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => {
            setSelectedCategoryIds([]);
            setIncludeUncategorized(false);
          }}
        >
          전체
        </button>
        {activeCategories.map((cat) => {
          const on = selectedCategoryIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={`h-12 rounded-full px-3 text-xs font-bold ${
                on ? 'text-white' : 'bg-slate-100 text-slate-700'
              }`}
              style={on ? { backgroundColor: cat.color || '#4f46e5' } : undefined}
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.label}
            </button>
          );
        })}
        <button
          type="button"
          className={`h-12 rounded-full px-3 text-xs font-bold ${
            includeUncategorized ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setIncludeUncategorized((v) => !v)}
        >
          미분류
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="text-xs font-bold text-slate-600">
          연도
          <select
            className="ml-2 h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>

        {viewMode === 'month' ? (
          <label className="text-xs font-bold text-slate-600">
            월
            <select
              className="ml-2 h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {viewMode === 'person' ? (
          <label className="text-xs font-bold text-slate-600">
            담당자
            <select
              className="ml-2 h-12 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
              value={ownerKey}
              onChange={(e) => setOwnerKey(e.target.value)}
            >
              <option value="">전체</option>
              {personBuckets.map((b) => (
                <option key={b.ownerKey} value={b.ownerKey}>
                  {b.ownerName} ({b.projects.length})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '전체', value: summary.totalCount },
          { label: '진행·승인', value: summary.inProgressCount },
          { label: '완료', value: summary.completedCount },
          { label: '평균 진척', value: `${summary.averageProgressRate}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-500">{card.label}</div>
            <div className="mt-1 text-xl font-black text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* 뷰 본문 */}
      {viewMode === 'year' ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">{year}년 월별 로드맵</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {monthBuckets.map((bucket) => (
              <section key={bucket.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">{bucket.month}월</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {bucket.projects.length}건
                  </span>
                </div>
                {bucket.projects.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400">해당 월 프로젝트 없음</p>
                ) : (
                  <div className="space-y-2">
                    {bucket.projects.map((p) => (
                      <ProjectCard
                        key={`${bucket.label}-${p.id}`}
                        project={p}
                        selected={selectedProjectId === p.id}
                        onSelect={() => onSelectProject?.(p.id)}
                        onReview={reviewHandler ? () => reviewHandler(p.id) : undefined}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {viewMode === 'month' ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">
            {year}년 {month}월 진행 프로젝트
          </h3>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              해당 월에 걸친 프로젝트가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedProjectId === p.id}
                  onSelect={() => onSelectProject?.(p.id)}
                  onReview={reviewHandler ? () => reviewHandler(p.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {viewMode === 'person' ? (
        <div className="space-y-4">
          {(ownerKey
            ? personBuckets.filter((b) => b.ownerKey === ownerKey)
            : personBuckets
          ).map((bucket) => (
            <section key={bucket.ownerKey} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{bucket.ownerName}</h3>
                  <p className="text-[11px] text-slate-500">
                    활성 {bucket.activeCount}건 · 평균 진척 {bucket.averageProgressRate}%
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {bucket.projects.length}건
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bucket.projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    selected={selectedProjectId === p.id}
                    onSelect={() => onSelectProject?.(p.id)}
                    onReview={reviewHandler ? () => reviewHandler(p.id) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
          {personBuckets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              등록된 실행 프로젝트가 없습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {manageOpen && organizationId ? (
        <ProjectCategoryManager
          organizationId={organizationId}
          categories={categories}
          onChanged={() => onCategoriesChanged?.()}
          onClose={() => setManageOpen(false)}
        />
      ) : null}
    </div>
  );
};
