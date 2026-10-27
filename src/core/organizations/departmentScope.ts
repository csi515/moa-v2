/** 부서 스코프와 경로 재작성. DB RPC와 동일한 순수 판정식. */

export type DepartmentScopeType = 'GLOBAL' | 'DESCENDANTS' | 'SELF_ONLY';

export function buildDepartmentPath(parentPath: string | null, departmentId: string): string {
  const id = departmentId.trim();
  if (!id) throw new Error('department id required');
  if (!parentPath) return `/${id}/`;
  const base = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
  return `${base}/${id}/`;
}

export function depthFromPath(path: string): number {
  return path.split('/').filter((part) => part.length > 0).length;
}

/** 부모 이동 시 하위 경로 접두사를 원자적으로 치환한다. */
export function rewriteSubtreePath(oldPrefix: string, newPrefix: string, nodePath: string): string {
  if (!nodePath.startsWith(oldPrefix)) {
    throw new Error('node is outside moved subtree');
  }
  return `${newPrefix}${nodePath.slice(oldPrefix.length)}`;
}

export function scopeAllowsResource(input: {
  scopeType: DepartmentScopeType;
  memberDepartmentId: string | null;
  memberPath: string | null;
  resourceDepartmentId: string | null;
  resourcePath: string | null;
}): boolean {
  if (input.resourceDepartmentId == null) return true;
  if (input.scopeType === 'GLOBAL') return true;
  if (input.scopeType === 'SELF_ONLY') {
    return input.memberDepartmentId === input.resourceDepartmentId;
  }
  if (!input.memberPath || !input.resourcePath) return false;
  return input.resourcePath.startsWith(input.memberPath);
}

export interface OwnershipTransferPlan {
  nextOwnerRole: 'owner';
  previousOwnerRole: 'member';
  bumpTokenVersion: true;
  auditAction: 'OWNERSHIP_TRANSFERRED';
}

export function planOwnershipTransfer(callerIsOwner: boolean, targetIsSelf: boolean): OwnershipTransferPlan {
  if (!callerIsOwner) throw new Error('42501');
  if (targetIsSelf) throw new Error('same owner');
  return {
    nextOwnerRole: 'owner',
    previousOwnerRole: 'member',
    bumpTokenVersion: true,
    auditAction: 'OWNERSHIP_TRANSFERRED',
  };
}

/** 제조·기업 프리셋만 조직도 질문을 노출한다. */
const ORG_CHART_PRESET_IDS = new Set([
  'manufacturing_light',
  'general_enterprise',
  'corporate_general_affairs',
  'CORP',
  'manufacturing_ops',
]);

export function shouldAskDepartmentSetup(presetId: string | null | undefined, category?: string | null): boolean {
  if (!presetId) return false;
  if (ORG_CHART_PRESET_IDS.has(presetId)) return true;
  return category === 'manufacturing';
}

/** 부서 스코프 목록 필터. department_id NULL 행은 전사 공유로 항상 포함. */
export function filterRowsByDepartmentScope<T extends { department_id?: string | null }>(
  items: T[],
  isScopedToDepartment: boolean,
  scopedDepartmentId: string | null | undefined,
): T[] {
  if (!isScopedToDepartment) return items;
  if (!scopedDepartmentId) return [];
  return items.filter(
    (item) => item.department_id == null || item.department_id === scopedDepartmentId,
  );
}

/** 부서 스코프(GLOBAL / SELF_ONLY / DESCENDANTS)와 path 기반 하위 부서 포함 필터. */
export function filterRowsByMemberDepartmentScope<T extends { department_id?: string | null }>(
  items: T[],
  input: {
    scopeType: DepartmentScopeType;
    memberDepartmentId: string | null;
    memberPath: string | null;
    departmentPathById: ReadonlyMap<string, string>;
  },
): T[] {
  if (!items?.length) return [];
  if (input.scopeType === 'GLOBAL' || !input.memberDepartmentId) return items;

  return items.filter((item) => {
    const resourceDept = item.department_id?.trim() || null;
    if (!resourceDept) return true;
    const resourcePath = input.departmentPathById.get(resourceDept) ?? null;
    return scopeAllowsResource({
      scopeType: input.scopeType,
      memberDepartmentId: input.memberDepartmentId,
      memberPath: input.memberPath,
      resourceDepartmentId: resourceDept,
      resourcePath,
    });
  });
}
