import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOrganization } from './OrganizationProvider';
import {
  Building2,
  X,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  DoorOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { createRoom } from './utils/academyRooms';
import type { AcademyRoom } from '@/types';
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
  isRetailIndustry,
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
import { getPostCreateNextSteps } from '@/core/help/educationCopy';

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
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  const [formData, setFormData] = useState({
    name: '',
    industryType: initialIndustryType,
  });
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(
    EMPTY_ORGANIZATION_ADDRESS
  );
  const [rooms, setRooms] = useState<AcademyRoom[]>([]);

  const addRoom = (name?: string) => {
    const nextNum = rooms.length + 1;
    const roomName = name || `${placeLabel} 방 ${nextNum}`;
    setRooms((prev) => [...prev, createRoom({ name: roomName, kind: 'classroom' })]);
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRoomName = (id: string, name: string) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const recommendedRoomChips = useMemo(() => {
    if (formData.industryType === 'piano' || formData.industryType === 'vocal') {
      return ['1번 연습실', '2번 연습실', '3번 연습실', '그랜드룸', '이론실'];
    }
    if (formData.industryType === 'pilates' || formData.industryType === 'gym') {
      return ['1:1 개인레슨실', '그룹 레슨실', '유산소존', '락커룸'];
    }
    if (formData.industryType === 'study_cafe') {
      return ['1인 집중실', '오픈 스터디존', '스터디룸 A', '스터디룸 B'];
    }
    return ['1강의실', '2강의실', '상담실', '실습실'];
  }, [formData.industryType]);

  const placeLabel = getPlaceLabel(formData.industryType);
  const customerWord = isRetailIndustry(formData.industryType) ? '고객' : '회원';
  const nextSteps = useMemo(
    () => getPostCreateNextSteps(formData.industryType, customerWord),
    [formData.industryType, customerWord]
  );

  const guideFeatureText = useMemo(() => {
    const cat = getIndustryCategoryForType(formData.industryType);
    if (isRetailIndustry(formData.industryType)) {
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

  const handleStepInfo = (e: React.FormEvent) => {
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
    setStep(2); // Step 2(강의실 설정 단계)로 이동
  };

  const handleFinish = async (roomsToSave: AcademyRoom[] = rooms) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      let orgId = createdOrgId;
      if (orgId) {
        await ensureOrganizationDefaultLocation(orgId);
      } else {
        const validRooms = roomsToSave.filter((r) => r.name.trim().length > 0);
        orgId = await org.createOrganization(formData.name.trim(), formData.industryType, {
          directorName: StorageService.getActiveUser().name.trim(),
          representativeName: StorageService.getActiveUser().name.trim(),
          address: formatOrganizationAddress(addressParts),
          addressParts,
          rooms: validRooms,
        });
        setCreatedOrgId(orgId);
      }

      setStep(3); // Step 3(완료 단계)로 이동
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

  const handleEnterOrganization = async (opts?: { refreshFirst?: boolean }) => {
    if (!createdOrgId || isEntering) return;
    setIsEntering(true);
    setError(null);
    try {
      if (opts?.refreshFirst) {
        await org.refreshOrganizations();
      }
      // 생성 직후 목록에 없으므로 selectOrganization이 최신 membership을 다시 조회한다.
      await org.selectOrganization(createdOrgId);
      onComplete();
    } catch (err) {
      setError(
        `${userFacingErrorMessage(err)} 목록을 새로고침한 뒤 다시 시도할 수 있습니다.`
      );
      setIsEntering(false);
    }
  };

  const steps = [
    { icon: Sparkles, label: '업종 선택' },
    { icon: Building2, label: '사업장 정보' },
    { icon: DoorOpen, label: '강의실(룸)' },
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
          {step < 3 && (
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
              <div
                ref={errorRef}
                role="alert"
                data-testid="create-org-error"
                className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700"
              >
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
                data-testid="btn-wizard-next"
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>다음: 강의실 설정</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 강의실(시설·룸) 설정 단계 (선택 사항, 스킵 가능) */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                수업 강의실이나 피아노 방이 있으신가요?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                운영 중인 강의실이나 연습실 목록을 등록해 두면 시간표를 방별로 편리하게 관리할 수 있습니다.
                <br />
                <span className="text-indigo-600 font-semibold">
                  방 구분이 필요 없거나 나중에 설정하시려면 건너뛰셔도 됩니다.
                </span>
              </p>
            </div>

            {/* 빠른 추천 칩 */}
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 block">
                자주 쓰는 추천 이름 (클릭하면 바로 추가)
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {recommendedRoomChips.map((chipName) => {
                  const alreadyExists = rooms.some((r) => r.name === chipName);
                  return (
                    <button
                      key={chipName}
                      type="button"
                      disabled={alreadyExists}
                      onClick={() => addRoom(chipName)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 ${
                        alreadyExists
                          ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                          : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-700 shadow-2xs cursor-pointer'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{chipName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 등록된 방 목록 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  등록할 방 목록 {rooms.length > 0 && <span className="text-indigo-600">({rooms.length}개)</span>}
                </label>
                <button
                  type="button"
                  onClick={() => addRoom()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 min-h-[32px] px-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>직접 추가</span>
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="py-7 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <DoorOpen className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs text-slate-500 font-medium">아직 등록된 방이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    추천 이름을 누르거나 건너뛰기를 누르세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {rooms.map((room, idx) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200"
                    >
                      <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => updateRoomName(room.id, e.target.value)}
                        placeholder="방 또는 강의실 이름"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        aria-label="방 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* 하단 액션 버튼: 이전 / 건너뛰기 / 개설 완료 */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="text-xs text-slate-500 hover:text-slate-700 min-h-[44px] px-3 inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>이전 (사업장 정보)</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleFinish([])}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl min-h-[44px] transition cursor-pointer"
                >
                  건너뛰기
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleFinish(rooms)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>개설 중...</span>
                    </>
                  ) : (
                    <>
                      <span>{rooms.length > 0 ? `${rooms.length}개 방 등록하고 개설` : '사업장 개설하기'}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 완료 단계 */}
        {step === 3 && (
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
                  들어가신 뒤 홈의 첫걸음 가이드를 따라가면 바로 업무를 시작할 수 있습니다.
                </span>
              </p>
            </div>
            <div
              className="text-left rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2"
              data-testid="create-org-next-steps"
            >
              <p className="text-xs font-bold text-indigo-800">들어가신 뒤 다음에 할 일</p>
              <ol className="space-y-2">
                {nextSteps.map((stepItem, idx) => (
                  <li key={stepItem.id} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">{stepItem.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{stepItem.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {error && (
              <div
                className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700 text-left space-y-2"
                data-testid="create-org-enter-error"
              >
                <p>{error}</p>
                <button
                  type="button"
                  disabled={isEntering || !createdOrgId}
                  data-testid="btn-wizard-retry-enter"
                  onClick={() => void handleEnterOrganization({ refreshFirst: true })}
                  className="w-full px-3 py-2.5 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-xl min-h-[44px]"
                >
                  목록 새로고침 후 다시 들어가기
                </button>
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
