import type { FC } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/core/auth/usePermissions';
import { getOwnerLabel } from '@/core/industry/industryUi';
import { useAppNavigation } from '@/shared/navigation/useAppNavigation';

type Props = {
  /** 화면 성격에 맞는 짧은 제목 (기본: 재무 열람 권한 제한) */
  title?: string;
  /** true면 대시보드 복귀 CTA 표시 */
  showDashboardCta?: boolean;
};

/**
 * 재무·수납·정산 사업주 전용 거부 화면 (공통).
 */
export const FinanceAccessDenied: FC<Props> = ({
  title = '재무 열람 권한 제한',
  showDashboardCta = true,
}) => {
  const { industry } = usePermissions();
  const { setActiveTab } = useAppNavigation();
  const ownerLabel = getOwnerLabel(industry);

  return (
    <div
      role="alert"
      data-testid="finance-access-denied"
      className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-4"
    >
      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          수납·매출·장부 화면은 {ownerLabel}(사업주) 전용입니다. 직급 권한으로 위임할 수 없습니다.
        </p>
      </div>
      {showDashboardCta ? (
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="min-h-[44px] px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      ) : null}
    </div>
  );
};
