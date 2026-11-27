import React, { useMemo } from 'react';
import type { OrgNode, DepartmentMemberRow } from './useOrganizationTree';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { ORG_CHART_COPY } from './orgChartCopy';

function isDescendant(nodes: OrgNode[], ancestorId: string, nodeId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const ancestor = nodes.find((n) => n.id === ancestorId);
  if (!node || !ancestor || node.id === ancestor.id) return false;
  return node.path.startsWith(ancestor.path);
}

function buildChildrenMap(nodes: OrgNode[]): Map<string | null, OrgNode[]> {
  const map = new Map<string | null, OrgNode[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = map.get(key) ?? [];
    list.push(node);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  return map;
}

interface Props {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (departmentId: string, newParentId: string | null) => void;
  canManage: boolean;
  departmentMembers?: DepartmentMemberRow[];
  members?: DynamicMemberRow[];
  roles?: DynamicRoleRow[];
}

export const DepartmentTreeView: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelect,
  onMove,
  canManage,
  departmentMembers = [],
  members = [],
  roles = [],
}) => {
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode => {
    const children = childrenMap.get(parentId) ?? [];
    return children.map((node) => {
      const deptMembers = departmentMembers.filter((dm) => dm.department_id === node.id);
      const leadDm = deptMembers.find((dm) => dm.scope_type === 'DESCENDANTS');
      const leadMember = leadDm ? members.find((m) => m.id === leadDm.member_id) : null;
      const leadRole = leadDm?.custom_role_id ? roles.find((r) => r.id === leadDm.custom_role_id)?.name : null;

      return (
      <li key={node.id} className="list-none">
        <div
          role="treeitem"
          aria-selected={selectedId === node.id}
          draggable={canManage}
          onDragStart={() => setDragId(node.id)}
          onDragEnd={() => setDragId(null)}
          onDragOver={(event) => {
            if (!canManage || !dragId || dragId === node.id) return;
            if (isDescendant(nodes, dragId, node.id)) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!dragId || dragId === node.id) return;
            if (isDescendant(nodes, dragId, node.id)) return;
            onMove(dragId, node.id);
            setDragId(null);
          }}
          className={`mt-1 flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
            selectedId === node.id
              ? 'border-slate-400 bg-slate-50'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
          style={{ marginLeft: depth * 12 }}
        >
          <div className="min-h-12 flex-1 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-left font-medium text-slate-900 hover:text-slate-800 transition-colors flex items-center gap-2"
              onClick={() => onSelect(node.id)}
            >
              <span>{node.name}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                {deptMembers.length}명
              </span>
            </button>
            {leadMember ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1 shrink-0">
                <span>👑</span>
                <span>{leadRole ? `${leadRole}: ` : '부서장: '}{leadMember.name || leadMember.email || '지정됨'}</span>
              </span>
            ) : null}
          </div>
          {canManage ? (
            <span className="text-xs text-slate-400" title="다른 부서로 드래그하여 이동">
              ⋮⋮
            </span>
          ) : null}
        </div>
        <ul role="group">{renderBranch(node.id, depth + 1)}</ul>
      </li>
    );
  });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">부서 트리</h2>
        {canManage ? (
          <span className="text-xs text-slate-500">드래그하여 상위 부서 변경</span>
        ) : null}
      </div>
      {canManage ? (
        <div
          className="mb-2 min-h-12 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500"
          onDragOver={(event) => {
            if (dragId) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!dragId) return;
            onMove(dragId, null);
            setDragId(null);
          }}
        >
          {ORG_CHART_COPY.move} — 여기에 놓으면 최상위 부서로 이동
        </div>
      ) : null}
      <ul role="tree" className="m-0 p-0">
        {renderBranch(null, 0)}
      </ul>
      {nodes.length === 0 ? <p className="p-3 text-sm text-slate-500">등록된 부서가 없습니다.</p> : null}
    </div>
  );
};
