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
import { Wallet, Save, Loader2, BookOpen, Plus, Trash2, Ticket, Check } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import {
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

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings() ?? ({} as AcademySettings));
  const [isSaving, setIsSaving] = useState(false);

  // 계좌번호 [은행명 / 계좌번호 / 예금주] 3분할 입력 상태
  const [bankInfo, setBankInfo] = useState<{
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  }>(() => {
    const raw = typeof settings?.bankAccount === 'string' ? settings.bankAccount.trim() : '';
    if (!raw) return { bankName: '', accountNumber: '', accountHolder: '' };

    const match = raw.match(/^([^\d]+)?\s*([0-9-]+)\s*(?:\(([^)]+)\)|(.*))?$/);
    if (match) {
      return {
        bankName: (match[1] || '').trim(),
        accountNumber: (match[2] || '').trim(),
        accountHolder: (match[3] || match[4] || '').trim(),
      };
    }
    const parts = raw.split(/\s+/).filter(Boolean);
    return {
      bankName: parts[0] || '',
      accountNumber: parts[1] || '',
      accountHolder: parts.slice(2).join(' ').replace(/[()]/g, '').trim(),
    };
  });

  const handleBankFieldChange = (
    field: 'bankName' | 'accountNumber' | 'accountHolder',
    val: string
  ) => {
    const next = { ...bankInfo, [field]: val };
    setBankInfo(next);
    const formatted = [
      next.bankName,
      next.accountNumber,
      next.accountHolder ? `(${next.accountHolder})` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    setSettings((prev) => ({ ...prev, bankAccount: formatted }));
  };

  const passPackages: SessionPassPackage[] =
    Array.isArray(settings?.sessionPassPackages) && settings.sessionPassPackages.length > 0
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
        icon={<Wallet className="w-4 h-4 text-slate-700" />}
      >
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          신규 {customerLabel} 등록 시 기본 적용되는 수강 형태, 정기 결제일 및 청구서에 표기될 수납 계좌 정보를 설정합니다.
        </p>

        <form onSubmit={handleSaveBillingSettings} className="space-y-6">
          {/* 1. 기본 수강 형태 및 월 수강료 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="기본 수강 형태">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'monthly' as const, label: '월회비', hint: '매월 정기 청구' },
                    { value: 'session_pass' as const, label: '회차권', hint: '출석 시 1회 차감' },
                  ] as const
                ).map((opt) => {
                  const active = (settings.defaultBillingMode || 'monthly') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, defaultBillingMode: opt.value })
                      }
                      className={`relative min-h-[56px] rounded-lg border p-3 text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-50/80 border-slate-900 border-[1.5px] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`block text-xs sm:text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        {active && (
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] mt-0.5 text-slate-500">
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
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                <Ticket className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">회차권(이용권) 모드 활성화</span>
                  신규 {customerLabel} 등록 시 회차권 모드로 시작하며, 하단의 회차권 패키지 가격을 기준으로 이용권이 발급됩니다.
                </div>
              </div>
            )}
          </div>

          {/* 2. 결제일 및 청구 옵션 */}
          {(settings.defaultBillingMode || 'monthly') === 'monthly' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <FormField label="기본 정기 결제일">
                <select
                  value={settings.defaultPaymentDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultPaymentDay: Number(e.target.value),
                    })
                  }
                  className={`${FORM_CONTROL_CLASS} font-bold h-10`}
                >
                  <option value={1}>매월 1일</option>
                  <option value={5}>매월 5일</option>
                  <option value={10}>매월 10일</option>
                  <option value={15}>매월 15일</option>
                  <option value={20}>매월 20일</option>
                  <option value={25}>매월 25일</option>
                </select>
              </FormField>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="includeExtras"
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  checked={settings.includeExtrasInMonthlyInvoice === true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      includeExtrasInMonthlyInvoice: e.target.checked,
                    })
                  }
                />
                <label htmlFor="includeExtras" className="cursor-pointer">
                  <span className="block text-xs font-bold text-slate-800">
                    월 청구에 교재·연주회비 합산 청구
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    월회비 청구서 생성 시 미납된 교재비 및 행사 참가비를 청구서에 함께 포함합니다.
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-500 leading-relaxed">
              회차권 모드에서는 정기 결제일 및 교재 합산 청구 옵션을 사용하지 않으며, 출결 시 이용권 1회가 자동 차감됩니다.
            </div>
          )}

          {/* 3. 회차권(이용권) 상품 및 가격 설정 리스트 */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-slate-700" />
                  <span>회차권(이용권) 상품 및 가격 설정</span>
                  <span className="text-xs font-normal text-slate-400">
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
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>상품 추가</span>
              </button>
            </div>

            {/* 테이블/리스트 압축 구조 */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <div className="flex-1">상품명</div>
                <div className="w-28 shrink-0">이용 횟수</div>
                <div className="w-44 shrink-0">판매 금액</div>
                <div className="w-10 shrink-0 text-center">삭제</div>
              </div>

              <div className="divide-y divide-slate-100">
                {passPackages.map((pkg, idx) => (
                  <div
                    key={pkg.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-1">
                        상품명
                      </span>
                      <input
                        type="text"
                        placeholder="예: 1:1 레슨 4회권"
                        value={pkg.name}
                        onChange={(e) =>
                          handleUpdatePackage(pkg.id, { name: e.target.value })
                        }
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>
                    <div className="w-full sm:w-28 shrink-0">
                      <span className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-1">
                        이용 횟수
                      </span>
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
                          className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg pr-7 focus:outline-none focus:border-slate-900 font-bold"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                          회
                        </span>
                      </div>
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                      <span className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-1">
                        판매 금액
                      </span>
                      <CurrencyInput
                        value={pkg.price}
                        onChange={(val) => handleUpdatePackage(pkg.id, { price: val })}
                        className="text-xs"
                      />
                    </div>
                    <div className="sm:w-10 shrink-0 flex sm:justify-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg.id)}
                        title="상품 삭제"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 수납용 계좌번호 안내 (3열 분할) */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-0.5">
                수납용 계좌번호 안내 <span className="text-[11px] font-normal text-slate-400">(청구서 및 영수증 자동 표기)</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                고객이 수강료를 이체할 은행 계좌 정보를 입력해 주세요.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 max-w-2xl">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="은행명 (예: 국민은행)"
                  value={bankInfo.bankName}
                  onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                  className={`${FORM_CONTROL_CLASS} h-10`}
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="계좌번호 (- 포함)"
                  value={bankInfo.accountNumber}
                  onChange={(e) => handleBankFieldChange('accountNumber', e.target.value)}
                  className={`${FORM_CONTROL_CLASS} h-10 font-mono`}
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="예금주 (선택)"
                  value={bankInfo.accountHolder}
                  onChange={(e) => handleBankFieldChange('accountHolder', e.target.value)}
                  className={`${FORM_CONTROL_CLASS} h-10`}
                />
              </div>
            </div>
          </div>

          {/* 5. 예약금 (지원 업종) */}
          {depositSupported && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={settings.depositEnabled === true}
                  onChange={(e) =>
                    setSettings({ ...settings, depositEnabled: e.target.checked })
                  }
                />
                <span>
                  <span className="block text-xs sm:text-sm font-bold text-slate-800">예약금 받기</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    활성화 시 온라인 예약 신청 고객에게 계좌이체 안내를 자동으로 표시합니다.
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
                    className={`${FORM_CONTROL_CLASS} h-10 max-w-xs`}
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

          {/* 6. 교재 판매가 안내 링크 */}
          {textbooksLinkVisible && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('textbooks')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline min-h-[36px]"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                사용 교재 및 판매가는 교재 관리에서 설정
              </button>
            </div>
          )}

          {/* 7. 하단 설정 저장 버튼 */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
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

export default BillingSettingsView;
