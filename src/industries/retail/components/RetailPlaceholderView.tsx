import type { FC } from 'react';
import { PageHeader } from '@/shared/components';
import type { LucideIcon } from 'lucide-react';

/** 기능 미구현 메뉴용 최소 placeholder */
export const RetailPlaceholderView: FC<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = ({ title, description, icon: Icon }) => (
  <div className="p-4 sm:p-6 space-y-6">
    <PageHeader
      icon={<Icon className="w-5 h-5" />}
      title={title}
      description={description}
      iconClassName="text-teal-600"
    />
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">준비 중인 화면입니다</p>
      <p className="mt-1 text-xs text-slate-500">메뉴 구조만 연결되어 있으며, 기능은 곧 추가됩니다.</p>
    </div>
  </div>
);
