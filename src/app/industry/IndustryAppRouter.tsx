import React, { Suspense, type ComponentType } from 'react';
import '@/app/industry/loadIndustryModules';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  hasIndustryModule,
  parseIndustryType,
  isBlankIndustryInput,
  type IndustryType,
} from '@/core/industry/types';
import { resolveIndustryAppKind } from '@/core/industry/industryAppResolve';
import { GenericIndustryShell } from './GenericIndustryShell';
import { ParentShell } from '@/modules/parent/ParentShell';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { APP_BY_INDUSTRY } from './industryModules';

function resolveIndustryApp(industryType?: string | null): ComponentType {
  if (resolveIndustryAppKind(industryType) === 'generic') return GenericIndustryShell;
  const parsed = parseIndustryType(industryType);
  const moduleIndustry =
    parsed ?? (isBlankIndustryInput(industryType) ? ('piano' as IndustryType) : null);
  if (!moduleIndustry || !hasIndustryModule(moduleIndustry)) return GenericIndustryShell;
  return APP_BY_INDUSTRY[moduleIndustry] ?? GenericIndustryShell;
}

/** organization.industry_type에 따라 해당 업종 셸만 lazy load */
export const IndustryAppRouter: React.FC = () => {
  const { currentOrganization, currentRole } = useOrganization();

  if (currentRole === 'parent') {
    return <ParentShell />;
  }

  const IndustryApp = resolveIndustryApp(currentOrganization?.industry_type);
  const industryKey = currentOrganization?.industry_type || 'industry';

  return (
    <PluginErrorBoundary pluginName={industryKey}>
      <Suspense fallback={<LoadingScreen message="화면을 불러오는 중..." />}>
        <IndustryApp />
      </Suspense>
    </PluginErrorBoundary>
  );
};
