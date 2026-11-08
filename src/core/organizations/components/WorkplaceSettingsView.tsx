import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import {
  FORM_CONTROL_CLASS,
  SettingsCard,
} from '@/shared/components/ui';
import type { AcademySettings, AcademyRoomKind } from '../settingsTypes';
import { IndustryFeatureGuidePanel } from '@/core/help';
import {
  Building,
  Save,
  Loader2,
  Trash2,
  DoorOpen,
  Plus,
  BookOpen,
} from 'lucide-react';
import {
  getIndustryAccent,
  getCustomerLabel,
  getOwnerLabel,
  getPlaceLabel,
  getFeeLabel,
  showsTextbooksLink as industryShowsTextbooksLink,
  getRoomConfig,
} from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  ROOM_KIND_LABEL,
  createRoom,
  getConfiguredRooms,
} from '../utils/academyRooms';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';
import {
  OrganizationProfileFields,
  DataExportCenterCard,
  OrganizationBackupCard,
  OrganizationDangerZoneCard,
} from './OrganizationSettingsCards';
import { LegalLinks } from '@/core/legal';
import { buildWorkplaceSettingsSavePayload } from '../workplaceSettingsSave';

export const WorkplaceSettingsView: FC = () => {
  const { showToast, triggerRefresh, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const placeLabel = getPlaceLabel(industry);
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const contactLabel = labels.contact.singular;
  const staffLabel = labels.staff.singular;
  const ownerLabel = getOwnerLabel(industry);
  const feeLabel = getFeeLabel(industry);
  const org = useOrganization();
  const roomCfg = getRoomConfig(industry);
  const textbooksLinkVisible = industryShowsTextbooksLink(industry);

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
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // 설정 원본 스냅샷 기록 (isDirty 추적용)
  useEffect(() => {
    if (!initialSnapshot) {
      setInitialSnapshot(JSON.stringify({ settings, addressParts }));
    }
  }, [settings, addressParts, initialSnapshot]);

  const isDirty = Boolean(initialSnapshot) && JSON.stringify({ settings, addressParts }) !== initialSnapshot;

  const handleResetSettings = () => {
    if (!initialSnapshot) return;
    try {
      const parsed = JSON.parse(initialSnapshot);
      setSettings(parsed.settings);
      setAddressParts(parsed.addressParts);
      showToast('설정 변경 사항을 원래대로 되돌렸습니다.', 'info');
    } catch {
      // ignore
    }
  };
  const rooms = getConfiguredRooms(settings);

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

  const addRoom = () => {
    setSettings({
      ...settings,
      rooms: [
        ...rooms,
        createRoom({
          name: `${roomCfg.defaultPrefix} ${rooms.length + 1}`,
          kind: roomCfg.defaultKind,
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

      if (org.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          name: settings.name,
          addressParts,
          settings: buildWorkplaceSettingsSavePayload(settings, {
            displayAddress,
            rooms: getConfiguredRooms(settings),
          }),
        });

        org.patchOrganization(org.currentOrganization.id, { name: settings.name });
        await org.refreshOrganizations();
      }

      StorageService.saveSettings(nextSettings);
      setSettings(nextSettings);
      setInitialSnapshot(JSON.stringify({ settings: nextSettings, addressParts }));
      triggerRefresh();
      showToast(`${placeLabel} 기본 정보가 저장되었습니다.`, 'success');
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
    <div className="space-y-6 max-w-4xl">
      <SettingsCard
        className="sm:p-8"
        title={`${placeLabel} 기본 정보 및 시설(연습실) 관리`}
        icon={<Building className={`w-4 h-4 ${accentIcon}`} />}
      >
        <div className="mb-6 pb-4 border-b border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">
            {placeLabel} 상호명, 대표자, 연락처, 주소 및 시설 내 강의실·피아노 연습실(공실)을 등록하고 관리합니다.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
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

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DoorOpen className={`w-4 h-4 ${accentIcon}`} />
                <p className="text-sm font-bold text-slate-800">{roomCfg.sectionTitle}</p>
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
              {roomCfg.sectionDescription}
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
                      placeholder={roomCfg.placeholder}
                    />
                    <select
                      value={room.kind}
                      onChange={(e) =>
                        updateRoom(room.id, { kind: e.target.value as AcademyRoomKind })
                      }
                      className={`${FORM_CONTROL_CLASS} sm:w-32 min-h-[44px]`}
                    >
                      {(roomCfg.allowedKinds as string[]).includes('treatment') && (
                        <option value="treatment">{ROOM_KIND_LABEL.treatment}</option>
                      )}
                      {(roomCfg.allowedKinds as string[]).includes('classroom') && (
                        <option value="classroom">{ROOM_KIND_LABEL.classroom}</option>
                      )}
                      {(roomCfg.allowedKinds as string[]).includes('practice') && (
                        <option value="practice">{ROOM_KIND_LABEL.practice}</option>
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
            {textbooksLinkVisible && (
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

          <div className="flex justify-end pt-4 border-t border-slate-100">
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

      {/* 2. 원생·출결·수납 엑셀(CSV) 통합 다운로드 센터 */}
      <DataExportCenterCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
      />

      {/* 3. 데이터 안전 백업 및 복원 */}
      <OrganizationBackupCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
        accentIcon={accentIcon}
        accentHover={accentHover}
      />

      {/* 4. 업종별 가이드 패널 */}
      <IndustryFeatureGuidePanel industry={industry} />

{/* 변경 사항 감지 시 떠오르는 모던 스티키 플로팅 저장 바 */}
      {isDirty && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                저장되지 않은 설정 변경사항이 있습니다
              </p>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                페이지를 이탈하기 전에 설정을 저장해 주세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetSettings}
              disabled={isSaving}
              className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveSettings(e as any)}
              disabled={isSaving}
              className={`px-4 sm:px-5 py-2 min-h-[38px] ${accentBtn} text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? '저장 중…' : '지금 저장'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. 학원 데이터 초기화 위험 구역 및 법적 안내 */}
      <div className="pt-2">
        <OrganizationDangerZoneCard
          customerLabel={customerLabel}
          contactLabel={contactLabel}
          feeLabel={feeLabel}
          staffLabel={staffLabel}
        />

        <div className="pt-4 pb-2">
          <p className="text-xs text-slate-400 text-center mb-2">
            계정 탈퇴는 <strong>내 계정</strong> 메뉴에서 진행할 수 있습니다.
          </p>
          <LegalLinks className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-400" />
        </div>
      </div>
    </div>
  );
};

/** @deprecated Use WorkplaceSettingsView */
export const AcademySettingsView: FC = WorkplaceSettingsView;

export default WorkplaceSettingsView;
