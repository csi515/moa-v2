import React, { createContext, useContext } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

export interface TenantContextType {
  switchTenant: (tenantId: string) => Promise<void>;
  currentTenantId: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectOrganization, currentOrganization } = useOrganization();

  const switchTenant = async (tenantId: string) => {
    await selectOrganization(tenantId);
  };

  return (
    <TenantContext.Provider
      value={{
        switchTenant,
        currentTenantId: currentOrganization?.id ?? null,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    // Fallback: Directly delegate to useOrganization
    const { selectOrganization, currentOrganization } = useOrganization();
    return {
      switchTenant: selectOrganization,
      currentTenantId: currentOrganization?.id ?? null,
    };
  }
  return context;
};
