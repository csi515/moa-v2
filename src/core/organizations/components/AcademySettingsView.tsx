import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import {
  FormField,
  FORM_CONTROL_CLASS,
  SettingsCard,
} from '@/shared/components/ui';
import { AcademySettings } from '@/types';
import {
  AttendanceFeatureToggle,
  isAttendanceModuleEnabled,
  PIN_ATTENDANCE_DIRECTOR_COPY,
  withAttendanceModuleEnabled,
} from '@/core/attendance';
import { IndustryFeatureGuidePanel } from '@/core/help';
import { LegalLinks } from '@/core/legal';
import {
  Settings,
  Building,
  Save,
  Loader2,
  Trash2,
  DoorOpen,
  Plus,
  BookOpen,
} from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { getIndustryAccent, getCustomerLabel, getOwnerLabel, getPlaceLabel, isSkinClinicIndustry } from '@/core/industry/industryUi';
import { renderAcademyStaffHoursFields } from '@/core/staff/staffUi';
import { useModuleLabels } from '@/core/labels';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  ACADEMY_ROOM_KIND_LABEL,
  createAcademyRoom,
  getConfiguredRooms,
} from '../utils/academyRooms';
import type { AcademyRoomKind } from '@/types';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';
import {
  OrganizationProfileFields,
  OrganizationBackupCard,
  OrganizationDangerZoneCard,
} from './OrganizationSettingsView';

export const AcademySettingsView: FC = () => {
  const { showToast, triggerRefresh, setActiveTab } = useApp();
  const { industry, isAdmin } = usePermissions();
  const labels = useModuleLabels();
  const skin = isSkinClinicIndustry(industry);
  const placeLabel = getPlaceLabel(industry);
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const contactLabel = labels.contact.singular;
  const ownerLabel = getOwnerLabel(industry);
  const feeLabel = industry === 'skin_clinic' ? '이용료' : industry === 'daycare' ? '보육료' : '수강료';
  const staffLabel = labels.staff.singular;
  const org = useOrganization();

  const accent = getIndustryAccent(industry);
  const accentBtn = `${accent.btn} ${accent.btnHover}`;
  const accentIcon = accent.icon;
  const accentHover = accent.hoverBg;

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(() => {
    const saved = StorageService.getSettings();
    const existing = (saved.address || '').trim();
    return existing
      ? { ...EMPTY_ORGANIZATION_ADDRESS, roadAddress: existing }
      : EMPTY_ORGANIZATION_ADDRESS;
  });
  const [isSaving, setIsSaving] = useState(false);
  const attendanceEnabled = isAttendanceModuleEnabled(settings, industry);
  const rooms = getConfiguredRooms(settings);
  const canEditAttendanceMode = isAdmin;

  useEffect(() => {
    const result = StorageService.backfillAttendanceFeatureFlag();
    if (result.changed) {
      setSettings(StorageService.getSettings());
      triggerRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const orgId = org.currentOrganization?.id;
    if (!orgId) return;

    let cancelled = false;
    void (async () => {
      try {
        const loaded = await orgService.fetchOrganizationAddress(orgId);
        if (cancelled) return;
        const roadAddress =
          loaded.roadAddress.trim() || loaded.legacyAddress.trim() || '';
        setAddressParts({
          roadAddress,
          addressDetail: loaded.addressDetail,
          postal: loaded.postal,
          sido: loaded.sido,
          sigungu: loaded.sigungu,
          dong: loaded.dong,
          jibun: loaded.jibun,
        });
        if (roadAddress || loaded.addressDetail) {
          setSettings((prev) => ({
            ...prev,
            address:
              formatOrganizationAddress({
                roadAddress,
                addressDetail: loaded.addressDetail,
              }) ||
              loaded.legacyAddress ||
              prev.address,
          }));
        }
      } catch {
        // 로컬 설정 유지
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org.currentOrganization?.id]);

  const updateRoom = (id: string, patch: { name?: string; kind?: AcademyRoomKind }) => {
    setSettings({
      ...settings,
      rooms: rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const skinRooms = isSkinClinicIndustry(industry);
  const addRoom = () => {
    setSettings({
      ...settings,
      rooms: [
        ...rooms,
        createAcademyRoom({
          name: skinRooms ? `관리실 ${rooms.length + 1}` : `강의실 ${rooms.length + 1}`,
          kind: skinRooms ? 'treatment' : 'classroom',
        }),
      ],
    });
  };

  const removeRoom = (id: string) => {
    setSettings({
      ...settings,
      rooms: rooms.filter((r) => r.id !== id),
    });
  };

  /** PIN 출결 토글은 즉시 저장 — 저장 전 키오스크 진입 시 꺼진 것으로 보이는 문제 방지 */
  const handleAttendanceToggle = async (enabled: boolean) => {
    if (!canEditAttendanceMode) return;
    const previous = settings;
    const next = withAttendanceModuleEnabled(settings, enabled);
    setSettings(next);
    try {
      StorageService.saveSettings(next);
      if (org.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          settings: { features: next.features },
        });
      }
      triggerRefresh();
      showToast(
        enabled
          ? PIN_ATTENDANCE_DIRECTOR_COPY.settingsEnabledToast
          : PIN_ATTENDANCE_DIRECTOR_COPY.settingsDisabledToast,
        'success'
      );
    } catch (err) {
      setSettings(previous);
      showToast(
        err instanceof Error ? err.message : '출결 설정 저장 중 오류가 발생했습니다.',
        'error'
      );
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const displayAddress =
        formatOrganizationAddress(addressParts) || settings.address || '';
      const nextSettings = {
        ...settings,
        address: displayAddress,
        rooms: getConfiguredRooms(settings),
      };
      StorageService.saveSettings(nextSettings);
      
      if (org.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          name: settings.name,
          addressParts,
          settings: {
            name: settings.name,
            directorName: settings.directorName,
            phone: settings.phone,
            businessNumber: settings.businessNumber,
            address: displayAddress,
            defaultTuitionFee: settings.defaultTuitionFee,
            defaultPaymentDay: settings.defaultPaymentDay,
            bankAccount: settings.bankAccount,
            depositEnabled: settings.depositEnabled,
            depositAmount: settings.depositAmount,
            staffHours: settings.staffHours,
            features: settings.features,
            rooms: getConfiguredRooms(settings),
            retailCatalog: settings.retailCatalog,
            skinRetailCoreMigratedAt: settings.skinRetailCoreMigratedAt,
          },
        });

        org.patchOrganization(org.currentOrganization.id, { name: settings.name });
        await org.refreshOrganizations();
      }
      
      setSettings(nextSettings);
      triggerRefresh();
      showToast('사업장 설정이 저장되었습니다.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : '설정 저장 중 오류가 발생했습니다.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Settings className="w-6 h-6" />}
        iconClassName={accentIcon}
        title="사업장 운영 및 환경 설정"
        description="기본 정보, 출입 관리, 백업, 업종별 기능 설명서"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SettingsCard
          className="lg:col-span-2 sm:p-8"
          title={`${placeLabel} 기본 프로필`}
          icon={<Building className={`w-4 h-4 ${accentIcon}`} />}
        >
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <OrganizationProfileFields
              name={settings.name}
              directorName={settings.directorName || ''}
              phone={settings.phone}
              businessNumber={settings.businessNumber || ''}
              addressParts={addressParts}
              placeLabel={placeLabel}
              ownerLabel={ownerLabel}
              contactLabel={contactLabel}
              publicCode={org.currentOrganization?.public_code}
              onProfileChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onAddressChange={(next) => {
                setAddressParts(next);
                setSettings((prev) => ({
                  ...prev,
                  address: formatOrganizationAddress(next) || prev.address,
                }));
              }}
            />

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="기본 수강 형태">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: 'monthly' as const, label: '월회비', hint: '매월 청구' },
                        { value: 'session_pass' as const, label: '회차권', hint: '출석 시 차감' },
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
                  <FormField label="기본 월 수강료 기준 (₩)">
                    <CurrencyInput
                      value={settings.defaultTuitionFee}
                      onChange={(val) =>
                        setSettings({ ...settings, defaultTuitionFee: val })
                      }
                      showQuickButtons
                    />
                  </FormField>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
                    신규 {customerLabel}은(는) 회차권 형태로 등록됩니다. 월 수강료·결제일은
                    사용하지 않으며, 설정 &gt; 회차권 관리에서 이용권을 발급하세요.
                  </div>
                )}
              </div>

              {(settings.defaultBillingMode || 'monthly') === 'monthly' ? (
                <>
                  <FormField label="기본 결제일" className="sm:max-w-xs">
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
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-[11px] text-slate-500 leading-relaxed">
                  회차권 모드에서는 월 청구·결제일·교재 합산 옵션을 쓰지 않습니다. 출석
                  시 회차권에서 1회가 차감됩니다.
                </div>
              )}
            </div>

            {skin && (
              <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
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
                {renderAcademyStaffHoursFields({
                  teachers: StorageService.getTeachers().filter((t) => t.status === 'active'),
                  windows: settings.staffHours || [],
                  onChange: (staffHours) => setSettings({ ...settings, staffHours }),
                })}
              </div>
            )}

            <FormField label="수납용 계좌번호 안내 (영수증 및 청구서에 표기)">
              <input
                type="text"
                placeholder={
                  skin
                    ? '예: 국민은행 123456-04-123456 (예금주: 샵 이름)'
                    : '예: 국민은행 123456-04-123456 (예금주: 선율음악학원)'
                }
                value={typeof settings.bankAccount === 'string' ? settings.bankAccount : ''}
                onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DoorOpen className={`w-4 h-4 ${accentIcon}`} />
                  <p className="text-sm font-bold text-slate-800">{skinRooms ? '관리실' : '강의실 · 연습실'}</p>
                </div>
                <button
                  type="button"
                  onClick={addRoom}
                  className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-bold rounded-xl ${accent.hoverBg} ${accentIcon}`}
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {skinRooms
                  ? '예약 시 배정할 관리실 이름을 등록해 주세요.'
                  : '반 개설·보강 예약 시 선택할 공간입니다. 학원에서 쓰는 실 이름을 등록해 주세요.'}
              </p>
              {rooms.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  등록된 실이 없습니다. 추가하거나 온보딩에서 설정해 주세요.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rooms.map((room) => (
                    <li
                      key={room.id}
                      className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"
                    >
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                        className={`${FORM_CONTROL_CLASS} flex-1 min-h-[44px]`}
                        placeholder={skinRooms ? '예: 1번 관리실' : '예: 피아노 1실'}
                      />
                      <select
                        value={room.kind}
                        onChange={(e) =>
                          updateRoom(room.id, { kind: e.target.value as AcademyRoomKind })
                        }
                        className={`${FORM_CONTROL_CLASS} sm:w-32 min-h-[44px]`}
                      >
                        {skinRooms ? (
                          <option value="treatment">{ACADEMY_ROOM_KIND_LABEL.treatment}</option>
                        ) : (
                          <>
                            <option value="classroom">{ACADEMY_ROOM_KIND_LABEL.classroom}</option>
                            <option value="practice">{ACADEMY_ROOM_KIND_LABEL.practice}</option>
                          </>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="p-2.5 min-h-[44px] min-w-[44px] text-rose-500 hover:bg-rose-50 rounded-xl"
                        aria-label={`${room.name} 삭제`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {industry === 'piano' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('textbooks')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 min-h-[44px]"
                >
                  <BookOpen className="w-4 h-4" />
                  사용 교재는 교재 관리에서 등록
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <AttendanceFeatureToggle
                enabled={attendanceEnabled}
                onChange={(enabled) => {
                  void handleAttendanceToggle(enabled);
                }}
                activeClassName={accent.btn}
                iconClassName={accentIcon}
                canEdit={canEditAttendanceMode}
              />
              {attendanceEnabled && (
                <a
                  href="/attendance-kiosk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-xs font-bold min-h-[44px] ${accentIcon}`}
                >
                  <DoorOpen className="w-4 h-4" />
                  출석 키오스크 열기
                </a>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2.5 min-h-[44px] ${accentBtn} disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? '저장 중…' : '설정 정보 저장'}
              </button>
            </div>
          </form>
        </SettingsCard>

        <div className="space-y-6">
          <OrganizationBackupCard
            placeLabel={placeLabel}
            customerLabel={customerLabel}
            feeLabel={feeLabel}
            accentIcon={accentIcon}
            accentHover={accentHover}
          />

          <div className="pt-2 pb-4">
            <p className="text-xs text-slate-500 text-center mb-2">
              계정 탈퇴는 <strong>내 계정</strong> 메뉴에서 진행할 수 있습니다.
            </p>
            <LegalLinks className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500" />
          </div>

          <OrganizationDangerZoneCard
            customerLabel={customerLabel}
            contactLabel={contactLabel}
            feeLabel={feeLabel}
            staffLabel={staffLabel}
            isSkin={skin}
          />
        </div>
      </div>

      <IndustryFeatureGuidePanel industry={industry} />
    </div>
  );
};
