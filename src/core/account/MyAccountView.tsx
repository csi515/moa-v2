import React from 'react';
import { User } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { AccountDeletionCard } from './AccountDeletionCard';
import { LegalLinks } from '@/core/legal';

/** 로그인 사용자 공통 계정 관리 (탈퇴·법적 고지) */
export const MyAccountView: React.FC = () => (
  <div className="space-y-6 max-w-lg mx-auto">
    <PageHeader icon={<User className="h-5 w-5" />} title="내 계정" description="계정 관리 및 법적 고지" />
    <AccountDeletionCard />
    <div className="pt-2">
      <LegalLinks />
    </div>
  </div>
);
