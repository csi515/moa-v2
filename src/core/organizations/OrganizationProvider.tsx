import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { IndustryType } from '../industry/types';
import { useAuth } from '../auth/AuthProvider';
import {
  listBlockedOwnerOrganizations,
  saveOrganizationBusinessStatus,
} from '../auth/services/ownerBusinessGate';
import type { Organization, MemberRole } from '../../lib/supabase';
import { StorageService } from '../../services/storage';
import { runLoginAccountSync } from '../accounts/loginBootstrapService';
import { applyOAuthSignupIntentIfAny } from '../auth/services/oauthSignupService';
import { ensureGlobalParentProfile, fetchParentPortalTree } from '../parent/services/parentPortalService';
import {
  isCustomerPortalModeActive,
  isParentPortalModeActive,
  setCustomerPortalModeActive,
  setParentPortalModeActive,
} from '../parent/services/appModeService';
import * as orgService from './services/organizationService';
import { useGuardianDeepLinkPortalSync } from './hooks/useGuardianDeepLinkPortalSync';
import {
  computePortalAccessFlags,
  deriveSelectionFields,
  portalModeToFlags,
  resolveMembershipById,
  resolveMembershipByOrganizationId,
  resolveMembershipAfterRefresh,
  applyBootstrapToSession,
  nextOrganizationLocalStateAction,
  STAFF_ROLES,
  type AppPortalMode,
  type MembershipSelectionResult,
} from './resolveOrganizationContext';
import { useOrganizationLocationState } from '@/core/locations/useOrganizationLocationState';
import type { Location } from '@/core/locations/types';
import { isNativeApp } from '@/core/platform/capacitorPlatform';
import { registerForegroundStep } from '@/core/platform/foregroundCoordinator';

/**
 * OrganizationProvider 책임 (단일 Context 유지):
 * 1. membership 목록 조회·갱신 (login bootstrap 포함)
 * 2. Organization Selection (selectedMembership + localStorage org id)
 * 3. Portal Mode (parent/customer/none) — Selection 과 별개
 * 4. parent profile (globalParentId, portalChildCount)
 * 5. blocked owner org ids
 * 6. 선택·포털 플래그에서 파생된 role/org/staff/parentCustomer/access flags 노출
 */

interface OrganizationContextType {
  organizations: orgService.OrganizationMembership[];
  memberships: orgService.OrganizationMembership[];
  selectedMembership: orgService.OrganizationMembership | null;
  currentOrganization: Organization | null;
  locations: Location[];
  currentLocation: Location | null;
  locationLabel: string;
  canChangeLocation: boolean;
  canClearLocation: boolean;
  locationsStatus: 'loading' | 'ready' | 'error';
  portalMode: AppPortalMode;
  organizationsStatus: 'loading' | 'ready' | 'error';
  organizationsError: string | null;
  currentRole: MemberRole | null;
  currentStaffId: string | null;
  currentParentCustomerId: string | null;
  globalParentId: string | null;
  isParentOnly: boolean;
  isCustomerOnly: boolean;
  canAccessParentPortal: boolean;
  canAccessCustomerPortal: boolean;
  parentPortalActive: boolean;
  customerPortalActive: boolean;
  portalChildCount: number;
  blockedOwnerOrgIds: string[];
  loading: boolean;
  selectOrganization: (organizationId: string) => Promise<void>;
  selectLocation: (locationId: string | null) => void;
  switchMembership: (membershipId: string) => Promise<void>;
  clearOrganization: () => void;
  createOrganization: (
    name: string,
    industryType?: IndustryType | string,
    settings?: orgService.CreateOrganizationFormExtras
  ) => Promise<string>;
  refreshOrganizations: (opts?: { quiet?: boolean }) => Promise<void>;
  /** 설정 저장 직후 헤더·사업장 선택 UI에 이름 반영 */
  patchOrganization: (organizationId: string, patch: { name: string }) => void;
  enterParentPortal: () => void;
  exitParentPortal: () => void;
  enterCustomerPortal: () => void;
  exitCustomerPortal: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

function readStoredPortalMode(): AppPortalMode {
  if (isParentPortalModeActive()) return 'parent';
  if (isCustomerPortalModeActive()) return 'customer';
  return 'none';
}

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // ── Source state ──────────────────────────────────────────────
  const [memberships, setMemberships] = useState<orgService.OrganizationMembership[]>([]);
  /** Selection SoT — org/role/staff/parentCustomerId 는 여기서만 파생 */
  const [selectedMembership, setSelectedMembership] =
    useState<orgService.OrganizationMembership | null>(null);
  /** Portal Mode SoT — Selection 과 독립 (localStorage app mode 와 동기) */
  const [portalMode, setPortalMode] = useState<AppPortalMode>(readStoredPortalMode);
  const [globalParentId, setGlobalParentId] = useState<string | null>(null);
  const [portalChildCount, setPortalChildCount] = useState(0);
  const [blockedOwnerOrgIds, setBlockedOwnerOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationsStatus, setOrganizationsStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);
  const hasMembershipsRef = useRef(false);

  // ── Derived: selection ────────────────────────────────────────
  const {
    currentOrganization,
    currentRole,
    currentStaffId,
    currentParentCustomerId,
  } = deriveSelectionFields(selectedMembership);
  const {
    locations,
    currentLocation,
    selectLocation,
    locationLabel,
    canChangeLocation,
    canClearLocation,
    locationsStatus,
  } = useOrganizationLocationState(currentOrganization?.id ?? null, currentRole);
  hasMembershipsRef.current = memberships.length > 0;

  // ── Derived: portal access (membership 조회 결과 기반, parent 단정 금지) ──
  const portalAccess = useMemo(
    () =>
      computePortalAccessFlags(memberships, {
        blockedOwnerOrgIds,
        portalChildren: portalChildCount,
        parentId: globalParentId,
      }),
    [memberships, blockedOwnerOrgIds, portalChildCount, globalParentId]
  );

  const { parentPortalActive, customerPortalActive } = portalModeToFlags(portalMode);

  /** 선택 결과 1곳 커밋 (상태 + localStorage 부작용) */
  const commitMembershipSelection = useCallback((result: MembershipSelectionResult) => {
    setSelectedMembership(result.membership);
    if (result.storage.action === 'store') {
      orgService.storeOrganizationId(result.storage.organizationId);
    } else if (result.storage.action === 'clear') {
      orgService.clearStoredOrganizationId();
    }
  }, []);

  const commitPortalMode = useCallback((mode: AppPortalMode) => {
    setPortalMode(mode);
    setParentPortalModeActive(mode === 'parent');
    setCustomerPortalModeActive(mode === 'customer');
  }, []);

  const applyMembershipSelection = useCallback(
    (list: orgService.OrganizationMembership[], membershipId: string | null) => {
      commitMembershipSelection(resolveMembershipById(list, membershipId));
    },
    [commitMembershipSelection]
  );

  const resetLoggedOutOrgState = useCallback(() => {
    StorageService.clearOrganization();
    setMemberships([]);
    setSelectedMembership(null);
    setGlobalParentId(null);
    setPortalChildCount(0);
    setBlockedOwnerOrgIds([]);
    setOrganizationsStatus('ready');
    setOrganizationsError(null);
    commitPortalMode('none');
    orgService.clearStoredOrganizationId();
  }, [commitPortalMode]);

  const refreshOrganizations = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!user) {
      resetLoggedOutOrgState();
      setLoading(false);
      return;
    }

    if (!opts?.quiet) {
      setLoading(true);
      setOrganizationsStatus('loading');
      setOrganizationsError(null);
    }
    try {
      await applyOAuthSignupIntentIfAny();
      await runLoginAccountSync();

      let portalChildren = 0;
      let parentId: string | null = null;
      try {
        const tree = await fetchParentPortalTree();
        portalChildren = tree.children.length;
        parentId = tree.parent?.id ?? null;
      } catch {
        /* offline — parent 단정하지 않음 */
      }

      if (parentId === null) {
        try {
          parentId = await ensureGlobalParentProfile();
        } catch {
          /* offline */
        }
      }

      setGlobalParentId(parentId);
      setPortalChildCount(portalChildren);

      const nextMemberships = await orgService.fetchUserMembershipsWithContext();
      const ownerOrgIds = nextMemberships
        .filter((m) => m.role === 'owner')
        .map((m) => m.organizationId);
      let blockedIds: string[] = [];
      if (ownerOrgIds.length > 0) {
        try {
          blockedIds = await listBlockedOwnerOrganizations(ownerOrgIds);
        } catch {
          blockedIds = [];
        }
      }
      setBlockedOwnerOrgIds(blockedIds);
      setMemberships(nextMemberships);

      const session = applyBootstrapToSession({
        memberships: nextMemberships,
        blockedOwnerOrgIds: blockedIds,
        portalChildren,
        parentId,
        parentPortalModeActive: isParentPortalModeActive(),
        storedOrganizationId: orgService.getStoredOrganizationId(),
      });
      commitPortalMode(session.portalMode);
      commitMembershipSelection({
        membership: session.selectedMembership,
        storage: session.storage,
      });
      setOrganizationsError(null);
      setOrganizationsStatus('ready');
    } catch (err) {
      console.error('[org] refreshOrganizations failed', err);
      const message =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|network|offline|load failed/i.test(err.message))
          ? '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
          : err instanceof Error && err.message
            ? err.message
            : '사업장 정보를 불러오지 못했습니다.';
      // quiet + 기존 데이터: 선택 유지. 초기/강제 새로고침 실패만 error.
      if (opts?.quiet && hasMembershipsRef.current) {
        return;
      }
      setOrganizationsError(message);
      setOrganizationsStatus('error');
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [
    user,
    commitMembershipSelection,
    resetLoggedOutOrgState,
    commitPortalMode,
  ]);

  useEffect(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  /** 네이티브 foreground: membership/org 조용히 재검증 (로딩 플래시 없음) */
  useEffect(() => {
    if (!isNativeApp()) return;
    return registerForegroundStep('org', () => {
      if (!user) return;
      return refreshOrganizations({ quiet: true });
    });
  }, [user, refreshOrganizations]);

  const switchMembership = useCallback(
    async (membershipId: string) => {
      const membership = memberships.find((m) => m.id === membershipId);
      if (!membership) {
        throw new Error('소속 정보를 찾을 수 없습니다.');
      }

      await orgService.setActiveMembership(membershipId);

      if (
        nextOrganizationLocalStateAction(currentOrganization?.id, membership.organizationId) ===
        'clear'
      ) {
        StorageService.clearOrganization();
      }
      if (STAFF_ROLES.has(membership.role)) {
        commitPortalMode('none');
      }
      applyMembershipSelection(memberships, membershipId);
      setMemberships((prev) =>
        prev.map((item) => ({ ...item, isCurrentContext: item.id === membershipId }))
      );
    },
    [memberships, applyMembershipSelection, currentOrganization?.id, commitPortalMode]
  );

  const selectOrganization = useCallback(
    async (organizationId: string) => {
      let list = memberships;
      let resolved = resolveMembershipByOrganizationId(list, organizationId);
      if (!resolved.membership) {
        list = await orgService.fetchUserMembershipsWithContext();
        setMemberships(list);
        resolved = resolveMembershipAfterRefresh(memberships, list, organizationId);
      }
      if (!resolved.membership) {
        throw new Error('소속 정보를 찾을 수 없습니다.');
      }

      await orgService.setActiveMembership(resolved.membership.id);
      if (
        nextOrganizationLocalStateAction(currentOrganization?.id, resolved.membership.organizationId) ===
        'clear'
      ) {
        StorageService.clearOrganization();
      }
      if (STAFF_ROLES.has(resolved.membership.role)) {
        commitPortalMode('none');
      }
      applyMembershipSelection(list, resolved.membership.id);
      setMemberships(
        list.map((item) => ({
          ...item,
          isCurrentContext: item.id === resolved.membership?.id,
        }))
      );
    },
    [
      memberships,
      currentOrganization?.id,
      commitPortalMode,
      applyMembershipSelection,
    ]
  );

  const clearOrganization = useCallback(async () => {
    try {
      await orgService.clearActiveMembership();
    } catch (error) {
      console.error('Failed to clear active membership:', error);
    }
    orgService.clearStoredOrganizationId();
    setSelectedMembership(null);
    StorageService.clearOrganization();
  }, []);

  const createOrganization = useCallback(
    async (
      name: string,
      industryType: IndustryType | string = 'piano',
      settings?: orgService.CreateOrganizationFormExtras
    ) => {
      const orgId = await orgService.createOrganization(
        orgService.toCreateOrganizationOptions(name, industryType, settings)
      );
      if (settings?.businessNumber) {
        await saveOrganizationBusinessStatus(orgId, '01');
      }
      return orgId;
    },
    []
  );

  const patchOrganization = useCallback((organizationId: string, patch: { name: string }) => {
    const nextName = patch.name.trim();
    if (!nextName) return;

    setMemberships((prev) =>
      prev.map((m) =>
        m.organizationId === organizationId
          ? { ...m, organization: { ...m.organization, name: nextName } }
          : m
      )
    );
    setSelectedMembership((prev) =>
      prev?.organizationId === organizationId
        ? { ...prev, organization: { ...prev.organization, name: nextName } }
        : prev
    );
  }, []);

  const enterParentPortal = useCallback(() => {
    commitPortalMode('parent');
    // 이중 역할: staff org 컨텍스트가 포털 푸시/스토리지에 남지 않도록 해제
    orgService.clearStoredOrganizationId();
    applyMembershipSelection(memberships, null);
  }, [memberships, applyMembershipSelection, commitPortalMode]);

  useGuardianDeepLinkPortalSync(user?.id, enterParentPortal);

  const exitParentPortal = useCallback(() => {
    commitPortalMode('none');
  }, [commitPortalMode]);

  const enterCustomerPortal = useCallback(() => {
    commitPortalMode('customer');
  }, [commitPortalMode]);

  const exitCustomerPortal = useCallback(() => {
    commitPortalMode('none');
  }, [commitPortalMode]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations: memberships,
        memberships,
        selectedMembership,
        currentOrganization,
        locations,
        currentLocation,
        locationLabel,
        canChangeLocation,
        canClearLocation,
        locationsStatus,
        portalMode,
        organizationsStatus,
        organizationsError,
        currentRole,
        currentStaffId,
        currentParentCustomerId,
        globalParentId,
        isParentOnly: portalAccess.isParentOnly,
        isCustomerOnly: portalAccess.isCustomerOnly,
        canAccessParentPortal: portalAccess.canAccessParentPortal,
        canAccessCustomerPortal: portalAccess.canAccessCustomerPortal,
        parentPortalActive,
        customerPortalActive,
        portalChildCount,
        blockedOwnerOrgIds,
        loading,
        selectOrganization,
        selectLocation,
        switchMembership,
        clearOrganization,
        createOrganization,
        refreshOrganizations,
        patchOrganization,
        enterParentPortal,
        exitParentPortal,
        enterCustomerPortal,
        exitCustomerPortal,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

export function useOptionalOrganization(): OrganizationContextType | null {
  return useContext(OrganizationContext) ?? null;
}
