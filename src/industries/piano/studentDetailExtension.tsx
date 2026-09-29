import React, { useState } from 'react';
import { Stamp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  registerStudentDetailExtension,
  type StudentDetailExtension,
  type StudentDetailHeaderActionsProps,
  type StudentDetailModalsProps,
} from '@/core/academy/components/students/detail/studentDetailExtensions';
import type { DetailTabConfigItem, DetailTabCounts } from '@/core/academy/components/students/detail/types';
import { PERFORMANCE_VIDEO_TYPE_LABEL } from '@/industries/piano/config/eventLabels';
import { applySessionPassForAttendance } from '@/industries/piano/services/lessonPassConsume';
import { RecitalService } from '@/industries/piano/services/recitalService';
import { NewSaleModal } from '@/industries/piano/components/textbooks/NewSaleModal';
import { TextbookPaymentModal } from '@/industries/piano/components/textbooks/TextbookPaymentModal';
import { TextbookReceiptModal } from '@/industries/piano/components/textbooks/TextbookReceiptModal';
import { TeacherDirectPassModal } from '@/industries/piano/components/songProgress';

function PianoHeaderActions({ student }: StudentDetailHeaderActionsProps) {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const [stampGrantOpen, setStampGrantOpen] = useState(false);
  const orgId = currentOrganization?.id;

  if (!orgId || !isSupabaseConfigured()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setStampGrantOpen(true)}
        className="min-h-[40px] px-3 rounded-xl text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-900 hover:border-amber-400 inline-flex items-center gap-1.5"
      >
        <Stamp className="w-3.5 h-3.5" />
        완곡 스탬프
      </button>
      <TeacherDirectPassModal
        isOpen={stampGrantOpen}
        onClose={() => setStampGrantOpen(false)}
        organizationId={orgId}
        customerId={student.id}
        studentName={student.name}
        onToast={showToast}
      />
    </>
  );
}

function PianoStudentDetailModals({
  student,
  textbooks,
  triggerRefresh,
  onCloseDetail,
}: StudentDetailModalsProps) {
  const { setActiveTab } = useApp();

  return (
    <>
      {textbooks.isStudentSaleModalOpen && (
        <NewSaleModal
          initialStudentId={student.id}
          onSuccess={() => {
            textbooks.setIsStudentSaleModalOpen(false);
            triggerRefresh();
          }}
          onClose={() => textbooks.setIsStudentSaleModalOpen(false)}
          onRegisterTextbooks={() => {
            textbooks.setIsStudentSaleModalOpen(false);
            onCloseDetail();
            setActiveTab('textbooks');
          }}
        />
      )}
      {textbooks.isStudentTbPaymentModalOpen && textbooks.selectedStudentSaleForPay && (
        <TextbookPaymentModal
          sale={textbooks.selectedStudentSaleForPay}
          onSuccess={() => {
            textbooks.setIsStudentTbPaymentModalOpen(false);
            triggerRefresh();
          }}
          onClose={() => textbooks.setIsStudentTbPaymentModalOpen(false)}
        />
      )}
      {textbooks.isTbReceiptOpen && textbooks.tbReceiptSale && (
        <TextbookReceiptModal
          sale={textbooks.tbReceiptSale}
          onClose={() => textbooks.setIsTbReceiptOpen(false)}
        />
      )}
    </>
  );
}

const pianoStudentDetailExtension: StudentDetailExtension = {
  industryId: 'piano',
  resolveTabs: (tabs: DetailTabConfigItem[], _counts: DetailTabCounts) => tabs,
  renderHeaderActions: (props) => React.createElement(PianoHeaderActions, props),
  renderModals: (props) => React.createElement(PianoStudentDetailModals, props),
  applyAttendanceSideEffect: applySessionPassForAttendance,
  performanceVideoTypeLabel: PERFORMANCE_VIDEO_TYPE_LABEL,
  mapEventTypeToVideoType: RecitalService.eventTypeToVideoType,
};

/** Core 학생 상세가 piano Module을 import하지 않도록 plugin에서 등록 */
export function registerPianoStudentDetailExtension(): () => void {
  return registerStudentDetailExtension(pianoStudentDetailExtension);
}
