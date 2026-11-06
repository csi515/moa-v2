import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import {
  getIndustryAccent,
  getCustomerLabel,
  getPlaceLabel,
  getFeeLabel,
} from '@/core/industry/industryUi';
import { Shield, ChevronRight } from 'lucide-react';
import { LegalLinks } from '@/core/legal';
import {
  DataExportCenterCard,
  OrganizationBackupCard,
  OrganizationDangerZoneCard,
} from './OrganizationSettingsCards';

export const SecurityDataSettingsView: FC = () => {
  const navigate = useNavigate();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const placeLabel = getPlaceLabel(industry);
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const contactLabel = labels.contact.singular;
  const staffLabel = labels.staff.singular;
  const feeLabel = getFeeLabel(industry);

  const accent = getIndustryAccent(industry);
  const accentIcon = accent.icon;
  const accentHover = accent.hoverBg;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-sm font-bold text-slate-800">권한 및 데이터 관리</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          직급별 권한 매트릭스, 원생·출결·수납 엑셀(CSV) 내보내기, 전체 데이터 안전 백업 및 복원 작업을 한곳에서 관리합니다.
        </p>
      </div>

      {/* 1. 직급 및 세부 권한 설정 카드 */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">직급 및 권한 매트릭스 설정</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                원장, 부원장, 전임 강사, 파트 강사, 행정 매니저 등 직급을 신설하고 각 화면과 기능에 대한 열람·수정 권한을 정밀하게 제어합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/workspace/settings/roles')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 min-h-[44px]"
          >
            직급 및 권한 관리 열기
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 2. 데이터 엑셀(CSV) 통합 내보내기 센터 */}
      <DataExportCenterCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
      />

      {/* 3. 데이터 안전 백업(JSON) 및 복원 */}
      <OrganizationBackupCard
        placeLabel={placeLabel}
        customerLabel={customerLabel}
        feeLabel={feeLabel}
        accentIcon={accentIcon}
        accentHover={accentHover}
      />

      {/* 4. 법적 안내 & 위험 구역 */}
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
