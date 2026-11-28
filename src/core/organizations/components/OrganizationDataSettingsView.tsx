import type { FC } from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { getPlaceLabel, getCustomerLabel, getFeeLabel } from '@/core/industry/industryUi';
import { DataExportCenterCard } from './DataExportCenterCard';
import { FieldDefinitionsSettingsCard } from './FieldDefinitionsSettingsCard';
import { PolicySettingsCard } from './PolicySettingsCard';
import { OrganizationBackupCard, OrganizationDangerZoneCard } from './OrganizationSettingsCards';
import { LegalLinks } from '@/core/legal';

export const OrganizationDataSettingsView: FC = () => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const placeLabel = getPlaceLabel(industry);
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const contactLabel = labels.contact.singular;
  const staffLabel = labels.staff.singular;
  const feeLabel = getFeeLabel(industry);

  return (
    <div className="space-y-6 max-w-4xl">
      <FieldDefinitionsSettingsCard />
      <PolicySettingsCard />

      {/* 1. 엑셀 데이터 내보내기 */}
      <DataExportCenterCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
      />

      {/* 2. 데이터 백업 및 복원 */}
      <OrganizationBackupCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
      />

      {/* 3. 사업장 데이터 영구 삭제 및 법적 안내 */}
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

export default OrganizationDataSettingsView;
