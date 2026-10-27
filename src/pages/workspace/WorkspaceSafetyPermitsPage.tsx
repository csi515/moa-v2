import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const SafetyWorkPermitManagementView = lazy(() =>
  import('@/capabilities/safety_work_permit').then((m) => ({
    default: m.SafetyWorkPermitManagementView,
  }))
);

export const WorkspaceSafetyPermitsPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-3">
        <Link
          to="/workspace/intranet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>사내 앱 런처로 돌아가기</span>
        </Link>
      </div>
      <Suspense fallback={<LoadingScreen message="안전작업허가서(PTW) 화면 로딩…" />}>
        <SafetyWorkPermitManagementView />
      </Suspense>
    </div>
  );
};
