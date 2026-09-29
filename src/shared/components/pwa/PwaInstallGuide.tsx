import React from 'react';
import { Share, MoreVertical, PlusSquare } from 'lucide-react';
import {
  detectWebInstallPlatform,
  type WebInstallPlatform,
} from './detectWebInstallPlatform';
import { PWA_INSTALL_COPY } from './pwaInstallCopy';

function stepsFor(platform: WebInstallPlatform): { title: string; steps: readonly string[] } {
  switch (platform) {
    case 'ios-safari':
      return { title: PWA_INSTALL_COPY.iosTitle, steps: PWA_INSTALL_COPY.iosSteps };
    case 'android-chrome':
      return { title: PWA_INSTALL_COPY.androidTitle, steps: PWA_INSTALL_COPY.androidSteps };
    default:
      return { title: PWA_INSTALL_COPY.otherTitle, steps: PWA_INSTALL_COPY.otherSteps };
  }
}

function GuideIcon({ platform }: { platform: WebInstallPlatform }) {
  if (platform === 'ios-safari') {
    return <Share className="w-4 h-4 text-indigo-600" aria-hidden />;
  }
  if (platform === 'android-chrome') {
    return <MoreVertical className="w-4 h-4 text-indigo-600" aria-hidden />;
  }
  return <PlusSquare className="w-4 h-4 text-indigo-600" aria-hidden />;
}

interface PwaInstallGuideProps {
  /** 강제 플랫폼 (미지정 시 UA 감지) */
  platform?: WebInstallPlatform;
}

/** 환경별 홈 화면 추가 단계 가이드 */
export const PwaInstallGuide: React.FC<PwaInstallGuideProps> = ({ platform: forced }) => {
  const platform = forced ?? detectWebInstallPlatform();
  const { title, steps } = stepsFor(platform);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
          <GuideIcon platform={platform} />
        </div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <ol className="space-y-2.5 list-none m-0 p-0">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-slate-600 leading-snug">
            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
