import type { FC } from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { MemberList } from '@/pages/members/MemberList';

/**
 * 리테일「직원」탭 — Core 멤버·동적 직급 UI 재사용.
 * 신규 HR Capability를 만들지 않는다.
 */
export const RetailStaffHubView: FC = () => {
  return (
    <div className="space-y-4 pb-8">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <PageHeader
          icon={<Users className="w-5 h-5" />}
          iconClassName="text-teal-600"
          title="직원"
          description="캐셔·스태프 초대, 직급·권한을 관리합니다. 판매 권한은 점주가 부여한 역할에 따릅니다."
        />
      </div>
      <MemberList />
    </div>
  );
};
