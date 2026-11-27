import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const MboManagementView = lazy(() =>
  import('@/capabilities/mbo').then((m) => ({ default: m.MboManagementView })),
);

/** MBO 정기 점검·수정 추적 전용 워크스페이스 라우트 */
export const WorkspaceMboPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-3">
        <Link
          to="/workspace/intranet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>사내 앱 런처로 돌아가기</span>
        </Link>
      </div>
      <Suspense fallback={<LoadingScreen message="MBO 화면 로딩…" />}>
        <MboManagementView />
      </Suspense>
    </div>
  );
};
