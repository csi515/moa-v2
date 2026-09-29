import { useState, type FC } from 'react';
import { ChevronRight, Coins, Settings } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { RetailPointsSettingsView } from './RetailPointsSettingsView';
import { RETAIL_POINTS_COPY as COPY } from './retailPointsCopy';

type Panel = 'home' | 'points';

/** 설정 → 고객/포인트 → 포인트 적립 */
export const RetailSettingsView: FC = () => {
  const [panel, setPanel] = useState<Panel>('home');

  if (panel === 'points') {
    return <RetailPointsSettingsView onBack={() => setPanel('home')} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<Settings className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.settingsTitle}
        description={COPY.settingsDescription}
      />

      <nav className="space-y-2" aria-label="설정 메뉴">
        <button
          type="button"
          onClick={() => setPanel('points')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200 p-4 min-h-[64px] active:bg-slate-50"
        >
          <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">
              {COPY.menuCustomerPoints}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              {COPY.menuCustomerPointsHint}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      </nav>
    </div>
  );
};
