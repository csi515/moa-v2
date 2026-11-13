import { useState, type FC, type FormEvent } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import {
  FormField,
  FORM_CONTROL_CLASS,
  SettingsCard,
} from '@/shared/components/ui';
import {
  type AcademySettings,
  type SessionPassPackage,
  DEFAULT_SESSION_PASS_PACKAGES,
} from '../settingsTypes';
import { Wallet, Save, Loader2, BookOpen, Plus, Trash2, Ticket } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import {
  getIndustryAccent,
  getCustomerLabel,
  getFeeLabel,
  getBankAccountPlaceholder,
  supportsDeposit as industrySupportsDeposit,
  showsTextbooksLink as industryShowsTextbooksLink,
} from '@/core/industry/industryUi';
import { renderStaffHoursFields } from '@/core/staff/staffUi';
import { useModuleLabels } from '@/core/labels';
import * as orgService from '@/core/organizations/services/organizationService';
import { buildWorkplaceSettingsSavePayload } from '../workplaceSettingsSave';
import { getConfiguredRooms } from '../utils/academyRooms';

export const BillingSettingsView: FC = () => {
  const { showToast, triggerRefresh, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const feeLabel = getFeeLabel(industry);
  const org = useOrganization();
  const depositSupported = industrySupportsDeposit(industry);
  const textbooksLinkVisible = industryShowsTextbooksLink(industry);
  const bankAccountPlaceholder = getBankAccountPlaceholder(industry);

  const accent = getIndustryAccent(industry);
  const accentBtn = `${accent.btn} ${accent.btnHover}`;
  const accentIcon = accent.icon;

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [isSaving, setIsSaving] = useState(false);

  const passPackages: SessionPassPackage[] =
    settings.sessionPassPackages && settings.sessionPassPackages.length > 0
      ? settings.sessionPassPackages
      : DEFAULT_SESSION_PASS_PACKAGES;

  const handleAddPackage = () => {
    const newPkg: SessionPassPackage = {
      id: `pkg-${Date.now()}`,
      name: `신규 이용권 (${passPackages.length + 1})`,
      sessions: 10,
      price: 200000,
    };
    setSettings({
      ...settings,
      sessionPassPackages: [...passPackages, newPkg],
    });
  };

  const handleUpdatePackage = (id: string, patch: Partial<SessionPassPackage>) => {
    const updated = passPackages.map((pkg) =>
      pkg.id === id ? { ...pkg, ...patch } : pkg
    );
    setSettings({
      ...settings,
      sessionPassPackages: updated,
    });
  };

  const handleDeletePackage = (id: string) => {
    if (passPackages.length <= 1) {
      showToast('최소 1개 이상의 회차권 상품이 필요합니다.', 'warning');
      return;
    }
    const updated = passPackages.filter((pkg) => pkg.id !== id);
    setSettings({
      ...settings,
      sessionPassPackages: updated,
    });
  };

  const handleSaveBillingSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const nextSettings: AcademySettings = {
        ...settings,
        sessionPassPackages: passPackages,
      };

      if (org.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          settings: buildWorkplaceSettingsSavePayload(nextSettings, {
            displayAddress: nextSettings.address || '',
            rooms: getConfiguredRooms(nextSettings),
          }),
        });
        await org.refreshOrganizations();
      }

      StorageService.saveSettings(nextSettings);
      setSettings(nextSettings);
      triggerRefresh();
      showToast(`${feeLabel} 및 수납 설정이 저장되었습니다.`, 'success');
    } catch (err) {
      showToast.error(err, '수납 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsCard
        className="sm:p-8"
        title={`${feeLabel} 및 수납 기본 정책`}
        icon={<Wallet className={`w-4 h-4 ${accentIcon}`} />}
      >
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          신규 {customerLabel} 등록 시 기본으로 적용되는 수강료 금액, 정기 결제일 및 청구서에 표기될 수납 계좌 정보를 설정합니다.
        </p>

        <form onSubmit={handleSaveBillingSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="기본 수강 형태">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'monthly' as const, label: '월회비', hint: '매월 정기 청구' },
                    { value: 'session_pass' as const, label: '회차권', hint: '출석 시 1회 차감' },
                  ] as const
                ).map((opt) => {
                  const active =
                    (settings.defaultBillingMode || 'monthly') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, defaultBillingMode: opt.value })
                      }
                      className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? `${accent.btn} text-white border-transparent`
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <span className="block text-sm font-bold">{opt.label}</span>
                      <span
                        className={`block text-[10px] mt-0.5 ${
                          active ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormField>

            {(settings.defaultBillingMode || 'monthly') === 'monthly' ? (
              <FormField label={`기본 월 ${feeLabel}`}>
                <CurrencyInput
                  value={settings.defaultTuitionFee}
                  onChange={(val) =>
                    setSettings({ ...settings, defaultTuitionFee: val })
                  }
                  showQuickButtons
                />
              </FormField>
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                <Ticket className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-900 block">회차권(이용권) 모드 활성화</span>
                  신규 {customerLabel} 등록 시 회차권 모드로 시작하며, 하단의 회차권 패키지 가격을 기준으로 이용권이 발급됩니다.
                </div>
              </div>
            )}
          </div>

          {(settings.defaultBillingMode || 'monthly') === 'monthly' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField label="기본 정기 결제일">
                <select
                  value={settings.defaultPaymentDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultPaymentDay: Number(e.target.value),
                    })
                  }
                  className={`${FORM_CONTROL_CLASS} font-bold`}
                >
                  <option value={1}>매월 1일</option>
                  <option value={5}>매월 5일</option>
                  <option value={10}>매월 10일</option>
                  <option value={15}>매월 15일</option>
                  <option value={20}>매월 20일</option>
                  <option value={25}>매월 25일</option>
                </select>
              </FormField>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={settings.includeExtrasInMonthlyInvoice === true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        includeExtrasInMonthlyInvoice: e.target.checked,
                      })
                    }
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">
                      월 청구에 교재·연주회비 합산
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      켜면 월회비 청구서 생성 시 미납 교재비와 해당 월 연주회·콩쿠르
                      참가비를 함께 청구합니다. 끄면 교재는 기존처럼 별도 판매·수납합니다.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-[11px] text-slate-500 leading-relaxed">
              회차권 모드에서는 월 청구·결제일·교재 합산 옵션을 쓰지 않으며, 출석 시 회차권에서 1회가 차감됩니다.
            </div>
          )}

          {/* 회차권(이용권) 상품 및 가격 설정 섹션 */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-indigo-600" />
                  <span>회차권(이용권) 상품 및 가격 설정</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({passPackages.length}개 상품)
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  이용권 발급 시 선택할 수 있는 표준 패키지(수업 횟수 및 판매 금액)를 설정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPackage}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>상품 추가</span>
              </button>
            </div>

            <div className="space-y-2">
              {passPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl"
                >
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      상품명
                    </label>
                    <input
                      type="text"
                      placeholder="예: 1:1 레슨 4회권"
                      value={pkg.name}
                      onChange={(e) => handleUpdatePackage(pkg.id, { name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <div className="w-full sm:w-28 shrink-0">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      이용 횟수
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={pkg.sessions}
                        onChange={(e) =>
                          handleUpdatePackage(pkg.id, {
                            sessions: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        회
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-48 shrink-0">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      판매 금액
                    </label>
                    <CurrencyInput
                      value={pkg.price}
                      onChange={(val) => handleUpdatePackage(pkg.id, { price: val })}
                      className="text-xs"
                    />
                  </div>
                  <div className="sm:self-end pb-0.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id)}
                      title="상품 삭제"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <FormField label="수납용 계좌번호 안내 (영수증 및 청구서에 표기)">
              <input
                type="text"
                placeholder={bankAccountPlaceholder}
                value={typeof settings.bankAccount === 'string' ? settings.bankAccount : ''}
                onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
          </div>

          {depositSupported && (
            <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={settings.depositEnabled === true}
                  onChange={(e) =>
                    setSettings({ ...settings, depositEnabled: e.target.checked })
                  }
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">예약금 받기</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    켜면 고객 신청 시 계좌이체와 QR을 보여 줍니다. 끄면 신청만 받습니다.
                  </span>
                </span>
              </label>
              {settings.depositEnabled && (
                <FormField label="예약금 금액">
                  <input
                    type="number"
                    min={0}
                    value={settings.depositAmount ?? 0}
                    onChange={(e) =>
                      setSettings({ ...settings, depositAmount: Number(e.target.value) || 0 })
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </FormField>
              )}
              {renderStaffHoursFields({
                teachers: StorageService.getTeachers().filter((t) => t.status === 'active'),
                windows: settings.staffHours || [],
                onChange: (staffHours) => setSettings({ ...settings, staffHours }),
              })}
            </div>
          )}

          {textbooksLinkVisible && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('textbooks')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 min-h-[44px]"
              >
                <BookOpen className="w-4 h-4" />
                사용 교재 및 판매가는 교재 관리에서 설정
              </button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2.5 min-h-[44px] ${accentBtn} disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? '저장 중…' : '수납 설정 저장'}
            </button>
          </div>
        </form>
      </SettingsCard>
    </div>
  );
};
