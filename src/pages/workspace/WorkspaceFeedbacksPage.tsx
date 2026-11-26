import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GrievanceListPage } from '@/capabilities/whistleblower_grievance';

/** 사내 건의함 — whistleblower_grievance capability UI 재사용 */
export const WorkspaceFeedbacksPage: React.FC = () => {
  return (
    <main className="mx-auto max-w-3xl p-4 pb-12">
      <div className="mb-3">
        <Link
          to="/workspace/intranet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>사내 앱 런처로 돌아가기</span>
        </Link>
      </div>
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-slate-900">사내 건의함 (사내 소통)</h1>
        <p className="mt-1 text-sm text-slate-600">기명·익명 접수 및 전담자 답변을 확인합니다.</p>
      </header>
      <GrievanceListPage />
    </main>
  );
};
