import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, Loader2, LogOut, Link2, UserPlus, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { ParentPortalProvider, useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { StorageHydrator } from '@/StorageHydrator';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { ParentChildrenHome } from './ParentChildrenHome';
import { ParentOrganizationPicker } from './ParentAcademyPicker';
import { ParentOrganizationPortal, useStudentFromEnrollment } from './ParentAcademyPortal';
import { ParentLinkConsentModal } from './ParentLinkConsentModal';
import { GuardianLinkQrScanner } from './components/GuardianLinkQrScanner';
import { ParentAccountSection } from './ParentAccountSection';
import { ParentChildPinSection } from './components/ParentChildPinSection';
import { useGuardianLinkRedeem } from './hooks/useGuardianLinkRedeem';
import { resolvePushOrganizationId } from './utils/resolvePushOrganizationId';
import { registerAppPush } from '@/core/push';
import {
  isNativeApp,
  isValidGuardianLinkCode,
  normalizeGuardianLinkCode,
} from '@/core/platform';
import { getCustomerLabel, getPlaceLabel } from '@/core/industry/industryUi';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * 학부모 포털 진입점.
 * SupabaseRoleSync는 로그인 사용자 → activeUser(role/staffId/parentCustomerId) 동기화를 담당하며,
 * 다른 모듈 셸(daycare/gym/piano/pilates)과 동일하게 마운트해야 학부모 전용 계정에서도
 * 올바른 세션 상태가 Storage에 반영됩니다.
 */
export const ParentShell: React.FC = () => {
  return (
    <ParentPortalProvider>
      <SupabaseRoleSync />
      <ParentShellContent />
    </ParentPortalProvider>
  );
};

function ParentShellContent() {
  const { loading, error, step, portalTree, refreshPortalTree } = useParentPortal();
  const { currentUser, showToast } = useApp();
  const { signOut, user } = useAuth();
  const { isParentOnly, exitParentPortal } = useOrganization();
  const [linkInput, setLinkInput] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [addChildRequest, setAddChildRequest] = useState(0);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const {
    redeeming,
    pendingToken,
    linkPreview,
    showConsent,
    runRedeem,
    requestRedeem,
    cancelLinkConsent,
  } = useGuardianLinkRedeem({ showToast, refreshPortalTree });

  const pushOrganizationId = resolvePushOrganizationId(portalTree);

  useEffect(() => {
    if (!isNativeApp() || !isSupabaseConfigured() || !user?.id) return;
    void registerAppPush({
      userId: user.id,
      organizationId: pushOrganizationId,
    });
  }, [user?.id, pushOrganizationId]);

  const handleManualRedeem = () => {
    requestRedeem(linkInput);
  };

  const handleRedeemSuccess = async (token: string) => {
    const ok = await runRedeem(token);
    if (ok) {
      setLinkInput('');
      setShowLinkForm(false);
    }
  };

  if (loading && !portalTree) {
    return <LoadingScreen message="학부모 포털을 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50">
      {step !== 'portal' && (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
            {!isParentOnly && (
              <button
                type="button"
                onClick={exitParentPortal}
                className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600"
                aria-label="관리 화면으로"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">학부모 포털</p>
              <h1 className="text-lg font-black text-slate-900 truncate">{currentUser.name}님</h1>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500"
              aria-label="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      <main className="max-w-lg mx-auto p-4 pb-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
            {error}
          </div>
        )}

        {step === 'children' && (
          <div className="mb-4 space-y-3">
            <button
              type="button"
              onClick={() => setAddChildRequest((n) => n + 1)}
              className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              내 자녀 등록
            </button>

            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
                <Link2 className="w-4 h-4" />
                학원 연결
              </div>
              {!showLinkForm ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowQrScanner(true)}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    QR 코드 스캔
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(true)}
                    className="w-full py-2.5 bg-white border-2 border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-50 transition-colors"
                  >
                    연결 코드 입력
                  </button>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    사업장에서 받은 QR 또는 연결 코드로 바로 연결합니다. 공개코드·이름 검색은
                    아래 「학원 연결하기」에서 진행합니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value.toUpperCase())}
                      placeholder="예: 7K3M-9QZX-2B4D-6F8H-1JNP"
                      maxLength={29}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 px-3 py-2.5 text-sm font-mono uppercase border-2 border-slate-300 rounded-xl tracking-widest focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleManualRedeem}
                      disabled={redeeming || !isValidGuardianLinkCode(normalizeGuardianLinkCode(linkInput))}
                      className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                    >
                      {redeeming ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          연결 중...
                        </span>
                      ) : (
                        '연결'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    사업장에서 받은 20자리 연결 코드(이전에 받은 8자리 코드도 가능)를 입력하세요. 사업장
                    공개코드는 「학원 연결하기」에서 사용합니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkForm(false);
                      setLinkInput('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline min-h-[44px]"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'children' && <ParentChildrenHome addRequest={addChildRequest} />}
        {step === 'academies' && <ParentOrganizationPicker />}
        {step === 'portal' && <ParentPortalHydrated />}

        {step === 'children' && portalTree && portalTree.children.length > 0 && (
          <div className="mt-8">
            <ParentChildPinSection
              children={portalTree.children}
              onRefresh={refreshPortalTree}
              showToast={showToast}
            />
          </div>
        )}

        {step !== 'portal' && (
          <div className="mt-8">
            <ParentAccountSection />
          </div>
        )}
      </main>

      {loading && portalTree && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-full p-2">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      )}

      <ParentLinkConsentModal
        isOpen={showConsent}
        organizationName={linkPreview?.organizationName}
        studentName={linkPreview?.studentName}
        onConfirm={() => {
          if (pendingToken) void handleRedeemSuccess(pendingToken);
        }}
        onCancel={cancelLinkConsent}
      />

      <GuardianLinkQrScanner
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={(token) => requestRedeem(token)}
      />
    </div>
  );
}

function ParentPortalHydrated() {
  const { selectedEnrollment, selectedStudent, goToAcademies, goToChildren } = useParentPortal();

  if (!selectedEnrollment || !selectedStudent) {
    return null;
  }

  const handleBack =
    selectedStudent.enrollments.length > 1 ? goToAcademies : goToChildren;

  // org·자녀 전환 시 hydrate 캐시를 깨끗이 다시 로드
  const hydrateKey = `${selectedEnrollment.organizationId}:${selectedEnrollment.customerId}`;

  return (
    <StorageHydrator
      key={hydrateKey}
      organizationId={selectedEnrollment.organizationId}
      industryType={selectedEnrollment.industryType}
    >
      <ParentPortalWithStudent
        customerId={selectedEnrollment.customerId}
        organizationId={selectedEnrollment.organizationId}
        organizationName={selectedEnrollment.organizationName}
        enrollmentStatus={selectedEnrollment.status}
        enrollmentLeftAt={selectedEnrollment.leftAt}
        industryType={selectedEnrollment.industryType}
        onBack={handleBack}
      />
    </StorageHydrator>
  );
}

function ParentPortalWithStudent({
  customerId,
  organizationId,
  organizationName,
  enrollmentStatus,
  enrollmentLeftAt,
  industryType,
  onBack,
}: {
  customerId: string;
  organizationId: string;
  organizationName: string;
  enrollmentStatus: import('@/core/parent/types/globalParent').EnrollmentStatus;
  enrollmentLeftAt?: string | null;
  industryType: string;
  onBack: () => void;
}) {
  const student = useStudentFromEnrollment(customerId);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    setWaited(false);
    if (student) return;
    const t = window.setTimeout(() => setWaited(true), 1200);
    return () => window.clearTimeout(t);
  }, [student, customerId]);

  if (!student && !waited) {
    return <PageListSkeleton rows={3} message="자녀 정보를 불러오는 중..." />;
  }

  if (!student) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-rose-200 shadow-sm">
        <div className="w-16 h-16 mx-auto bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-2">학생 정보를 불러올 수 없습니다</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          이 {getPlaceLabel(industryType)}에 연결된 {getCustomerLabel(industryType)} 데이터가 없거나 동기화가 지연되고 있습니다.
          <br />
          잠시 후 다시 시도해 주세요
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl min-h-[44px] transition-colors"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <ParentOrganizationPortal
      student={student}
      organizationId={organizationId}
      organizationName={organizationName}
      enrollmentStatus={enrollmentStatus}
      enrollmentLeftAt={enrollmentLeftAt}
      industryType={industryType}
      onBack={onBack}
    />
  );
}
