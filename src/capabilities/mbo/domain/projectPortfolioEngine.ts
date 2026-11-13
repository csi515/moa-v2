/**
 * MBO 실행 프로젝트 포트폴리오 뷰 엔진 (연도별 / 월별 / 개인별)
 * 순수 함수 — DB/UI 의존 없음
 */

import type { MboStatus } from './mboEngine';

export type PortfolioViewMode = 'year' | 'month' | 'person';

export interface PortfolioProject {
  id: string;
  title: string;
  ownerId: string | null;
  ownerName: string;
  status: MboStatus;
  startDate: string; // YYYY-MM-DD
  targetDate: string;
  progressRate: number;
  objectiveId?: string | null;
  evaluationPeriod?: string | null;
  description?: string | null;
  /** 테넌트 사용자 정의 분류 (project_categories.id) */
  categoryId?: string | null;
  categoryLabel?: string | null;
  categoryColor?: string | null;
}

export interface PortfolioSummary {
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  draftOrPendingCount: number;
  averageProgressRate: number;
}

export interface MonthBucket {
  year: number;
  month: number; // 1~12
  label: string;
  projects: PortfolioProject[];
}

export interface PersonBucket {
  ownerKey: string;
  ownerId: string | null;
  ownerName: string;
  projects: PortfolioProject[];
  averageProgressRate: number;
  activeCount: number;
}

function parseDate(isoDate: string): Date | null {
  if (!isoDate || isoDate.length < 10) return null;
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * 프로젝트 기간이 [rangeStart, rangeEnd]와 겹치는지
 */
export function projectOverlapsRange(
  project: PortfolioProject,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const start = parseDate(project.startDate);
  const end = parseDate(project.targetDate);
  if (!start || !end) return false;
  return start <= rangeEnd && end >= rangeStart;
}

/**
 * 지정 연도에 걸쳐 있는 프로젝트
 */
export function filterProjectsByYear(
  projects: PortfolioProject[],
  year: number
): PortfolioProject[] {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return projects.filter((p) => projectOverlapsRange(p, start, end));
}

/**
 * 지정 연·월에 걸쳐 있는 프로젝트
 */
export function filterProjectsByMonth(
  projects: PortfolioProject[],
  year: number,
  month: number
): PortfolioProject[] {
  if (month < 1 || month > 12) return [];
  const { start, end } = monthRange(year, month);
  return projects.filter((p) => projectOverlapsRange(p, start, end));
}

/**
 * 연도별 로드맵: 1~12월 버킷 (기간이 겹치는 프로젝트 배치)
 */
export function buildYearMonthBuckets(
  projects: PortfolioProject[],
  year: number
): MonthBucket[] {
  const yearProjects = filterProjectsByYear(projects, year);
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthProjects = filterProjectsByMonth(yearProjects, year, month);
    return {
      year,
      month,
      label: `${year}-${String(month).padStart(2, '0')}`,
      projects: monthProjects,
    };
  });
}

/**
 * 개인별 그룹핑 (담당자명 기준, 동일 ownerId 우선)
 */
export function groupProjectsByPerson(projects: PortfolioProject[]): PersonBucket[] {
  const map = new Map<string, PortfolioProject[]>();

  for (const project of projects) {
    const key = project.ownerId?.trim()
      ? `id:${project.ownerId}`
      : `name:${(project.ownerName || '미배정').trim()}`;
    const list = map.get(key) ?? [];
    list.push(project);
    map.set(key, list);
  }

  const buckets: PersonBucket[] = [];
  for (const [ownerKey, list] of map.entries()) {
    const first = list[0];
    const avg =
      list.length === 0
        ? 0
        : Math.round(list.reduce((s, p) => s + (p.progressRate || 0), 0) / list.length);
    const activeCount = list.filter((p) =>
      ['approved', 'in_progress', 'submitted'].includes(p.status)
    ).length;

    buckets.push({
      ownerKey,
      ownerId: first.ownerId,
      ownerName: first.ownerName?.trim() || '미배정',
      projects: [...list].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      averageProgressRate: avg,
      activeCount,
    });
  }

  return buckets.sort((a, b) => a.ownerName.localeCompare(b.ownerName, 'ko'));
}

/**
 * 특정 담당자만 필터
 */
export function filterProjectsByPerson(
  projects: PortfolioProject[],
  ownerIdOrName: string
): PortfolioProject[] {
  const q = ownerIdOrName.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(
    (p) =>
      (p.ownerId && p.ownerId.toLowerCase() === q) ||
      (p.ownerName && p.ownerName.trim().toLowerCase() === q)
  );
}

/**
 * 포트폴리오 요약 지표
 */
export function summarizePortfolio(projects: PortfolioProject[]): PortfolioSummary {
  if (projects.length === 0) {
    return {
      totalCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      draftOrPendingCount: 0,
      averageProgressRate: 0,
    };
  }

  let inProgressCount = 0;
  let completedCount = 0;
  let draftOrPendingCount = 0;
  let progressSum = 0;

  for (const p of projects) {
    progressSum += p.progressRate || 0;
    if (p.status === 'in_progress' || p.status === 'approved') inProgressCount++;
    else if (p.status === 'completed') completedCount++;
    else if (p.status === 'draft' || p.status === 'submitted' || p.status === 'rejected') {
      draftOrPendingCount++;
    }
  }

  return {
    totalCount: projects.length,
    inProgressCount,
    completedCount,
    draftOrPendingCount,
    averageProgressRate: Math.round(progressSum / projects.length),
  };
}

/**
 * 뷰 모드에 맞는 프로젝트 집합 산출
 */
export function resolvePortfolioProjects(
  projects: PortfolioProject[],
  mode: PortfolioViewMode,
  options: { year: number; month?: number; ownerKey?: string }
): PortfolioProject[] {
  if (mode === 'year') {
    return filterProjectsByYear(projects, options.year);
  }
  if (mode === 'month') {
    return filterProjectsByMonth(projects, options.year, options.month ?? 1);
  }
  // person
  if (options.ownerKey) {
    const key = options.ownerKey;
    if (key.startsWith('id:')) {
      return filterProjectsByPerson(projects, key.slice(3));
    }
    if (key.startsWith('name:')) {
      return filterProjectsByPerson(projects, key.slice(5));
    }
    return filterProjectsByPerson(projects, key);
  }
  return projects;
}

/**
 * 연도 선택 옵션 후보 (프로젝트 start/target 연도 합집합)
 */
export function collectAvailableYears(
  projects: PortfolioProject[],
  fallbackYear: number = new Date(Date.now()).getFullYear()
): number[] {
  const years = new Set<number>([fallbackYear]);
  for (const p of projects) {
    const s = parseDate(p.startDate);
    const e = parseDate(p.targetDate);
    if (s) years.add(s.getFullYear());
    if (e) years.add(e.getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}
