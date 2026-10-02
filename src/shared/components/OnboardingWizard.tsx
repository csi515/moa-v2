import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  OrganizationAddressFields,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';
import {
  isAttendanceModuleEnabled,
  OnboardingAttendanceChoice,
  withAttendanceModuleEnabled,
} from '@/capabilities/attendance';
import { getIndustryType } from '@/services/adapters/storageContext';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { formatNumberWithCommas } from '@/utils/formatters';
import {
  Building2,
  Clock,
  GraduationCap,
  Wallet,
  BookOpen,
  KeyRound,
  MessageSquareText,
  UserPlus,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  Home,
} from 'lucide-react';
import {
  DEFAULT_OPERATING_DAYS,
  LESSON_DURATION_PRESETS,
  ONBOARDING_STEP_LABELS,
  formatOperatingHours,
  type LessonDurationPreset,
  type OperatingDayDraft,
} from './onboarding/onboardingHelpers';

function initialAddressParts(savedAddress: string): OrganizationAddressValue {
  const existing = savedAddress.trim();
  return existing
    ? { ...EMPTY_ORGANIZATION_ADDRESS, roadAddress: existing }
    : EMPTY_ORGANIZATION_ADDRESS;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  /** 이어하기 시 시작 스텝 (기본: 저장된 progress) */
  initialStep?: number;
}

type DraftTextbook = { id: string; title: string; price: string };

const STEP_ICONS = [
  Building2,
  Clock,
  GraduationCap,
  Wallet,
  BookOpen,
  KeyRound,
  MessageSquareText,
  UserPlus,
] as const;

const TOTAL_STEPS = ONBOARDING_STEP_LABELS.length;

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  initialStep,
}) => {
  const { setActiveTab, showToast, openConfirmDialog } = useApp();
  const org = useOptionalOrganization();
  const saved = StorageService.getSettings();
  const progress = StorageService.getOnboardingProgress();

  const [step, setStep] = useState(() => {
    if (typeof initialStep === 'number') return initialStep;
    if (progress.status === 'in_progress') return Math.min(progress.step, TOTAL_STEPS - 1);
    return 0;
  });
  const [isSaving, setIsSaving] = useState(false);

  const [organizationForm, setOrganizationForm] = useState({
    name: saved.name || org?.currentOrganization?.name || '',
    directorName: saved.directorName || StorageService.getActiveUser().name || '',
    phone: saved.phone || '',
  });
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(() =>
    initialAddressParts(saved.address || '')
  );

  const [operatingDays, setOperatingDays] = useState<OperatingDayDraft[]>(DEFAULT_OPERATING_DAYS);
  const [lessonMinutes, setLessonMinutes] = useState<LessonDurationPreset>(
    (LESSON_DURATION_PRESETS.includes(saved.defaultLessonMinutes as LessonDurationPreset)
      ? saved.defaultLessonMinutes
      : 50) as LessonDurationPreset
  );

  const [billingForm, setBillingForm] = useState({
    defaultTuitionFee: saved.defaultTuitionFee || 180000,
    defaultPaymentDay: saved.defaultPaymentDay || 25,
    bankAccount: typeof saved.bankAccount === 'string' ? saved.bankAccount : '',
  });

  const [textbooks, setTextbooks] = useState<DraftTextbook[]>([]);
  const [draftTextbook, setDraftTextbook] = useState({ title: '', price: '15000' });

  const [pinAttendanceEnabled, setPinAttendanceEnabled] = useState(() =>
    isAttendanceModuleEnabled(
      saved,
      org?.currentOrganization?.industry_type ?? getIndustryType()
    )
  );

  useEffect(() => {
    StorageService.setOnboardingProgress({ status: 'in_progress', step });
  }, [step]);

  const persistLocalAndOrg = async (
    patch: Parameters<typeof StorageService.updateSettings>[0],
    nextAddressParts?: OrganizationAddressValue
  ) => {
    const updated = StorageService.updateSettings(patch);
    if (org?.currentOrganization) {
      await orgService.updateOrganization(org.currentOrganization.id, {
        name: updated.name || undefined,
        addressParts: nextAddressParts,
        settings: {
          name: updated.name,
          directorName: updated.directorName,
          phone: updated.phone,
          address: updated.address,
          defaultTuitionFee: updated.defaultTuitionFee,
          defaultPaymentDay: updated.defaultPaymentDay,
          defaultLessonMinutes: updated.defaultLessonMinutes,
          bankAccount: updated.bankAccount,
          business_hours: updated.business_hours,
          features: updated.features,
        },
      });
      if (updated.name) {
        org.patchOrganization(org.currentOrganization.id, { name: updated.name });
      }
    }
    return updated;
  };

  const requestSkip = () => {
    openConfirmDialog({
      title: '초기 설정을 건너뛸까요?',
      message:
        '나중에 설정 메뉴에서 학원 정보·수납·출결·상담을 변경할 수 있습니다. 앱은 바로 사용할 수 있습니다.',
      confirmText: '건너뛰기',
      cancelText: '계속 설정',
      onConfirm: () => {
        StorageService.markOnboardingSkipped();
        onComplete();
        showToast('초기 설정을 건너뛰었습니다. 필요할 때 설정에서 변경하세요.', 'info');
      },
    });
  };

  const dismissForLater = () => {
    StorageService.setOnboardingProgress({ status: 'in_progress', step });
    onComplete();
    showToast('홈에서 이어서 설정을 계속할 수 있습니다.', 'info');
  };

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleOrganizationNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationForm.name.trim()) {
      showToast('학원명은 필수입니다.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const formatted = formatOrganizationAddress(addressParts);
      await persistLocalAndOrg(
        {
          name: organizationForm.name.trim(),
          directorName: organizationForm.directorName.trim(),
          phone: organizationForm.phone.trim(),
          address: formatted,
        },
        addressParts
      );
      goNext();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '학원 정보 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHoursNext = async () => {
    setIsSaving(true);
    try {
      const business_hours = formatOperatingHours(operatingDays);
      await persistLocalAndOrg({ business_hours: business_hours || undefined });
      goNext();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '운영 시간 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLessonNext = async () => {
    setIsSaving(true);
    try {
      await persistLocalAndOrg({ defaultLessonMinutes: lessonMinutes });
      goNext();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '수업 기본값 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBillingNext = async () => {
    setIsSaving(true);
    try {
      await persistLocalAndOrg({
        defaultTuitionFee: billingForm.defaultTuitionFee,
        defaultPaymentDay: billingForm.defaultPaymentDay,
        bankAccount: billingForm.bankAccount.trim() || undefined,
      });
      goNext();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '수납 기본값 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addDraftTextbook = () => {
    const title = draftTextbook.title.trim();
    if (!title) {
      showToast('교재 이름을 입력해 주세요.', 'warning');
      return;
    }
    const dup = textbooks.some((t) => t.title.toLowerCase() === title.toLowerCase());
    if (dup) {
      showToast('이미 목록에 있는 교재입니다.', 'warning');
      return;
    }
    setTextbooks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, price: draftTextbook.price || '15000' },
    ]);
    setDraftTextbook({ title: '', price: '15000' });
  };

  const handleSaveTextbooks = async () => {
    const pending =
      draftTextbook.title.trim().length > 0
        ? [
            ...textbooks,
            {
              id: 'draft',
              title: draftTextbook.title.trim(),
              price: draftTextbook.price || '15000',
            },
          ]
        : textbooks;

    const seeded = pending
      .map((t) => ({ title: t.title.trim(), price: Number(t.price) || 0 }))
      .filter((t) => t.title.length > 0);

    const seen = new Set<string>();
    let savedCount = 0;
    for (const tb of seeded) {
      const key = tb.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = StorageService.getTextbooks().find(
        (x) => x.title.toLowerCase() === key
      );
      if (existing) continue;
      await StorageService.saveTextbook({
        title: tb.title,
        publisher: '학원 등록',
        level: '기초',
        salePrice: tb.price || 15000,
        price: tb.price || 15000,
        stock: 0,
        minStock: 0,
        isForSale: true,
      });
      savedCount += 1;
    }
    if (savedCount > 0) {
      showToast(`${savedCount}권의 교재가 등록되었습니다.`, 'success');
    }
    goNext();
  };

  const handleAttendanceNext = async () => {
    setIsSaving(true);
    try {
      const next = withAttendanceModuleEnabled(StorageService.getSettings(), pinAttendanceEnabled);
      StorageService.saveSettings(next);
      if (org?.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          settings: { features: next.features },
        });
      }
      goNext();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '출결 설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openConsultationSettings = () => {
    StorageService.setOnboardingProgress({ status: 'in_progress', step: TOTAL_STEPS - 1 });
    onComplete();
    setActiveTab('bookings');
    showToast('상담 가능 시간을 설정한 뒤, 홈에서 초기 설정을 마무리할 수 있습니다.', 'info');
  };

  const finishToStudents = () => {
    StorageService.markOnboardingCompleted(TOTAL_STEPS - 1);
    onComplete();
    setActiveTab('students');
    showToast('학원 설정이 완료되었습니다. 첫 학생을 등록해 보세요!', 'success');
  };

  const finishToHome = () => {
    StorageService.markOnboardingCompleted(TOTAL_STEPS - 1);
    onComplete();
    setActiveTab('dashboard');
  };

  const footerNav = (opts: {
    onPrev?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    secondaryLabel?: string;
    onSecondary?: () => void;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <button
        type="button"
        onClick={opts.onPrev ?? goPrev}
        disabled={step === 0}
        className="px-4 py-2 text-xs font-semibold text-slate-600 flex items-center gap-1 min-h-[44px] disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" /> 이전
      </button>
      <div className="flex flex-wrap gap-2 justify-end">
        {opts.onSecondary && opts.secondaryLabel && (
          <button
            type="button"
            onClick={opts.onSecondary}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[44px]"
          >
            {opts.secondaryLabel}
          </button>
        )}
        {opts.onNext && (
          <button
            type="button"
            onClick={opts.onNext}
            disabled={opts.nextDisabled || isSaving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 min-h-[44px] disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : opts.nextLabel || '다음'}{' '}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      data-testid="onboarding-wizard"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 truncate">학원 초기 설정</h2>
              <p className="text-[11px] text-slate-500">
                {step + 1}/{TOTAL_STEPS} · {ONBOARDING_STEP_LABELS[step]}
                {step === 0 ? ' (필수: 학원명)' : step >= 4 && step <= 6 ? ' (선택)' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissForLater}
            className="text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="나중에 이어서"
            data-testid="onboarding-dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
            {ONBOARDING_STEP_LABELS.map((label, i) => {
              const Icon = STEP_ICONS[i];
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-1 text-[10px] font-bold shrink-0 ${
                    isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                  title={label}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-indigo-100' : isDone ? 'bg-emerald-50' : 'bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 0 && (
            <form onSubmit={handleOrganizationNext} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                학원 기본 정보입니다. <span className="font-semibold text-slate-700">학원명만 필수</span>
                이며, 나머지는 나중에 설정해도 됩니다.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  학원명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 행복 피아노 학원"
                  value={organizationForm.name}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  원장님 성함 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  value={organizationForm.directorName}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, directorName: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  대표 전화 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <input
                  type="tel"
                  value={organizationForm.phone}
                  onChange={(e) => setOrganizationForm({ ...organizationForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono min-h-[44px]"
                />
              </div>
              <div>
                <OrganizationAddressFields
                  value={addressParts}
                  onChange={setAddressParts}
                  label="주소"
                />
                <p className="mt-1 text-[11px] text-slate-400">선택 · 검색 또는 직접 입력</p>
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={requestSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 min-h-[44px] px-3"
                  disabled={isSaving}
                >
                  건너뛰기
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 min-h-[44px] disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '다음'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                요일별 운영 시간을 간단히 설정합니다. 공개 페이지에 표시되며, 나중에 수정할 수 있습니다.
              </p>
              <ul className="space-y-2">
                {operatingDays.map((day) => (
                  <li
                    key={day.day}
                    className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/80"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOperatingDays((prev) =>
                          prev.map((d) =>
                            d.day === day.day ? { ...d, enabled: !d.enabled } : d
                          )
                        )
                      }
                      className={`w-11 min-h-[44px] rounded-lg text-xs font-bold ${
                        day.enabled
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {day.day}
                    </button>
                    <input
                      type="time"
                      disabled={!day.enabled}
                      value={day.start}
                      onChange={(e) =>
                        setOperatingDays((prev) =>
                          prev.map((d) =>
                            d.day === day.day ? { ...d, start: e.target.value } : d
                          )
                        )
                      }
                      className="flex-1 min-w-[7rem] px-2 py-2 text-sm bg-white border border-slate-200 rounded-xl min-h-[44px] disabled:opacity-40"
                    />
                    <span className="text-xs text-slate-400">~</span>
                    <input
                      type="time"
                      disabled={!day.enabled}
                      value={day.end}
                      onChange={(e) =>
                        setOperatingDays((prev) =>
                          prev.map((d) =>
                            d.day === day.day ? { ...d, end: e.target.value } : d
                          )
                        )
                      }
                      className="flex-1 min-w-[7rem] px-2 py-2 text-sm bg-white border border-slate-200 rounded-xl min-h-[44px] disabled:opacity-40"
                    />
                  </li>
                ))}
              </ul>
              {footerNav({
                onNext: () => void handleHoursNext(),
                secondaryLabel: '나중에',
                onSecondary: goNext,
              })}
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                기본 수업 시간(분)입니다. 보강·일정 생성 시 기본값으로 쓰이며, 매일 수업을 등록하는 단계가
                아닙니다.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LESSON_DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setLessonMinutes(mins)}
                    className={`min-h-[44px] rounded-xl border-2 text-sm font-bold ${
                      lessonMinutes === mins
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {mins}분
                  </button>
                ))}
              </div>
              {footerNav({
                onNext: () => void handleLessonNext(),
              })}
            </div>
          )}

          {step === 3 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                월 수강료 기본값입니다. 교재 판매(일회성)와는 별도이며, 학생 등록 시 기본으로 채워집니다.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">기본 월 수강료</label>
                <CurrencyInput
                  value={billingForm.defaultTuitionFee}
                  onChange={(val) => setBillingForm({ ...billingForm, defaultTuitionFee: val })}
                  showQuickButtons
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">기본 결제일</label>
                <select
                  value={billingForm.defaultPaymentDay}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, defaultPaymentDay: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] font-bold"
                >
                  {[1, 5, 10, 15, 20, 25].map((d) => (
                    <option key={d} value={d}>
                      매월 {d}일
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  수납 계좌 안내 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 국민 123-456 (예금주: ○○학원)"
                  value={billingForm.bankAccount}
                  onChange={(e) => setBillingForm({ ...billingForm, bankAccount: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                />
              </div>
              {footerNav({
                onNext: () => void handleBillingNext(),
              })}
            </div>
          )}

          {step === 4 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                자주 쓰는 교재를 마스터에 등록해 두면 판매 시 가격이 자동 입력됩니다. 선택 단계이며, 판매
                중단은 교재 관리의 판매용 해제로 처리합니다.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-700">교재 정보</h5>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">교재 이름</label>
                  <input
                    type="text"
                    value={draftTextbook.title}
                    onChange={(e) =>
                      setDraftTextbook((prev) => ({ ...prev, title: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDraftTextbook();
                      }
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl min-h-[44px] placeholder:text-slate-300"
                    placeholder="예: 바이엘"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">가격</label>
                  <CurrencyInput
                    value={Number(draftTextbook.price) || 0}
                    onChange={(val) =>
                      setDraftTextbook((prev) => ({ ...prev, price: String(val) }))
                    }
                    placeholder="15,000"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addDraftTextbook}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 rounded-xl min-h-[44px] hover:bg-indigo-50"
                  >
                    <Plus className="w-4 h-4" /> 교재 추가
                  </button>
                </div>
              </div>

              {textbooks.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700">등록된 교재</h5>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    {textbooks.map((tb) => (
                      <li
                        key={tb.id}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white min-h-[44px]"
                      >
                        <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                          {tb.title}
                        </span>
                        <span className="text-sm tabular-nums text-slate-600 shrink-0">
                          {formatNumberWithCommas(Number(tb.price) || 0)}원
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTextbooks((prev) => prev.filter((t) => t.id !== tb.id))
                          }
                          className="p-2 text-rose-500 min-h-[44px] min-w-[44px] shrink-0"
                          aria-label={`${tb.title} 삭제`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {footerNav({
                onNext: handleSaveTextbooks,
                nextLabel: '등록하기',
                secondaryLabel: '나중에',
                onSecondary: goNext,
              })}
            </div>
          )}

          {step === 5 && (
            <div className="p-6 space-y-4">
              <OnboardingAttendanceChoice
                enabled={pinAttendanceEnabled}
                onChange={setPinAttendanceEnabled}
              />
              {footerNav({
                onNext: () => void handleAttendanceNext(),
              })}
            </div>
          )}

          {step === 6 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                상담 예약 가능 시간은 설정에서 관리합니다. QR·예약 화면은 그대로 사용하며, 이
                단계에서 새로 만들지 않습니다.
              </p>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <MessageSquareText className="w-4 h-4" />
                  상담 · 가능 시간
                </p>
                <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                  설정 → 부가 → 「상담 가능시간」에서 요일·시간대를 설정할 수 있습니다.
                </p>
              </div>
              {footerNav({
                onNext: goNext,
                nextLabel: '나중에',
                secondaryLabel: '설정',
                onSecondary: openConsultationSettings,
              })}
            </div>
          )}

          {step === 7 && (
            <div className="p-6 space-y-5 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <UserPlus className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">초기 설정이 준비되었습니다</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  이제 첫 학생을 등록하고 운영을 시작해 보세요. 강의실·정규 반은 설정·수업 메뉴에서
                  추가할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={finishToStudents}
                  className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px]"
                >
                  첫 학생 등록하기
                </button>
                <button
                  type="button"
                  onClick={finishToHome}
                  className="w-full py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[44px] inline-flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  홈으로
                </button>
              </div>
              <button
                type="button"
                onClick={goPrev}
                className="text-xs text-slate-400 hover:text-slate-600 min-h-[44px]"
              >
                이전 단계로
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
