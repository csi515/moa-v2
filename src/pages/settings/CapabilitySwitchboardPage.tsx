/**
 * [사이드바 메뉴 표시 관리]
 *
 * 기존 72개 전수 스위치보드 방식을 폐지하고,
 * 현재 테넌트의 업종 프리셋(Preset)에 포함된 기능만 노출하는
 * 직관적인 MenuVisibilitySettingsView를 제공합니다.
 */

import React from 'react';
import { MenuVisibilitySettingsView } from './MenuVisibilitySettingsView';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { OPERATION_TOOL_SETS } from '@/core/presets/operationBundles';
import { resolveCapabilityDependencies } from '@/core/capabilities/capabilityDependency';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import { showToast } from '@/shared/feedback/uiFeedback';

export { MenuVisibilitySettingsView };

function friendlyName(name: string): string {
  return name.replaceAll('팩', '세트').replaceAll('Capability', '').replaceAll('Plugin', '').replaceAll('Pack', '');
}

export const CapabilitySwitchboardPage: React.FC = () => {
  const { activeCapabilities, updateActiveCapabilities } = useOrganization();

  async function toggleSet(capabilities: readonly string[], enable: boolean) {
    let next = [...activeCapabilities];
    const notes: string[] = [];
    for (const id of capabilities) {
      const resolved = resolveCapabilityDependencies(next as CapabilityId[], id as CapabilityId, enable);
      notes.push(...resolved.autoEnabled);
      next = resolved.nextActive;
    }
    await updateActiveCapabilities(next);
    if (notes.length > 0) {
      showToast(`함께 켜진 추천 운영 도구: ${notes.join(', ')}`, 'info');
    } else {
      showToast('우리 매장 맞춤 세트가 저장되었습니다. 메뉴가 바로 반영됩니다.', 'success');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black">우리 매장 맞춤 세트</h1>
        <p className="text-sm text-slate-500">추천 운영 도구를 켜면 필요한 선행 기능도 함께 열립니다.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPERATION_TOOL_SETS.map((set) => {
          const on = set.capabilities.every((id) => activeCapabilities.includes(id));
          return (
            <article key={set.id} className="rounded-2xl border bg-white p-4">
              <h2 className="font-bold">{friendlyName(set.displayName)}</h2>
              <p className="mt-1 text-xs text-slate-500">{set.description}</p>
              <button type="button" className="mt-3 min-h-12 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white" onClick={() => void toggleSet(set.capabilities, !on)}>
                {on ? '끄기' : '켜기'}
              </button>
            </article>
          );
        })}
      </div>
      <MenuVisibilitySettingsView />
    </div>
  );
}

export default CapabilitySwitchboardPage;
