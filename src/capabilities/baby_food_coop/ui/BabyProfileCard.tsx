import React from 'react';
import {
  calculateBabyAgeParts,
  getWeaningStageGuide,
  type WeaningStageGuide,
} from '@/domain/babyFood/babyFoodLogic';
import { AlertTriangle, Baby, CheckCircle2, HeartHandshake, ShieldAlert, Sparkles } from 'lucide-react';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string; // 'YYYY-MM-DD'
  guardianName?: string;
  guardianContact?: string;
  crm_tags?: string[];
  allergies?: string[];
  avatarUrl?: string;
  memo?: string;
}

export interface BabyProfileCardProps {
  baby: BabyProfile;
  baseDate?: string | Date;
  isSelected?: boolean;
  onToggleSelect?: (babyId: string) => void;
  showWeaningGuideModal?: (guide: WeaningStageGuide, babyName: string) => void;
}

/**
 * crm_tags 및 allergies 목록에서 알레르기 항목을 감지하여 분류하는 헬퍼 함수
 */
export function extractAllergyTags(baby: BabyProfile): {
  allergyTags: string[];
  generalTags: string[];
} {
  const allergyKeywords = [
    '알레르기',
    '알러지',
    'allergy',
    '난류',
    '계란',
    '달걀',
    '우유',
    '땅콩',
    '견과',
    '대두',
    '밀가루',
    '갑각류',
    '새우',
    '게',
    '복숭아',
    '토마토',
  ];

  const tags = new Set<string>();
  if (Array.isArray(baby.crm_tags)) {
    baby.crm_tags.forEach((t) => t && tags.add(t.trim()));
  }
  if (Array.isArray(baby.allergies)) {
    baby.allergies.forEach((a) => a && tags.add(a.trim()));
  }

  const allergyTags: string[] = [];
  const generalTags: string[] = [];

  tags.forEach((tag) => {
    const isAllergy = allergyKeywords.some((kw) =>
      tag.toLowerCase().includes(kw.toLowerCase())
    );
    if (isAllergy) {
      allergyTags.push(tag);
    } else {
      generalTags.push(tag);
    }
  });

  return { allergyTags, generalTags };
}

/**
 * 이유식 품앗이 모임 전용 아기 프로필 카드
 * - 출생일 기준 실시간 개월 수 뱃지 ("만 7개월 / 중기")
 * - crm_tags와 연동된 알레르기 빨간색 경고 뱃지 강조
 * - 개월 수에 맞춘 '추천 재료 칩' 표출
 */
export const BabyProfileCard: React.FC<BabyProfileCardProps> = ({
  baby,
  baseDate,
  isSelected = false,
  onToggleSelect,
  showWeaningGuideModal,
}) => {
  const { months, days } = calculateBabyAgeParts(baby.birthDate, baseDate);
  const guide = getWeaningStageGuide(months);
  const { allergyTags, generalTags } = extractAllergyTags(baby);
  const ageBadgeLabel =
    days > 0 ? `만 ${months}개월 ${days}일 / ${guide.stageName}` : `만 ${months}개월 / ${guide.stageName}`;

  const getStageBadgeColor = (stageKey: string) => {
    switch (stageKey) {
      case 'prep':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'early':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'middle':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'late':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'complete':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-200 shadow-sm ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* 카드 상단: 아기 정보 및 선택 토글 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {baby.avatarUrl ? (
              <img
                src={baby.avatarUrl}
                alt={baby.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Baby className="h-6 w-6 text-slate-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 text-base">
                {baby.name}
              </h4>
              {baby.guardianName && (
                <span className="text-xs text-slate-600">
                  ({baby.guardianName} 님)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              생일: {baby.birthDate}
            </p>
          </div>
        </div>

        {onToggleSelect && (
          <button
            type="button"
            onClick={() => onToggleSelect(baby.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="품앗이 정산 참여 여부 토글"
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                참여 중
              </>
            ) : (
              <>
                <HeartHandshake className="h-3.5 w-3.5" />
                정산 참여
              </>
            )}
          </button>
        )}
      </div>

      {/* 실시간 개월 수 & 이유식 단계 뱃지 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStageBadgeColor(
            guide.stageKey
          )}`}
        >
          <Sparkles className="h-3 w-3" />
          {ageBadgeLabel}
        </span>
        <span className="text-xs text-slate-600">
          권장: {guide.monthsRange} ({guide.feedingFrequency})
        </span>
      </div>

      {/* crm_tags 연동 알레르기 빨간색 경고 뱃지 강조 */}
      {allergyTags.length > 0 && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>등록된 알레르기 주의 ({allergyTags.length}건)</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {allergyTags.map((tag, idx) => (
              <span
                key={`allergy-${idx}`}
                className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-300 shadow-sm"
              >
                <AlertTriangle className="h-3 w-3 text-rose-600" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 일반 태그 표출 */}
      {generalTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {generalTags.map((tag, idx) => (
            <span
              key={`tag-${idx}`}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 해당 개월 수 추천 재료 칩 */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
          <span className="font-medium text-slate-700">
            🌱 {guide.stageName} 추천 재료:
          </span>
          {showWeaningGuideModal && (
            <button
              type="button"
              onClick={() => showWeaningGuideModal(guide, baby.name)}
              className="text-indigo-600 hover:text-indigo-700 underline text-[11px]"
            >
              단계별 가이드 상세
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {guide.recommendedFoods.slice(0, 6).map((food, idx) => (
            <span
              key={`rec-${idx}`}
              className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100"
            >
              {food}
            </span>
          ))}
          {guide.recommendedFoods.length > 6 && (
            <span className="text-[11px] text-slate-600 self-center">
              +{guide.recommendedFoods.length - 6}개 더보기
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
