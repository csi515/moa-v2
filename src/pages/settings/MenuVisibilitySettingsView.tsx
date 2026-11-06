import React, { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  RotateCcw,
  Info,
  CheckCircle2,
  Sparkles,
  Layers,
  Settings2,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import {
  getPresetMenuItems,
  isCapabilityRequired,
  toggleCapabilityVisibility,
} from './menuVisibilityEngine';

export const MenuVisibilitySettingsView: React.FC = () => {
  const { currentOrganization, hiddenCapabilities, updateHiddenCapabilities } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 현재 사업장의 업종 프리셋 조회
  const industryId = currentOrganization?.industry_type || 'general_academy';
  const preset = useMemo(
    () => getIndustryPreset(industryId) || getIndustryPreset('general_academy'),
    [industryId]
  );

  const presetId = preset?.id || 'general_academy';
  const presetName = preset?.name || '기본 사업장';

  // 프리셋에 속한 메뉴 항목 목록 (화이트리스트 기반)
  const menuItems = useMemo(() => {
    return getPresetMenuItems(presetId, hiddenCapabilities);
  }, [presetId, hiddenCapabilities]);

  // 필수 메뉴와 선택 메뉴 분리
  const requiredItems = useMemo(() => menuItems.filter((i) => i.isRequired), [menuItems]);
  const optionalItems = useMemo(() => menuItems.filter((i) => !i.isRequired), [menuItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggle = async (capId: string) => {
    if (!preset || saving) return;
    if (isCapabilityRequired(preset.id, capId)) return;

    try {
      setSaving(true);
      const nextHidden = toggleCapabilityVisibility(preset.id, hiddenCapabilities, capId);
      await updateHiddenCapabilities(nextHidden);
      showToast('사이드바 메뉴 표시 설정이 갱신되었습니다.');
    } catch (err) {
      console.error('Failed to update hidden capabilities:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (saving || hiddenCapabilities.length === 0) return;
    try {
      setSaving(true);
      await updateHiddenCapabilities([]);
      showToast('모든 메뉴가 기본 표시 상태로 초기화되었습니다.');
    } catch (err) {
      console.error('Failed to reset menu visibility:', err);
    } finally {
      setSaving(false);
    }
  };

  const hiddenCount = optionalItems.filter((i) => !i.isVisible).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 헤더 섹션 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">사이드바 메뉴 표시 관리</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                현재 업종에 맞추어 사업장에 불필요한 사이드바 메뉴를 숨기거나 표시할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={saving || hiddenCapabilities.length === 0}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            hiddenCapabilities.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 shadow-sm'
          }`}
          title="모든 메뉴를 기본 표시 상태로 복원합니다"
        >
          <RotateCcw className="w-4 h-4" />
          기본 메뉴로 초기화
        </button>
      </div>

      {/* 현재 업종 프리셋 화이트리스트 안내 배너 */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-500/5 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm mt-0.5 sm:mt-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                현재 적용 업종
              </span>
              <h2 className="text-base font-bold text-slate-900">{presetName}</h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              선택하신 업종({presetName})에 최적화된 메뉴만 표시됩니다. 타 업종의 불필요한 기능은 노출되지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-indigo-50 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>표시 중 {menuItems.length - hiddenCount}개</span>
          </div>
          {hiddenCount > 0 && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>숨김 {hiddenCount}개</span>
            </div>
          )}
        </div>
      </div>

      {/* 1. 핵심 필수 메뉴 (항상 표시 - 체크 해제 불가) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">핵심 필수 기능 (항상 표시)</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            시스템 보호
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          해당 업종 운영의 뼈대가 되는 필수 기능으로, 시스템 안정성을 위해 항상 사이드바에 표시됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    aria-label={`${item.name} (필수 기능)`}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-not-allowed opacity-75"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      기본 필수
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              <div className="text-emerald-600 p-1">
                <Eye className="w-4 h-4 opacity-75" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 선택 메뉴 (사업장 필요에 따라 숨김/표시 토글 가능) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">선택 메뉴 (숨김/표시 관리)</h3>
          </div>
          <span className="text-xs text-slate-400">
            체크 해제 시 사이드바에서 즉시 숨겨집니다.
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          현재 매장에서 사용하지 않는 부가 메뉴를 체크 해제하여 사이드바를 깔끔하게 정돈할 수 있습니다.
        </p>

        {optionalItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
            해당 업종 프리셋에는 추가 선택 메뉴가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {optionalItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  item.isVisible
                    ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 bg-white'
                    : 'border-dashed border-slate-200 bg-slate-50/80 opacity-70 hover:opacity-90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={item.isVisible}
                      disabled={saving}
                      onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          item.isVisible ? 'text-slate-900' : 'text-slate-500 line-through'
                        }`}
                      >
                        {item.name}
                      </span>
                      {!item.isVisible && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          숨김
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="p-1">
                  {item.isVisible ? (
                    <Eye className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuVisibilitySettingsView;
