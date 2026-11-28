import React from 'react';
import type { RolePermissionKey, RolePermissionMap } from '@/domain/permissions';
import { getPermissionCatalogGroupsForMatrix } from '@/domain/permissionCatalog';

type Props = {
  value: RolePermissionMap;
  onChange: (next: RolePermissionMap) => void;
  /** 활성 Capability(프리셋 − hidden). 전달 시 해당 사업장에 없는 권한 키 숨김 */
  activeCapabilityIds?: readonly string[] | null;
};

export function RolePermissionMatrix({ value, onChange, activeCapabilityIds }: Props) {
  const groups = getPermissionCatalogGroupsForMatrix(activeCapabilityIds);

  function handleToggle(key: RolePermissionKey, checked: boolean) {
    const next = { ...value, [key]: checked };
    if (key === 'members:manage') {
      next.members_manage = checked;
    } else if (key === 'members_manage') {
      next['members:manage'] = checked;
    } else if (key === 'resources_manage') {
      next['resources:manage'] = checked;
    } else if (key === 'resources:manage') {
      next.resources_manage = checked;
    } else if (key === 'grievances_manage') {
      next['feedbacks:read_all'] = checked;
    } else if (key === 'feedbacks:read_all') {
      next.grievances_manage = checked;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4" data-testid="role-permission-matrix">
      <p
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed"
        data-testid="finance-owner-only-note"
      >
        수납·미납·매출·장부 화면은 사업주 전용이며 직급 권한으로 위임할 수 없습니다.
      </p>
      {groups.map((group) => (
        <fieldset key={group.title} className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-bold text-slate-800">{group.title}</legend>
          <div className="mt-2 space-y-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={Boolean(value[item.key])}
                  onChange={(event) => handleToggle(item.key, event.target.checked)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
