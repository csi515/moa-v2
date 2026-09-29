import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageHydrator } from '@/StorageHydrator';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { isNativeApp } from '@/core/platform/capacitorPlatform';
import { isSupabaseConfigured } from '@/lib/supabase';
import { registerAppPush } from '@/core/push';
import { normalizeIndustryType } from '@/core/industry/types';
import type { CustomerJoinRequest } from '@/types';
import { customerJoinService } from './services/customerJoinService';
import {
  fetchStudentPortalContext,
  type StudentPortalContext,
  type StudentPortalEnrollment,
} from './services/studentPortalService';
import { CustomerLinkedOrgsShell } from './CustomerLinkedOrgsShell';
import { CustomerNoLinkEmptyState } from './CustomerNoLinkEmptyState';
import { CustomerPortalBody, type CustomerTab } from './CustomerPortalBody';
import {
  listMyLinkedCustomerOrganizations,
  type MyLinkedCustomerOrg,
} from './services/myLinkedCustomerOrgsService';

function showPracticeTab(industryType: string): boolean {
  return normalizeIndustryType(industryType) === 'piano';
}

/**
 * 성인 수강생(본인) 포털 셸.
 * 보호자 연동 없이 customer/member 역할로 출석·이용권·연습실을 관리한다.
 * Customer 연결만 있는 경우(예: Retail)는 내 사업장 목록을 표시한다.
 */
export const CustomerShell: React.FC = () => {
  const { signOut, user } = useAuth();
  const { exitCustomerPortal, isCustomerOnly, currentOrganization } = useOrganization();
  const [ctx, setCtx] = useState<StudentPortalContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<StudentPortalEnrollment | null>(null);
  const [tab, setTab] = useState<CustomerTab>('home');
  const [joinRequests, setJoinRequests] = useState<CustomerJoinRequest[]>([]);
  const [linkedOrgs, setLinkedOrgs] = useState<MyLinkedCustomerOrg[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, linked] = await Promise.all([
        fetchStudentPortalContext(),
        listMyLinkedCustomerOrganizations().catch(() => [] as MyLinkedCustomerOrg[]),
      ]);
      setCtx(next);
      setLinkedOrgs(linked);
      setEnrollment((prev) => {
        if (prev && next.enrollments.some((e) => e.enrollmentId === prev.enrollmentId)) {
          return next.enrollments.find((e) => e.enrollmentId === prev.enrollmentId) || prev;
        }
        return next.enrollments[0] || null;
      });
      if (!next.student || next.enrollments.length === 0) {
        try {
          const requests = await customerJoinService.getMyJoinRequests();
          setJoinRequests(requests);
        } catch {
          setJoinRequests([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '포털을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isNativeApp() || !isSupabaseConfigured() || !user?.id) return;
    void registerAppPush({
      userId: user.id,
      organizationId: enrollment?.organizationId || currentOrganization?.id,
    });
  }, [user?.id, enrollment?.organizationId, currentOrganization?.id]);

  useEffect(() => {
    if (!enrollment) return;
    if (tab === 'practice' && !showPracticeTab(enrollment.industryType)) {
      setTab('home');
    }
  }, [enrollment, tab]);

  if (loading) return <LoadingScreen message="수강생 포털 준비 중..." />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!ctx?.student || !enrollment) {
    if (linkedOrgs.length > 0) {
      return (
        <CustomerLinkedOrgsShell
          organizations={linkedOrgs}
          email={user?.email || ''}
          canExit={!isCustomerOnly}
          onExit={() => {
            if (!isCustomerOnly) exitCustomerPortal();
          }}
          onSignOut={() => void signOut()}
          onRefresh={() => void load()}
        />
      );
    }

    return (
      <CustomerNoLinkEmptyState
        joinRequests={joinRequests}
        onReload={load}
        onSignOut={() => void signOut()}
      />
    );
  }

  return (
    <StorageHydrator
      key={enrollment.organizationId}
      organizationId={enrollment.organizationId}
      industryType={enrollment.industryType}
    >
      <CustomerPortalBody
        displayName={ctx.student.displayName}
        email={user?.email || ''}
        enrollment={enrollment}
        enrollments={ctx.enrollments}
        linkedOrgs={linkedOrgs}
        onSelectEnrollment={setEnrollment}
        tab={tab}
        onTabChange={setTab}
        onExit={() => {
          if (!isCustomerOnly) exitCustomerPortal();
        }}
        canExit={!isCustomerOnly}
        onSignOut={() => void signOut()}
        orgName={currentOrganization?.name || enrollment.organizationName}
      />
    </StorageHydrator>
  );
};
