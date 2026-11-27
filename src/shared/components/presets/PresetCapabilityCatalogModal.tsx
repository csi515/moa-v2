import React, { useState, useMemo } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { listMoaVisiblePresets } from '@/app/presets/presetRegistry';
import type { IndustryPresetDefinition } from '@/core/presets/types';
import { Search, Sparkles, CheckCircle, PlusCircle, Tag, Layers } from 'lucide-react';

interface PresetCapabilityCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: '전체 (52개)' },
  { id: 'academy', label: '교육·학원' },
  { id: 'beauty', label: '뷰티·살롱' },
  { id: 'fitness', label: '피트니스·웰니스' },
  { id: 'space', label: '공간·대여' },
  { id: 'fnb_retail', label: '리테일·식음료' },
  { id: 'service', label: '전문 서비스' },
] as const;

type CategoryTabId = (typeof CATEGORY_TABS)[number]['id'];

function getCategoryForPreset(presetId: string): CategoryTabId {
  if (['piano_academy', 'taekwondo', 'art_academy', 'math_english_academy', 'ballet_dance', 'vocal_music_academy', 'coding_academy', 'driving_school', 'cooking_academy', 'flight_attendant_academy', 'swimming_lesson'].includes(presetId)) {
    return 'academy';
  }
  if (['hair_salon', 'nail_shop', 'eyelash_brow', 'barbershop', 'skin_care_esthetic', 'waxing_shop', 'tattoo_studio', 'massage_spa', 'tanning_studio'].includes(presetId)) {
    return 'beauty';
  }
  if (['gym_fitness', 'pilates_studio', 'yoga_studio', 'crossfit_box', 'golf_driving_range', 'boxing_mma', 'climbing_gym', 'tennis_court'].includes(presetId)) {
    return 'fitness';
  }
  if (['study_cafe', 'party_room', 'practice_room_rental', 'shared_kitchen', 'dance_studio_rental', 'coworking_space', 'camping_glamping', 'hotel_pension_room'].includes(presetId)) {
    return 'space';
  }
  if (['retail_select_shop', 'cafe_bakery', 'restaurant_dine_in', 'dessert_custom_cake', 'self_carwash', 'craft_leather_workshop', 'flower_shop'].includes(presetId)) {
    return 'fnb_retail';
  }
  return 'service';
}

export const PresetCapabilityCatalogModal: React.FC<PresetCapabilityCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTabId>('all');
  const [selectedPreset, setSelectedPreset] = useState<IndustryPresetDefinition | null>(null);

  const presets = useMemo(() => {
    return listMoaVisiblePresets();
  }, []);

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchCategory = activeTab === 'all' || getCategoryForPreset(p.id) === activeTab;
      if (!matchCategory) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(term);
      const idMatch = p.id.toLowerCase().includes(term);
      const descMatch = p.description?.toLowerCase().includes(term) ?? false;
      const capMatch = (p.requiredCapabilities as string[]).some((c) => c.toLowerCase().includes(term)) ||
        (p.optionalCapabilities as string[]).some((c) => c.toLowerCase().includes(term));
      return nameMatch || idMatch || descMatch || capMatch;
    });
  }, [presets, activeTab, searchTerm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="52개 업종별 권장 기능(Capability) 카탈로그"
      description="Moa-v2의 표준 3계층(Core-Capability-Preset) 아키텍처에 의해 정의된 업종별 최적 기능 조합입니다."
      maxWidth="4xl"
      intent="view"
    >
      <div className="space-y-4">
        {/* 검색 및 카테고리 탭 */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="업종명, 영문 식별자, 기능 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 통계 */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>총 <strong>{filteredPresets.length}</strong>개의 업종 프리셋이 검색되었습니다.</span>
          <span className="flex items-center gap-1 text-slate-800">
            <Sparkles className="h-3.5 w-3.5" />
            단일화된 Capability 재사용
          </span>
        </div>

        {/* 프리셋 카드 그리드 */}
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredPresets.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setSelectedPreset(isSelected ? null : preset)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-slate-400 bg-slate-50/40 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{preset.name}</h3>
                    <code className="text-[11px] text-slate-400">{preset.id}</code>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    기능 {(preset.requiredCapabilities?.length ?? 0) + (preset.optionalCapabilities?.length ?? 0)}종
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                  {preset.description || '업종별 맞춤 기본 설정 및 예약/고객 관리 지원'}
                </p>

                {/* 필수 기능 태그 */}
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-slate-700">필수 운영 도구</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(preset.requiredCapabilities || []).slice(0, 5).map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center gap-0.5 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        <CheckCircle className="h-2.5 w-2.5" />
                        {cap}
                      </span>
                    ))}
                    {(preset.requiredCapabilities?.length ?? 0) > 5 && (
                      <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                        +{(preset.requiredCapabilities?.length ?? 0) - 5}
                      </span>
                    )}
                  </div>
                </div>

                {/* 선택 기능 태그 */}
                {preset.optionalCapabilities && preset.optionalCapabilities.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-semibold text-slate-500">선택 확장 도구</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {preset.optionalCapabilities.slice(0, 4).map((cap) => (
                        <span
                          key={cap}
                          className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          <PlusCircle className="h-2.5 w-2.5" />
                          {cap}
                        </span>
                      ))}
                      {preset.optionalCapabilities.length > 4 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          +{preset.optionalCapabilities.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 선택된 상태 세부정보 */}
                {isSelected && preset.terms && (
                  <div className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-700">맞춤 호칭 다형성:</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-slate-500">
                      {preset.terms.customer && <span>고객 ➔ <strong>{preset.terms.customer}</strong></span>}
                      {preset.terms.pass && <span>이용권 ➔ <strong>{preset.terms.pass}</strong></span>}
                      {preset.terms.staff && <span>직원 ➔ <strong>{preset.terms.staff}</strong></span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
