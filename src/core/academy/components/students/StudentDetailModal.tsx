import React, { useMemo, useState } from 'react';
import type { Student } from '@/types';
import { renderAcademyGuardianInvite } from '@/core/academy/academyStaffUi';
import { X, Phone, Edit, UserMinus, UserCheck, ClipboardCheck, CreditCard, MessageSquare, ChevronDown } from 'lucide-react';
import { StudentDetailInfoTab } from './detail/StudentDetailInfoTab';
import { StudentDetailClassesTab } from './detail/StudentDetailClassesTab';
import { StudentDetailAttendanceTab } from './detail/StudentDetailAttendanceTab';
import { StudentDetailTuitionTab } from './detail/StudentDetailTuitionTab';
import { StudentDetailTextbooksTab } from './detail/StudentDetailTextbooksTab';
import { StudentDetailConsultationsTab } from './detail/StudentDetailConsultationsTab';
import { StudentDetailPracticeTab } from './detail/StudentDetailPracticeTab';
import { StudentDetailVideosTab } from './detail/StudentDetailVideosTab';
import { StudentDetailMemoTab } from './detail/StudentDetailMemoTab';
import { useStudentDetailModal } from './useStudentDetailModal';
import type { DetailTab } from './detail/types';
import { getStudentDetailExtension } from './detail/studentDetailExtensions';
import { useStaffGrants } from '@/hooks';
import { useModuleLabels } from '@/core/labels';

export type { DetailTab } from './detail/types';

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  initialTab?: DetailTab;
  onInitialTabApplied?: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = (props) => {
  if (!props.isOpen || !props.student) return null;
  return <StudentDetailModalContent {...props} student={props.student} />;
};

const StudentDetailModalContent: React.FC<
  Omit<StudentDetailModalProps, 'student'> & { student: Student }
> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  initialTab,
  onInitialTabApplied,
}) => {
  const modal = useStudentDetailModal({
    student,
    isOpen,
    initialTab,
    onInitialTabApplied,
    onClose,
    onEdit,
  });
  const { allow } = useStaffGrants();
  const labels = useModuleLabels();
  const detailExtension = getStudentDetailExtension(modal.industryPlugin.id);
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;
  const canCall = allow('guardianPhone');
  const canEdit = allow('editStudent');
  const canWithdraw = allow('withdrawStudent');
  const canTuition = allow('tuition');
  const [showMoreTabs, setShowMoreTabs] = useState(false);

  const primaryTabs = useMemo(
    () =>
      modal.tabConfig.filter(
        (tab) => tab.group === 'primary' && (tab.id !== 'tuition' || canTuition)
      ),
    [modal.tabConfig, canTuition],
  );
  const moreTabs = useMemo(
    () => modal.tabConfig.filter((tab) => tab.group === 'more'),
    [modal.tabConfig],
  );
  const activeInMore = moreTabs.some((tab) => tab.id === modal.currentTab);
  const showMoreSection = showMoreTabs || activeInMore;

  const summaryItems = [
    { label: '다음 수업', value: modal.summary.nextClass },
    { label: '최근 출결', value: modal.summary.recentAttendance },
    ...(canTuition ? [{ label: '이번 달 수납', value: modal.summary.tuition }] : []),
    { label: contactLabel, value: modal.summary.guardian },
  ];

  const selectPrimaryTab = (tabId: DetailTab) => {
    setShowMoreTabs(false);
    modal.setCurrentTab(tabId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl lg:max-w-6xl overflow-hidden sm:my-4 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-extrabold shadow-md shrink-0"
              style={{ backgroundColor: student.avatarColor || '#4f46e5' }}
            >
              {(student.name || '?').slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {student.name}
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${modal.statusBadge.bg}`}>
                  {modal.statusBadge.label}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${modal.levelColor}`}>
                  {student.level}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {student.studentNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {student.school} {student.grade} | 담당: <strong>{student.teacherName}</strong> | 생년월일: {student.birthDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {canCall && modal.primaryGuardian?.parentPhone && (
              <a
                href={`tel:${modal.primaryGuardian.parentPhone}`}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{contactLabel}</span> 전화
              </a>
            )}
            <>
              {canEdit && (
              <button
                onClick={() => onEdit(student)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                title={`${customerLabel} 정보 수정`}
              >
                <Edit className="w-4 h-4" />
              </button>
              )}
              {canWithdraw && (
              <button
                onClick={modal.handleWithdraw}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center bg-white border border-slate-200 rounded-xl transition-colors ${
                  student.status === 'withdrawn'
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                }`}
                title={
                  student.status === 'withdrawn'
                    ? '재원 복귀'
                    : modal.industryPlugin.id === 'skin_clinic'
                      ? '종료 처리'
                      : '퇴원 처리'
                }
              >
                {student.status === 'withdrawn' ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
              </button>
              )}
            </>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 핵심 요약: 다음 수업 / 출결 / 수납 / 보호자 */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 bg-white shrink-0"
          aria-label={`${customerLabel} 핵심 요약`}
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate" title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* 빠른 액션 — 기존 모달/탭 재사용 */}
        <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={modal.openQuickAttendance}
            className="min-h-[40px] px-3 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            출결 기록
          </button>
          {detailExtension?.renderHeaderActions?.({ student })}
          {canEdit && (
          <button
            type="button"
            onClick={() => onEdit(student)}
            className="min-h-[40px] px-3 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            수업·정보 변경
          </button>
          )}
          {canTuition && (
          <button
            type="button"
            onClick={modal.openQuickTuition}
            className="min-h-[40px] px-3 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            수납
          </button>
          )}
          <button
            type="button"
            onClick={modal.openQuickConsultation}
            className="min-h-[40px] px-3 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            상담 기록
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <nav className="hidden lg:flex flex-col w-52 shrink-0 border-r border-slate-200 bg-slate-50/60 overflow-y-auto py-2">
            {primaryTabs.map((tab) => {
              const isActive = modal.currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectPrimaryTab(tab.id)}
                  className={`mx-2 px-3 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
            {moreTabs.length > 0 && (
              <>
                <div className="mx-4 my-2 border-t border-slate-200" />
                <p className="px-5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  더보기
                </p>
                {moreTabs.map((tab) => {
                  const isActive = modal.currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => modal.setCurrentTab(tab.id)}
                      className={`mx-2 px-3 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="lg:hidden flex items-center gap-1 px-4 sm:px-6 border-b border-slate-200 bg-white overflow-x-auto shrink-0 scrollbar-none">
              {primaryTabs.map((tab) => {
                const isActive = modal.currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectPrimaryTab(tab.id)}
                    className={`py-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              {moreTabs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMoreTabs((prev) => !prev)}
                  className={`py-3 px-3.5 text-xs font-bold flex items-center gap-1 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    showMoreSection
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                  aria-expanded={showMoreSection}
                >
                  더보기
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreSection ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {showMoreSection && (
              <div className="lg:hidden flex items-center gap-1 px-4 sm:px-6 border-b border-slate-100 bg-slate-50 overflow-x-auto shrink-0 scrollbar-none">
                {moreTabs.map((tab) => {
                  const isActive = modal.currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => modal.setCurrentTab(tab.id)}
                      className={`py-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4">
              {modal.currentTab === 'info' && (
                <StudentDetailInfoTab
                  student={student}
                  guardians={modal.guardians}
                  totalPracticeMinutes={modal.totalPracticeMinutes}
                  attendanceEnabled={modal.attendanceEnabled}
                  isAdmin={modal.isAdmin}
                  isSupabaseConfigured={modal.isSupabaseConfigured}
                  levelLabel={modal.industryPlugin.levelLabel}
                  showPickupFields={modal.industryPlugin.showPickupFields}
                  onEdit={onEdit}
                  showGuardianContact={canCall}
                  showTuition={canTuition}
                  canEditStudent={canEdit}
                  onOpenGuardianLink={() => modal.setGuardianLinkOpen(true)}
                />
              )}

              {modal.currentTab === 'classes' && (
                <StudentDetailClassesTab enrolledClasses={modal.enrolledClasses} />
              )}

              {modal.currentTab === 'attendance' && (
                <StudentDetailAttendanceTab
                  allAttendance={modal.allAttendance}
                  totalAttCount={modal.totalAttCount}
                  presentCount={modal.presentCount}
                  attRate={modal.attRate}
                  isAddAttOpen={modal.attendance.isAddAttOpen}
                  setIsAddAttOpen={modal.attendance.setIsAddAttOpen}
                  newAttDate={modal.attendance.newAttDate}
                  setNewAttDate={modal.attendance.setNewAttDate}
                  newAttStatus={modal.attendance.newAttStatus}
                  setNewAttStatus={modal.attendance.setNewAttStatus}
                  newAttMemo={modal.attendance.newAttMemo}
                  setNewAttMemo={modal.attendance.setNewAttMemo}
                  newAttClassId={modal.attendance.newAttClassId}
                  setNewAttClassId={modal.attendance.setNewAttClassId}
                  attendanceClassOptions={modal.attendance.attendanceClassOptions}
                  onSaveAttendance={modal.attendance.onSave}
                />
              )}

              {modal.currentTab === 'tuition' && canTuition && (
                <StudentDetailTuitionTab
                  allInvoices={modal.allInvoices}
                  billingSummary={modal.billingSummary}
                  studentSales={modal.studentSales}
                  payInvoiceId={modal.tuition.payInvoiceId}
                  setPayInvoiceId={modal.tuition.setPayInvoiceId}
                  payAmount={modal.tuition.payAmount}
                  setPayAmount={modal.tuition.setPayAmount}
                  payMethod={modal.tuition.payMethod}
                  setPayMethod={modal.tuition.setPayMethod}
                  payMemo={modal.tuition.payMemo}
                  setPayMemo={modal.tuition.setPayMemo}
                  onOpenPayModal={modal.tuition.onOpenPayModal}
                  onProcessPayment={modal.tuition.onProcessPayment}
                  onOpenTextbookSale={() => modal.textbooks.setIsStudentSaleModalOpen(true)}
                  onOpenTextbookTab={() => modal.setCurrentTab('textbooks')}
                  onOpenTextbookPayment={(sale) => {
                    modal.textbooks.setSelectedStudentSaleForPay(sale);
                    modal.textbooks.setIsStudentTbPaymentModalOpen(true);
                  }}
                />
              )}

              {modal.currentTab === 'textbooks' && (
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
              )}

              {modal.currentTab === 'consultations' && (
                <StudentDetailConsultationsTab
                  allConsultations={modal.allConsultations}
                  isAddCstOpen={modal.consultations.isAddCstOpen}
                  setIsAddCstOpen={modal.consultations.setIsAddCstOpen}
                  newCstType={modal.consultations.newCstType}
                  setNewCstType={modal.consultations.setNewCstType}
                  newCstContent={modal.consultations.newCstContent}
                  setNewCstContent={modal.consultations.setNewCstContent}
                  newCstResult={modal.consultations.newCstResult}
                  setNewCstResult={modal.consultations.setNewCstResult}
                  newCstNextDate={modal.consultations.newCstNextDate}
                  setNewCstNextDate={modal.consultations.setNewCstNextDate}
                  onSaveConsultation={modal.consultations.onSave}
                />
              )}

              {modal.currentTab === 'practice' && (
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
              )}

              {modal.currentTab === 'videos' && (
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
              )}

              {modal.currentTab === 'memo' && <StudentDetailMemoTab student={student} />}
              {detailExtension?.renderExtraTab?.({ tab: modal.currentTab, student })}
            </div>
          </div>
        </div>
      </div>

      {detailExtension?.renderModals?.({
        student,
        textbooks: modal.textbooks,
        triggerRefresh: modal.triggerRefresh,
        onCloseDetail: onClose,
      })}

      {renderAcademyGuardianInvite({
        studentId: student.id,
        studentName: student.name,
        isOpen: modal.guardianLinkOpen,
        onClose: () => modal.setGuardianLinkOpen(false),
      })}
    </div>
  );
};
