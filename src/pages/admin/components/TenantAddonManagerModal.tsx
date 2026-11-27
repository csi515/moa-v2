import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Sparkles,
  Plus,
  Trash2,
  Lock,
  Building2,
  CheckCircle2,
  Calculator,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { AdminTenantSummary } from '@/services/admin/adminTenantService';
import {
  calculateAddonBilling,
  getAvailableAddonCapabilities,
  validateAddonAddition,
  validateAddonRemoval,
  type AddonCapabilityOption,
} from '@/services/admin/tenantAddonEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { getCapabilityDisplayName } from '@/capabilities';

interface TenantAddonManagerModalProps {
  isOpen: boolean;
  tenant: AdminTenantSummary | null;
  onClose: () => void;
  onSave: (organizationId: string, updatedAddons: string[]) => Promise<void>;
}

export const TenantAddonManagerModal: React.FC<TenantAddonManagerModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSave,
}) => {
  if (!isOpen || !tenant) return null;

  const [currentAddons, setCurrentAddons] = useState<string[]>(tenant.customAddons || []);
  const [selectedCapToAdd, setSelectedCapToAdd] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 해당 사업장의 업종 프리셋 및 기본 제공 기능
  const preset = useMemo(() => {
    return getIndustryPreset(tenant.industryType);
  }, [tenant.industryType]);

  const presetCapabilities = useMemo(() => {
    return (preset?.capabilities ?? []) as string[];
  }, [preset]);

  // 추가 가능한 애드온 목록 (프리셋 기본 기능 및 현재 장착된 애드온 제외)
  const availableOptions: AddonCapabilityOption[] = useMemo(() => {
    return getAvailableAddonCapabilities(tenant.industryType, currentAddons);
  }, [tenant.industryType, currentAddons]);

  // 실시간 월 청구 금액 계산 (기본료 + 추가 애드온 단가 합산)
  const billingSummary = useMemo(() => {
    return calculateAddonBilling(tenant.subscriptionPlan, currentAddons);
  }, [tenant.subscriptionPlan, currentAddons]);

  // 애드온 추가 핸들러
  const handleAddAddon = () => {
    if (!selectedCapToAdd) {
      setErrorMsg('추가할 애드온을 드롭다운에서 선택해주세요.');
      return;
    }

    const check = validateAddonAddition(selectedCapToAdd, currentAddons, presetCapabilities);
    if (!check.valid) {
      setErrorMsg(check.error || '애드온을 추가할 수 없습니다.');
      return;
    }

    setCurrentAddons((prev) => [...prev, selectedCapToAdd]);
    setSelectedCapToAdd('');
    setErrorMsg(null);
  };

  // 애드온 삭제 핸들러
  const handleRemoveAddon = (capId: string) => {
    const check = validateAddonRemoval(capId, currentAddons);
    if (!check.valid) {
      setErrorMsg(check.error || '애드온을 삭제할 수 없습니다.');
      return;
    }

    setCurrentAddons((prev) => prev.filter((id) => id !== capId));
    setErrorMsg(null);
  };

  // 저장 및 적용
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onSave(tenant.id, currentAddons);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '애드온 설정을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden my-8">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/20 text-slate-500 border border-slate-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                테넌트 유료 애드온(Add-on) 관리
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-900/10 text-slate-400 border border-slate-400">
                  {tenant.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                사업장별로 독립적인 유료 기능을 장착하며, 고객 화면 사이드바에 실시간 반영됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. 사업장 기본 정보 카드 */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">사업장 상호</span>
                <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  {tenant.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">대표자 계정 / 코드</span>
                <span className="font-medium text-slate-200 block mt-0.5">{tenant.ownerEmail}</span>
                <span className="font-mono text-[10px] text-slate-400">{tenant.publicCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">업종 프리셋 / 구독 플랜</span>
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-semibold text-[11px]">
                  {tenant.industryLabel}
                </span>
                <span className="ml-1.5 text-slate-500 font-bold text-xs">
                  {tenant.subscriptionPlan} 플랜
                </span>
              </div>
            </div>
          </div>

          {/* 2. 프리셋 기본 제공 기능 (해제 불가 회색 배지) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                업종 프리셋 기본 기능 ({presetCapabilities.length}개)
              </h3>
              <span className="text-[11px] text-slate-500">기본 포함 (해제 불가)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 max-h-28 overflow-y-auto">
              {presetCapabilities.map((capId) => (
                <span
                  key={capId}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-300 border border-slate-700"
                  title={`${capId} (프리셋 기본)`}
                >
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  {getCapabilityDisplayName(capId)}
                </span>
              ))}
            </div>
          </div>

          {/* 3. 현재 장착된 애드온 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                현재 장착된 유료 애드온 ({currentAddons.length}개)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">개당 월 20,000원</span>
            </div>

            {currentAddons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
                장착된 추가 애드온이 없습니다. 아래에서 원하는 기능을 추가할 수 있습니다.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800/60 bg-slate-900/20 p-3.5">
                {currentAddons.map((capId) => (
                  <span
                    key={capId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/30 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-400 shadow-xs"
                  >
                    <Sparkles className="w-3 h-3 text-slate-500" />
                    <span>{getCapabilityDisplayName(capId)}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({capId})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(capId)}
                      className="ml-1 rounded-full p-0.5 hover:bg-rose-500/30 hover:text-rose-200 text-slate-400 transition-colors"
                      title="애드온 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. 신규 애드온 추가 드롭다운 */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              신규 Capability 애드온 추가
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCapToAdd}
                onChange={(e) => setSelectedCapToAdd(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 focus:border-slate-900 focus:outline-none"
              >
                <option value="">추가할 기능 선택 (총 {availableOptions.length}개 가용)</option>
                {availableOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.id}) - {opt.description}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddAddon}
                disabled={!selectedCapToAdd}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                애드온 장착
              </button>
            </div>
            {selectedCapToAdd && (
              <p className="text-[11px] text-slate-400">
                선택 기능 설명:{' '}
                {availableOptions.find((o) => o.id === selectedCapToAdd)?.description}
              </p>
            )}
          </div>

          {/* 5. 월 청구 금액 자동 합산 표시 */}
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Calculator className="w-3.5 h-3.5" />
                월 예상 청구 금액
              </span>
              <span className="text-[11px]">플랜 기본료 + 유료 애드온</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-emerald-900/40 pt-2 text-xs">
              <div className="space-x-3 text-slate-300">
                <span>
                  기본 플랜: <strong>{billingSummary.base_fee.toLocaleString()}원</strong>
                </span>
                <span>+</span>
                <span>
                  애드온 ({currentAddons.length}개):{' '}
                  <strong className="text-slate-400">
                    {billingSummary.addons_total.toLocaleString()}원
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-emerald-400">
                  총 {billingSummary.total_monthly_fee.toLocaleString()}원 / 월
                </span>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            저장 시 고객 화면 사이드바 메뉴 및 권한이 즉시 동기화됩니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSaving ? '저장 중...' : '저장 및 적용'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
