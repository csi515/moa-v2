import React from 'react';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import type { WeaningStageGuide } from '@/domain/babyFood/babyFoodLogic';
import { BABY_FOOD_COOP_COPY } from './babyFoodCoopCopy';

export type WeaningGuideModalProps = {
  babyName: string;
  guide: WeaningStageGuide;
  onClose: () => void;
};

export function WeaningGuideModal({ babyName, guide, onClose }: WeaningGuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">
              {babyName} 아기 맞춤 {guide.stageLabel} 가이드
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg p-1 text-slate-600 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <span className="block text-xs font-semibold text-slate-600">단계 설명 & 식사 빈도</span>
            <p className="mt-1 font-medium text-slate-800">{guide.description}</p>
            <p className="mt-0.5 text-xs font-semibold text-indigo-600">
              섭취 주기: {guide.feedingFrequency} (권장 질감: {guide.textureGuide})
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-emerald-700">
              추천 음식 & 재료 리스트
            </span>
            <div className="flex flex-wrap gap-1.5">
              {guide.recommendedFoods.map((f, idx) => (
                <span
                  key={`modal-rec-${idx}`}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-rose-800">
              <ShieldCheck className="h-4 w-4 text-rose-600" />
              주의 및 제한 식품
            </span>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-rose-900">
              {guide.cautionFoods.map((c, idx) => (
                <li key={`modal-caut-${idx}`}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 text-right">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            {BABY_FOOD_COOP_COPY.guideModalClose}
          </Button>
        </div>
      </div>
    </div>
  );
}
