import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView }))
);

/** 소모품·발주 전용 워크스페이스 (런처 딥링크 SSOT) */
export const WorkspaceSupplyRestockPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-3">
        <Link
          to="/workspace/intranet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>사내 앱 런처로 돌아가기</span>
        </Link>
      </div>
      <Suspense fallback={<LoadingScreen message="소모품·발주 로딩…" />}>
        <SupplyRestockView />
      </Suspense>
    </div>
  );
};
