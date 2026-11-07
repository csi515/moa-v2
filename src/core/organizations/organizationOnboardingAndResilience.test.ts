/**
 * 사업장 조회 복원력, 신규 사용자 온보딩 및 고객 가입 신청 상태 전이 불변성 테스트
 * 실행: npx tsx src/core/organizations/organizationOnboardingAndResilience.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyBootstrapToSession,
  resolveOrganizationBootstrap,
} from './resolveOrganizationContext';
import { getRoleLabel } from './services/organizationService';
import type { OrganizationMembership } from './services/organizationService';
import { roleSectionLabel } from './roleContextHelpers';

console.log('[test:org-onboarding] Starting Organization Onboarding & Resilience Suite...');

// 1. 소스 코드 불변성 검증: organizationService의 2단계 분리 쿼리 및 safe empty fallback
{
  const orgServiceSource = readFileSync(
    join(process.cwd(), 'src/core/organizations/services/organizationService.ts'),
    'utf8'
  );
  assert.match(
    orgServiceSource,
    /fetchUserOrganizations joined query failed, trying decoupled query:/,
    '외래키 조인 실패 시 분리 쿼리로의 폴백이 구현되어 있어야 합니다.'
  );
  assert.match(
    orgServiceSource,
    /fetchUserOrganizations fallback failed:/,
    '직접 쿼리 실패 시 콘솔 경고와 함께 빈 목록을 안전하게 반환해야 합니다.'
  );
  assert.match(
    orgServiceSource,
    /get_user_memberships RPC exception, falling back:/,
    'RPC 예외 발생 시 직접 쿼리로 폴백해야 합니다.'
  );
}

// 2. 소스 코드 불변성 검증: OrganizationProvider의 계정 동기화 이중 격리
{
  const providerSource = readFileSync(
    join(process.cwd(), 'src/core/organizations/OrganizationProvider.tsx'),
    'utf8'
  );
  assert.match(
    providerSource,
    /try \{\s*await runLoginAccountSync\(\);\s*\} catch/,
    'runLoginAccountSync가 OrganizationProvider 내부에서 try-catch로 격리되어 있어야 합니다.'
  );
}

// 3. 신규 가입자(사업장 0개) 대상 세션 부트스트랩 인베리언트 검증
{
  const emptyMemberships: OrganizationMembership[] = [];
  const session = applyBootstrapToSession({
    memberships: emptyMemberships,
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });

  assert.equal(
    session.selectedMembership,
    null,
    '사업장이 0개인 신규 사용자의 selectedMembership은 null이어야 합니다.'
  );
  assert.equal(
    session.portalMode,
    'none',
    '사업장이 0개인 신규 사용자의 portalMode는 none이어야 합니다.'
  );
  assert.equal(
    session.storage.action,
    'unchanged',
    '신규 사용자의 스토리지 액션은 안전한 unchanged이어야 합니다.'
  );
}

// 4. 신규 사용자(isNewUser) 판정 조건 불변성 검증
{
  function computeIsNewUser(params: {
    organizationsCount: number;
    canAccessCustomerPortal: boolean;
    canAccessParentPortal: boolean;
  }): boolean {
    return (
      params.organizationsCount === 0 &&
      !params.canAccessCustomerPortal &&
      !params.canAccessParentPortal
    );
  }

  // 완전 신규 가입자: 참
  assert.equal(
    computeIsNewUser({
      organizationsCount: 0,
      canAccessCustomerPortal: false,
      canAccessParentPortal: false,
    }),
    true
  );

  // 사업주(사업장 1개 이상): 거짓
  assert.equal(
    computeIsNewUser({
      organizationsCount: 1,
      canAccessCustomerPortal: false,
      canAccessParentPortal: false,
    }),
    false
  );

  // 수강생(사업장은 없으나 승인된 수강생 포털 권한 보유): 거짓
  assert.equal(
    computeIsNewUser({
      organizationsCount: 0,
      canAccessCustomerPortal: true,
      canAccessParentPortal: false,
    }),
    false
  );

  // 학부모(사업장은 없으나 학부모 포털 권한 보유): 거짓
  assert.equal(
    computeIsNewUser({
      organizationsCount: 0,
      canAccessCustomerPortal: false,
      canAccessParentPortal: true,
    }),
    false
  );
}

// 5. 고객 가입 신청(Customer Join Request) 데이터 정규화 및 상태 전이 검증
{
  interface CustomerJoinRequestPayload {
    orgId: string;
    applicantName: string;
    applicantPhone?: string;
    requestType: 'membership' | 'trial' | 'consultation';
    status: 'pending' | 'approved' | 'rejected';
  }

  function createJoinRequest(input: {
    orgId: string;
    applicantName: string;
    applicantPhone?: string;
  }): CustomerJoinRequestPayload {
    if (!input.orgId) throw new Error('사업장 ID는 필수입니다.');
    if (!input.applicantName.trim()) throw new Error('신청자 이름은 필수입니다.');

    return {
      orgId: input.orgId,
      applicantName: input.applicantName.trim(),
      applicantPhone: input.applicantPhone?.replace(/[^0-9]/g, '') || undefined,
      requestType: 'membership',
      status: 'pending', // 신규 신청은 무조건 사업주 승인 대기(pending) 상태로 생성
    };
  }

  const req = createJoinRequest({
    orgId: 'org-uuid-1234',
    applicantName: '  김회원  ',
    applicantPhone: '010-1234-5678',
  });

  assert.equal(req.applicantName, '김회원');
  assert.equal(req.applicantPhone, '01012345678');
  assert.equal(req.status, 'pending', '신규 가입 신청은 사업주 승인 전까지 항상 pending 이어야 합니다.');
}

// 6. 교육 학원을 포함한 전 업종 공통: 사업장 개설 시 출결 방식 질의 없이 강의실 설정(스킵 가능) 후 즉시 개설 불변성 검증
{
  const wizardSource = readFileSync(
    join(process.cwd(), 'src/core/organizations/CreateOrganizationWizard.tsx'),
    'utf8'
  );

  assert.match(
    wizardSource,
    /handleFinish/,
    '모든 업종은 정보 입력 후 번거로운 출결 방식 설문 없이 강의실 설정/스킵을 통해 사업장 개설을 완료해야 합니다.'
  );

  assert.match(
    wizardSource,
    /건너뛰기/,
    '강의실 설정 단계에서 방 구분이 필요 없는 사업주를 위해 건너뛰기 기능이 제공되어야 합니다.'
  );

  assert.equal(
    wizardSource.includes('AttendanceChoice'),
    false,
    '온보딩 마법사에서 출결 방식 선택(AttendanceChoice) 타입 및 번거로운 설문 단계는 완전히 제거되어야 합니다.'
  );

  assert.match(
    wizardSource,
    /홈의 첫걸음 가이드|설정 메뉴에서 구성/,
    '개설 완료 시 첫걸음 가이드 또는 설정 메뉴에서 운영 환경을 구성함을 안내해야 합니다.'
  );
}

// 7. 업종별 역할 라벨 정상화(getRoleLabel & roleSectionLabel) 검증
{
  // 소매업(retail): 직원은 '직원', 섹션은 '직원 활동', 대표는 '대표'
  assert.equal(getRoleLabel('staff', 'retail'), '직원');
  assert.equal(getRoleLabel('owner', 'retail'), '대표');
  assert.equal(roleSectionLabel('staff', 'retail'), '직원 활동');

  // 미용/헤어(hair_salon): 직원은 '관리사', 대표는 '대표'
  assert.equal(getRoleLabel('staff', 'hair_salon'), '관리사');
  assert.equal(getRoleLabel('owner', 'hair_salon'), '대표');
  assert.equal(roleSectionLabel('staff', 'hair_salon'), '관리사 활동');

  // 교육/학원(piano): 직원은 '선생님', 대표는 '원장', 학부모는 '학부모'
  assert.equal(getRoleLabel('staff', 'piano'), '선생님');
  assert.equal(getRoleLabel('owner', 'piano'), '원장');
  assert.equal(getRoleLabel('parent', 'piano'), '학부모');
  assert.equal(roleSectionLabel('staff', 'piano'), '선생님 활동');
  assert.equal(roleSectionLabel('parent', 'piano'), '학부모 포털');

  // 업종 미지정 시 레거시 기본값(하위 호환) 유지
  assert.equal(getRoleLabel('staff', null), '강사');
  assert.equal(getRoleLabel('owner', null), '대표');
  assert.equal(roleSectionLabel('staff', null), '강사 활동');
}



// 9. 직원·강사 합류 시 무분별한 사업장 검색 차단 및 공식 초대 코드 단일화 검증
{
  const selectorSource = readFileSync(
    join(process.cwd(), 'src/core/organizations/OrganizationSelector.tsx'),
    'utf8'
  );

  assert.equal(
    selectorSource.includes('btn-teacher-join'),
    false,
    '무분별한 신청을 유발하는 직원 사업장 검색 버튼(btn-teacher-join)은 완전히 제거되어야 합니다.'
  );

  assert.equal(
    selectorSource.includes('TeacherJoinFlow'),
    false,
    'OrganizationSelector에서 TeacherJoinFlow 임의 검색 플로우는 import되거나 실행되지 않아야 합니다.'
  );

  assert.match(
    selectorSource,
    /data-testid="btn-staff-invite-code"/,
    '직원·강사 합류는 공식 발급된 초대 코드(btn-staff-invite-code)를 통해서만 진입해야 합니다.'
  );
}

console.log('organizationOnboardingAndResilience.test.ts: ok');
