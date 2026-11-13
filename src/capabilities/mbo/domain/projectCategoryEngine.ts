/**
 * 테넌트 사용자 정의 프로젝트 분류(택소노미) 순수 엔진
 * - 고정 enum 금지: 사업장이 label/key를 자유롭게 추가
 * - 삭제는 비활성(archive)만 허용 (과거 프로젝트 보존)
 */

export interface ProjectCategory {
  id: string;
  organizationId: string;
  categoryKey: string;
  label: string;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt?: string | null;
}

export interface ProjectCategoryDraft {
  label: string;
  categoryKey?: string;
  color?: string | null;
  sortOrder?: number;
}

/**
 * 라벨 → 안정적 key 생성 (영문/숫자/한글 허용, 공백은 _ )
 */
export function slugifyCategoryKey(label: string): string {
  const raw = label.trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9가-힣_-]/gi, '')
    .replace(/_+/g, '_')
    .slice(0, 64);
}

export function validateCategoryDraft(
  draft: ProjectCategoryDraft,
  existing: ProjectCategory[],
  options: { editingId?: string } = {}
): { isValid: boolean; error?: string; categoryKey?: string } {
  const label = draft.label?.trim() ?? '';
  if (!label) {
    return { isValid: false, error: '분류 이름은 필수입니다.' };
  }
  if (label.length > 64) {
    return { isValid: false, error: '분류 이름은 64자 이하여야 합니다.' };
  }

  const key = (draft.categoryKey?.trim() || slugifyCategoryKey(label)).slice(0, 64);
  if (!key) {
    return { isValid: false, error: '분류 키가 비어 있습니다. 다른 이름을 입력해 주세요.' };
  }

  const duplicateKey = existing.some(
    (c) => c.categoryKey === key && c.id !== options.editingId && c.isActive,
  );
  if (duplicateKey) {
    return { isValid: false, error: `이미 사용 중인 분류 키입니다: ${key}` };
  }

  const duplicateLabel = existing.some(
    (c) =>
      c.label.trim().toLowerCase() === label.toLowerCase() &&
      c.id !== options.editingId &&
      c.isActive,
  );
  if (duplicateLabel) {
    return { isValid: false, error: `이미 같은 이름의 분류가 있습니다: ${label}` };
  }

  return { isValid: true, categoryKey: key };
}

/**
 * 활성 분류만 (필터 칩용)
 */
export function listActiveCategories(categories: ProjectCategory[]): ProjectCategory[] {
  return [...categories]
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ko'));
}

/**
 * 비활성(보관) 처리 — 하드 삭제 대체
 */
export function archiveCategory(category: ProjectCategory, archivedAt?: string): ProjectCategory {
  return {
    ...category,
    isActive: false,
    archivedAt: archivedAt ?? new Date(Date.now()).toISOString(),
  };
}

export function restoreCategory(category: ProjectCategory): ProjectCategory {
  return {
    ...category,
    isActive: true,
    archivedAt: null,
  };
}

/**
 * 프로젝트 목록을 선택된 분류 ID들로 AND/OR 필터
 * - selectedIds 비어 있으면 전체
 * - includeUncategorized: 미분류(categoryId null) 포함
 */
export function filterProjectsByCategories<T extends { categoryId?: string | null }>(
  projects: T[],
  selectedIds: string[],
  options: { includeUncategorized?: boolean } = {}
): T[] {
  if (!selectedIds.length && !options.includeUncategorized) {
    return projects;
  }
  if (!selectedIds.length && options.includeUncategorized) {
    return projects.filter((p) => !p.categoryId);
  }

  const set = new Set(selectedIds);
  return projects.filter((p) => {
    if (!p.categoryId) {
      return Boolean(options.includeUncategorized);
    }
    return set.has(p.categoryId);
  });
}

/**
 * 연구소 온보딩용 기본 시드 (DB ensure RPC와 동일 의미)
 */
export function defaultLabCategorySeeds(): Array<{
  categoryKey: string;
  label: string;
  color: string;
  sortOrder: number;
}> {
  return [
    { categoryKey: 'research', label: '연구', color: '#4f46e5', sortOrder: 10 },
    { categoryKey: 'quality', label: '품질', color: '#059669', sortOrder: 20 },
    { categoryKey: 'technology', label: '기술', color: '#0284c7', sortOrder: 30 },
    { categoryKey: 'patent', label: '특허', color: '#c026d3', sortOrder: 40 },
    { categoryKey: 'safety', label: '안전', color: '#dc2626', sortOrder: 50 },
  ];
}
