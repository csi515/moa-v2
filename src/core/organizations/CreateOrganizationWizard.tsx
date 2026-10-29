import React, { useMemo, useRef, useState } from 'react';
import { useOrganization } from './OrganizationProvider';
import {
  Building2,
  X,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  type IndustryType,
  getIndustryCategoryForType,
  getIndustryCategoryLabel,
  getIndustryLabel,
} from '../industry/types';
import { IndustryPicker } from '../industry/IndustryPicker';
import {
  getPlaceLabel,
  getPlaceNamePlaceholder,
} from '../industry/industryUi';
import { StorageService } from '@/services/storage';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import {
  OrganizationLocationSetupError,
  ensureOrganizationDefaultLocation,
} from './services/organizationService';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  OrganizationAddressFields,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';

interface CreateOrganizationWizardProps {
  initialIndustryType?: IndustryType;
  onComplete: () => void;
  onCancel: () => void;
}

export const CreateOrganizationWizard: React.FC<CreateOrganizationWizardProps> = ({
  initialIndustryType = 'piano',
  onComplete,
  onCancel,
}) => {
  const org = useOrganization();
  const submittingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    industryType: initialIndustryType,
  });
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(
    EMPTY_ORGANIZATION_ADDRESS
  );

  const placeLabel = getPlaceLabel(formData.industryType);

  const guideFeatureText = useMemo(() => {
    const cat = getIndustryCategoryForType(formData.industryType);
    if (formData.industryType === 'retail') {
      return '재고·판매·정산 관리 등';
    }
    switch (cat) {
      case 'education':
      case 'lesson':
        return '출결·수업 일정·수강료 관리 등';
      case 'fitness':
        return '회원권·수업 예약·락커 배정 등';
      case 'beauty':
      case 'wellness':
        return '시술 예약·고객 차트·매출 관리 등';
      case 'food':
        return '테이블 주문·재고·직원 스케줄 등';
      default:
        return '고객 관리·결제·스케줄 등';
    }
  }, [formData.industryType]);

  const handleStepInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(`${placeLabel} 이름을 입력해 주세요.`);
      return;
    }
    const fullAddress = formatOrganizationAddress(addressParts);
    if (!fullAddress) {
      setError(`${placeLabel} 주소를 검색하거나 직접 입력해 주세요.`);
      return;
    }
    setError(null);

    // 교육·학원을 포함한 모든 업종 공통: 출결 방식을 개설 단계에서 묻지 않고 즉시 사업장 개설
    await handleFinish();
  };

  const handleFinish = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      let orgId = createdOrgId;
      if (orgId) {
        await ensureOrganizationDefaultLocation(orgId);
      } else {
        orgId = await org.createOrganization(formData.name.trim(), formData.industryType, {
          directorName: StorageService.getActiveUser().name.trim(),
          representativeName: StorageService.getActiveUser().name.trim(),
          address: formatOrganizationAddress(addressParts),
          addressParts,
        });
        setCreatedOrgId(orgId);
      }

      setStep(2);
    } catch (err) {
      submittingRef.current = false;
      if (err instanceof OrganizationLocationSetupError) {
        setCreatedOrgId(err.organizationId);
        setError(err.message);
      } else {
        setError(userFacingErrorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterOrganization = async () => {
    if (!createdOrgId || isEntering) return;
    setIsEntering(true);
    setError(null);
    try {
      // refresh 먼저 하면 단일 사업장을 자동 선택하며 선택기가 언마운트된다.
      // 생성 직후 목록에 없으므로 selectOrganization이 최신 membership을 다시 조회한다.
      await org.selectOrganization(createdOrgId);
      onComplete();
    } catch (err) {
      setError(userFacingErrorMessage(err));
      setIsEntering(false);
    }
  };

  const steps = [
    { icon: Sparkles, label: '업종 선택' },
    { icon: Building2, label: '사업장 정보' },
    { icon: CheckCircle2, label: '완료' },
  ];

  const selectedCategoryLabel = getIndustryCategoryLabel(
    getIndustryCategoryForType(formData.industryType)
  );
  const selectedIndustryLabel = getIndustryLabel(formData.industryType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">새 사업장 등록</h2>
          </div>
          {step < 2 && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="취소"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <React.Fragment key={s.label}>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-indigo-100' : isDone ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className="flex-1 h-0.5 bg-slate-100 mx-1" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step 0: 업종 선택 단계 (업종 선택 강제, 이름/주소 입력은 차단) */}
        {step === 0 && (
          <div className="p-6 space-y-5">
            {/* 업종 선택 및 맞춤 기능 안내 배너 */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 flex items-center gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-900 font-medium">
                운영하시는 업종을 먼저 선택해 주세요. 선택하신 업종에 맞춰 필수 도구와 명칭({guideFeatureText})이 자동으로 최적화됩니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                운영 업종 분류 및 선택 <span className="text-rose-500">*</span>
              </label>
              <IndustryPicker
                value={formData.industryType}
                onChange={(industryType) => {
                  setFormData((prev) => ({ ...prev, industryType }));
                  setError(null);
                }}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-slate-600 min-h-[44px] px-3"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.industryType) {
                    setError('업종을 선택해 주세요.');
                    return;
                  }
                  setError(null);
                  setStep(1);
                }}
                data-testid="btn-wizard-next"
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] inline-flex items-center gap-1.5 shadow-xs transition"
              >
                <span>다음: {getPlaceLabel(formData.industryType)} 정보 입력</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 사업장 정보 입력 단계 (업종 선택 후 진행) */}
        {step === 1 && (
          <form onSubmit={handleStepInfo} className="p-6 space-y-4">
            {/* 선택된 업종 확인 및 재선택 배너 */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-xs text-slate-600 truncate">
                  선택된 업종:{' '}
                  <span className="font-bold text-indigo-900">
                    [{selectedCategoryLabel}] {selectedIndustryLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline shrink-0 min-h-[36px] px-2 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>업종 변경</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {placeLabel} 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                data-testid="input-org-name"
                placeholder={getPlaceNamePlaceholder(formData.industryType)}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold min-h-[44px]"
                autoFocus
              />
            </div>
            <OrganizationAddressFields
              value={addressParts}
              onChange={setAddressParts}
              required
              label={`${placeLabel} 주소`}
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                disabled={isSaving}
                className="text-xs text-slate-500 hover:text-slate-700 min-h-[44px] px-3 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>이전 (업종 선택)</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                data-testid="btn-wizard-next"
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>개설 중...</span>
                  </>
                ) : (
                  <>
                    <span>사업장 개설하기</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 완료 단계 */}
        {step === 2 && (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">사업장 등록이 완료되었습니다</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                <span className="font-semibold text-slate-800">{formData.name}</span>
                <br />
                <span className="text-xs text-slate-400 mt-1 block">
                  출결 방식·회원권 등 세부 운영 설정은 사업장 개설 후 언제든 설정 메뉴에서 구성할 수 있습니다.
                </span>
              </p>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700 text-left">
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={isEntering || !createdOrgId}
              data-testid="btn-wizard-enter"
              onClick={() => void handleEnterOrganization()}
              className="w-full px-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {isEntering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 들어가는 중...
                </>
              ) : (
                <>
                  사업장으로 들어가기 <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
