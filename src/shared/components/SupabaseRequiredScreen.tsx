import React from 'react';
import { Database } from 'lucide-react';

/** Supabase 환경 변수 미설정 시 표시 */
export const SupabaseRequiredScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Database className="w-7 h-7 text-indigo-600" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Supabase 설정이 필요합니다</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          이 앱은 Supabase 백엔드가 필수입니다. 환경 변수에{' '}
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code>과{' '}
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>
          를 설정한 뒤 다시 실행해 주세요.
        </p>
      </div>
    </div>
  );
};
