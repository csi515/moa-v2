import { useRef, useState, type ChangeEvent, type FC } from 'react';
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
  Download,
  Upload,
  ShieldCheck,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  OrganizationAddressFields,
  type OrganizationAddressValue,
} from '@/core/address';
import { getDangerZoneSessionLabel } from '@/core/industry/industryUi';

export interface OrganizationBasicProfile {
  name: string;
  directorName: string;
  phone: string;
  businessNumber: string;
}

export interface OrganizationProfileFieldsProps {
  name: string;
  directorName: string;
  phone: string;
  businessNumber: string;
  addressParts: OrganizationAddressValue;
  placeLabel?: string;
  ownerLabel?: string;
  contactLabel?: string;
  publicCode?: string | null;
  onProfileChange: (patch: Partial<OrganizationBasicProfile>) => void;
  onAddressChange: (next: OrganizationAddressValue) => void;
}

/**
 * Core Organization: 사업장/조직 기본 정보 입력 필드 모음
 * (조직명, 대표자, 전화번호, 사업자등록번호, 주소, 연결코드)
 */
export const OrganizationProfileFields: FC<OrganizationProfileFieldsProps> = ({
  name,
  directorName,
  phone,
  businessNumber,
  addressParts,
  placeLabel = '사업장',
  ownerLabel = '대표자',
  contactLabel = '고객',
  publicCode,
  onProfileChange,
  onAddressChange,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={`${placeLabel}명`} required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onProfileChange({ name: e.target.value })}
            className={`${FORM_CONTROL_CLASS} font-bold`}
          />
        </FormField>

        <FormField label={`${ownerLabel}님 성명`} required>
          <input
            type="text"
            required
            value={directorName}
            onChange={(e) => onProfileChange({ directorName: e.target.value })}
            className={`${FORM_CONTROL_CLASS} font-bold`}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={`${placeLabel} 대표 전화번호`} required>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => onProfileChange({ phone: e.target.value })}
            className={`${FORM_CONTROL_CLASS} font-mono`}
          />
        </FormField>

        <FormField label="사업자 등록번호 (선택)">
          <input
            type="text"
            value={businessNumber}
            onChange={(e) => onProfileChange({ businessNumber: e.target.value })}
            className={`${FORM_CONTROL_CLASS} font-mono`}
          />
        </FormField>
      </div>

      <OrganizationAddressFields
        value={addressParts}
        onChange={onAddressChange}
        label={`${placeLabel} 소재지 주소`}
      />

      {/* 학부모 자가 연결 미사용 단계: 연결코드 배너 UI 임시 숨김
      {publicCode && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
          <p className="text-xs font-bold text-indigo-900">{contactLabel} {placeLabel} 연결코드</p>
          <p className="font-mono text-lg font-black tracking-widest text-indigo-700">
            {publicCode}
          </p>
          <p className="text-xs text-indigo-800/80 leading-relaxed">
            {contactLabel}가 검색·공개 페이지에서 이 코드로 {placeLabel}을 찾아 연결을 요청할 수 있습니다.
            자동 연결되지 않으며, 등록 요청 승인 후 연결됩니다.
          </p>
          <a
            href={`/c/${publicCode}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-bold text-indigo-600 hover:underline min-h-[44px]"
          >
            공개 페이지 열기 (코드 {publicCode})
          </a>
        </div>
      )}
      */}
    </>
  );
};

export interface OrganizationBackupCardProps {
  placeLabel?: string;
  customerLabel?: string;
  feeLabel?: string;
  accentIcon?: string;
  accentHover?: string;
}

/**
 * Core Organization: 조직 데이터 백업 및 복원 카드
 */
export const OrganizationBackupCard: FC<OrganizationBackupCardProps> = ({
  placeLabel = '사업장',
  customerLabel = '고객',
  feeLabel = '이용료',
  accentIcon = 'text-indigo-600',
  accentHover = 'hover:bg-indigo-50/60',
}) => {
  const { showToast, openConfirmDialog } = useApp();
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const pendingImportRef = useRef<File | null>(null);

  const handleExportData = () => {
    const data = StorageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organization_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${placeLabel} 전체 데이터 백업 파일이 다운로드되었습니다.`, 'success');
  };

  const runImport = (file: File) => {
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = StorageService.importAllData(content);
        if (success) {
          showToast('데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          showToast('유효하지 않은 백업 파일 형식입니다.', 'error');
        }
      } catch {
        showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
      } finally {
        setIsImporting(false);
        pendingImportRef.current = null;
      }
    };
    reader.onerror = () => {
      showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
      setIsImporting(false);
      pendingImportRef.current = null;
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    pendingImportRef.current = file;
    openConfirmDialog({
      title: '백업 파일 복원',
      message:
        '현재 저장된 모든 데이터가 백업 파일 내용으로 교체됩니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
      isDestructive: true,
      confirmText: '복원',
      onConfirm: () => {
        const pending = pendingImportRef.current;
        if (pending) runImport(pending);
      },
      onCancel: () => {
        pendingImportRef.current = null;
      },
    });
  };

  return (
    <SettingsCard
      title="데이터 안전 백업 및 복원"
      icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
    >
      <p className="text-xs text-slate-500 leading-relaxed">
        {customerLabel}, 출결, {feeLabel} 등 {placeLabel} 데이터를 JSON 파일로 백업하거나, 다른 기기에서 복원할 수 있습니다.
        정기적인 백업으로 데이터 손실을 예방하세요.
      </p>

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleExportData}
          disabled={isImporting}
          className={`w-full py-3 min-h-[44px] bg-slate-50 ${accentHover} border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
        >
          <Download className={`w-4 h-4 ${accentIcon}`} />
          전체 데이터 백업 (JSON 다운로드)
        </button>

        <button
          type="button"
          disabled={isImporting}
          onClick={() => importInputRef.current?.click()}
          className={`w-full py-3 min-h-[44px] bg-slate-50 ${accentHover} border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
        >
          {isImporting ? (
            <Loader2 className={`w-4 h-4 animate-spin ${accentIcon}`} />
          ) : (
            <Upload className={`w-4 h-4 ${accentIcon}`} />
          )}
          {isImporting ? '복원 중…' : '백업 파일 복원 (JSON 업로드)'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </SettingsCard>
  );
};

export interface OrganizationDangerZoneCardProps {
  customerLabel?: string;
  contactLabel?: string;
  feeLabel?: string;
  staffLabel?: string;
}

/**
 * Core Organization: 조직 영구 삭제 위험 영역 및 확인 모달
 */
export const OrganizationDangerZoneCard: FC<OrganizationDangerZoneCardProps> = ({
  customerLabel = '고객',
  contactLabel = '보호자',
  feeLabel = '이용료',
  staffLabel = '직원',
}) => {
  const { showToast } = useApp();
  const { isOwner, industry } = usePermissions();
  const sessionLabel = getDangerZoneSessionLabel(industry);
  const org = useOrganization();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOwner || !org.currentOrganization) {
    return null;
  }

  const handleDeleteOrganization = async () => {
    if (!org.currentOrganization) return;
    if (deleteConfirmName !== org.currentOrganization.name) {
      showToast('조직명이 일치하지 않습니다.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await orgService.deleteOrganization(org.currentOrganization.id);
      
      showToast('조직이 삭제되었습니다.', 'success');
      setShowDeleteModal(false);
      
      await org.refreshOrganizations();
      
      if (org.organizations.length > 1) {
        const otherOrg = org.organizations.find(
          (m) => m.organizationId !== org.currentOrganization?.id
        );
        if (otherOrg) {
          await org.selectOrganization(otherOrg.organizationId);
        } else {
          org.clearOrganization();
        }
      } else {
        org.clearOrganization();
      }
    } catch (err) {
      showToast.error(err, '조직 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="사업장 데이터 삭제"
        icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-xs text-rose-800 leading-relaxed">
              <strong>조직을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</strong>
              <br />
              {customerLabel}, 출결, {feeLabel}, {staffLabel} 등 모든 정보가 복구 불가능하게 삭제됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 min-h-[44px] bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-700 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            조직 영구 삭제
          </button>
        </div>
      </SettingsCard>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">조직 영구 삭제</h2>
                <p className="text-xs text-rose-600">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-rose-700">{org.currentOrganization.name}</strong> 조직과 관련된
                  모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li>모든 {customerLabel} 및 {contactLabel} 정보</li>
                  <li>출석 및 {sessionLabel} 기록</li>
                  <li>{feeLabel} 및 결제 내역</li>
                  <li>{staffLabel} 및 {sessionLabel} 정보</li>
                  <li>공지사항 및 기타 데이터</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  삭제를 확인하려면 조직명을 정확히 입력하세요:
                </label>
                <div className="p-2 bg-slate-100 rounded-lg mb-3">
                  <p className="text-sm font-bold text-slate-900 text-center">
                    {org.currentOrganization.name}
                  </p>
                </div>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="조직명을 입력하세요"
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmName('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting || deleteConfirmName !== org.currentOrganization.name}
                  className="flex-1 py-2.5 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      영구 삭제
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { DataExportCenterCard, type DataExportCenterCardProps } from './DataExportCenterCard';
