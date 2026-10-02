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
  type StudentDetailExtraTabProps,
} from '@/capabilities/roster/components/detail/studentDetailExtensions';
import type { DetailTabConfigItem, DetailTabCounts } from '@/capabilities/roster/components/detail/types';
import { PERFORMANCE_VIDEO_TYPE_LABEL } from '@/industries/piano/config/eventLabels';
import { applySessionPassForAttendance } from '@/industries/piano/services/lessonPassConsume';
import { RecitalService } from '@/industries/piano/services/recitalService';
import { NewSaleModal } from '@/industries/piano/components/textbooks/NewSaleModal';
import { TextbookPaymentModal } from '@/industries/piano/components/textbooks/TextbookPaymentModal';
import { TextbookReceiptModal } from '@/industries/piano/components/textbooks/TextbookReceiptModal';
import { TeacherDirectPassModal } from '@/industries/piano/components/songProgress';

import { StudentDetailTextbooksTab } from './components/students/detail/StudentDetailTextbooksTab';
import { StudentDetailPracticeTab } from './components/students/detail/StudentDetailPracticeTab';
import { StudentDetailVideosTab } from './components/students/detail/StudentDetailVideosTab';

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

function renderPianoExtraTab({ tab, modal }: StudentDetailExtraTabProps) {
  if (!modal) return null;

  if (tab === 'textbooks') {
    return (
      <StudentDetailTextbooksTab
        studentSales={modal.studentSales}
        billingSummary={modal.billingSummary}
        onOpenSaleModal={() => modal.textbooks.setIsStudentSaleModalOpen(true)}
        onOpenPaymentModal={(sale) => {
          modal.textbooks.setSelectedStudentSaleForPay(sale);
          modal.textbooks.setIsStudentTbPaymentModalOpen(true);
        }}
        onOpenReceiptModal={(sale) => {
          modal.textbooks.setTbReceiptSale(sale);
          modal.textbooks.setIsTbReceiptOpen(true);
        }}
      />
    );
  }

  if (tab === 'practice') {
    return (
      <StudentDetailPracticeTab
        allPractice={modal.allPractice}
        allLessons={modal.allLessons}
        totalPracticeMinutes={modal.totalPracticeMinutes}
        isAddPrOpen={modal.practice.isAddPrOpen}
        setIsAddPrOpen={modal.practice.setIsAddPrOpen}
        newPrDate={modal.practice.newPrDate}
        setNewPrDate={modal.practice.setNewPrDate}
        newPrMinutes={modal.practice.newPrMinutes}
        setNewPrMinutes={modal.practice.setNewPrMinutes}
        newPrSong={modal.practice.newPrSong}
        setNewPrSong={modal.practice.setNewPrSong}
        newPrDifficulty={modal.practice.newPrDifficulty}
        setNewPrDifficulty={modal.practice.setNewPrDifficulty}
        onSavePractice={modal.practice.onSave}
      />
    );
  }

  if (tab === 'videos') {
    return (
      <StudentDetailVideosTab
        allVideos={modal.allVideos}
        recitalEvents={modal.recitalEvents}
        videoTypeLabel={modal.videos.videoTypeLabel}
        isAddVideoOpen={modal.videos.isAddVideoOpen}
        setIsAddVideoOpen={modal.videos.setIsAddVideoOpen}
        newVideoTitle={modal.videos.newVideoTitle}
        setNewVideoTitle={modal.videos.setNewVideoTitle}
        newVideoUrl={modal.videos.newVideoUrl}
        setNewVideoUrl={modal.videos.setNewVideoUrl}
        newVideoDate={modal.videos.newVideoDate}
        setNewVideoDate={modal.videos.setNewVideoDate}
        newVideoType={modal.videos.newVideoType}
        setNewVideoType={modal.videos.setNewVideoType}
        newVideoEventId={modal.videos.newVideoEventId}
        setNewVideoEventId={modal.videos.setNewVideoEventId}
        newVideoSong={modal.videos.newVideoSong}
        setNewVideoSong={modal.videos.setNewVideoSong}
        newVideoMemo={modal.videos.newVideoMemo}
        setNewVideoMemo={modal.videos.setNewVideoMemo}
        previewVideoId={modal.videos.previewVideoId}
        setPreviewVideoId={modal.videos.setPreviewVideoId}
        onSaveVideo={modal.videos.onSave}
        onVideoEventChange={modal.videos.onEventChange}
        onDeleteVideo={modal.videos.onDelete}
      />
    );
  }

  return null;
}

const pianoStudentDetailExtension: StudentDetailExtension = {
  industryId: 'piano',
  resolveTabs: (tabs: DetailTabConfigItem[], _counts: DetailTabCounts) => tabs,
  renderHeaderActions: (props) => React.createElement(PianoHeaderActions, props),
  renderExtraTab: renderPianoExtraTab,
  renderModals: (props) => React.createElement(PianoStudentDetailModals, props),
  applyAttendanceSideEffect: applySessionPassForAttendance,
  performanceVideoTypeLabel: PERFORMANCE_VIDEO_TYPE_LABEL,
  mapEventTypeToVideoType: RecitalService.eventTypeToVideoType,
};

/** Core 학생 상세가 piano Module을 import하지 않도록 plugin에서 등록 */
export function registerPianoStudentDetailExtension(): () => void {
  return registerStudentDetailExtension(pianoStudentDetailExtension);
}
