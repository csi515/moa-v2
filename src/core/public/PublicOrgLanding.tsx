import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  ArrowLeft,
  QrCode,
  Link2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { appBrand } from '@/core/brand';
import { getIndustryLabel } from '@/core/industry/types';
import { storePendingOrgPublicCode } from '@/core/parent/services/pendingOrgConnect';
import { setParentPortalModeActive } from '@/core/parent/services/appModeService';
import { usePublicOrganization } from './usePublicOrganization';
import { ConsultationForm } from './ConsultationForm';
import { PublicBookingSection } from './PublicBookingSection';

interface PublicOrgLandingProps {
  code: string;
  /** consultation: QR 전용 — 슬롯·신청 중심 UI */
  mode?: 'default' | 'consultation';
}

export function PublicOrgLanding({ code, mode = 'default' }: PublicOrgLandingProps) {
  const navigate = useNavigate();
  const isConsultationMode = mode === 'consultation';
  const { org, loading, error, isAuthenticated, placeLabel, adultFirst } =
    usePublicOrganization(code);

  const [showQR, setShowQR] = useState(false);
  const [showConsultForm, setShowConsultForm] = useState(mode === 'consultation');
  const [consultSubmitted, setConsultSubmitted] = useState(false);

  const handleJoinRequest = () => {
    navigate('/signup/customer', {
      state: {
        selectedOrgId: org?.id,
        publicCode: org?.public_code,
        orgName: org?.name,
      },
    });
  };

  const handleParentConnect = () => {
    if (!org) return;
    storePendingOrgPublicCode(org.public_code);
    setParentPortalModeActive(true);
    if (isAuthenticated) {
      navigate('/', { state: { openParentPortal: true } });
      return;
    }
    navigate('/', {
      state: {
        openParentPortal: true,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">조직 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">조직을 찾을 수 없습니다</h2>
          <p className="text-slate-600 mb-6">{error || '입력하신 코드가 올바르지 않습니다'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentUrl = window.location.origin + `/c/${org.public_code}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(isConsultationMode ? `/c/${code}` : '/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">뒤로 가기</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-slate-900">{appBrand.shortName}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{org.name}</h1>
              {isConsultationMode ? (
                <p className="text-base font-semibold text-indigo-700">상담 신청</p>
              ) : (
                <p className="text-sm text-slate-600 inline-flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {getIndustryLabel(org.industry_type)}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-mono">
                    {org.public_code}
                  </span>
                </p>
              )}
            </div>
          </div>

          {!isConsultationMode && org.description && (
            <p className="text-slate-700 mb-6 leading-relaxed">{org.description}</p>
          )}

          {!isConsultationMode && (
            <dl className="space-y-3">
              {org.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <dt className="text-sm font-medium text-slate-500">주소</dt>
                    <dd className="text-slate-900">{org.address}</dd>
                  </div>
                </div>
              )}
              {org.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <dt className="text-sm font-medium text-slate-500">전화</dt>
                    <dd className="text-slate-900">
                      <a href={`tel:${org.phone}`} className="hover:text-indigo-600 transition-colors">
                        {org.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {org.business_hours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <dt className="text-sm font-medium text-slate-500">운영 시간</dt>
                    <dd className="text-slate-900 whitespace-pre-line">{org.business_hours}</dd>
                  </div>
                </div>
              )}
            </dl>
          )}
        </section>

        {!isConsultationMode && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">이용 대상 선택</h2>
              <p className="text-sm text-slate-600 mt-1">
                {adultFirst
                  ? '본인 계정 가입과 자녀 연결은 서로 다른 경로입니다. 목적에 맞게 선택하세요.'
                  : '자녀를 연결할지, 본인 계정으로 가입할지 선택하세요. 두 경로는 다릅니다.'}
              </p>
            </div>

            {(adultFirst
              ? (['adult', 'parent', 'consult'] as const)
              : (['parent', 'adult', 'consult'] as const)
            ).map((kind) => {
              if (kind === 'parent') {
                return (
                  <div key="parent" className="space-y-1">
                    <button
                      type="button"
                      onClick={handleParentConnect}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px] ${
                        adultFirst
                          ? 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                      }`}
                    >
                      <Link2 className="w-6 h-6" />
                      학부모 · 우리 아이 {placeLabel} 연결
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      자녀 프로필을 등록한 뒤 {placeLabel}에 연결 요청합니다 (본인 회원 가입 아님)
                    </p>
                  </div>
                );
              }
              if (kind === 'adult') {
                return (
                  <div key="adult" className="space-y-1">
                    <button
                      type="button"
                      onClick={handleJoinRequest}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px] ${
                        adultFirst
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                          : 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${adultFirst ? '' : 'text-indigo-600'}`} />
                      성인 수강생 · 회원 가입
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      본인 MOA 계정으로 {placeLabel} 회원 가입을 신청합니다 (자녀 연결 아님)
                    </p>
                  </div>
                );
              }
              return (
                <div key="consult" className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConsultForm(true);
                      setConsultSubmitted(false);
                    }}
                    className="w-full py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <MessageSquare className="w-6 h-6" />
                    상담만 문의
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* 조직 확정 후에만 마운트 → 슬롯 API가 org 조회 전에 호출되지 않음 */}
        <PublicBookingSection
          organizationId={org.id}
          isConsultationMode={isConsultationMode}
          isAuthenticated={isAuthenticated}
        />

        {(showConsultForm || consultSubmitted) && (
          <ConsultationForm
            organizationId={org.id}
            isConsultationMode={isConsultationMode}
            showForm={showConsultForm}
            submitted={consultSubmitted}
            onSubmitted={() => setConsultSubmitted(true)}
            onCloseSuccess={() => setShowConsultForm(false)}
          />
        )}

        {!isConsultationMode && (
          <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
            <div className="text-center">
              <button
                onClick={() => setShowQR(!showQR)}
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium min-h-[44px]"
              >
                <QrCode className="w-5 h-5" />
                {showQR ? 'QR 코드 숨기기' : 'QR 코드 보기'}
              </button>
              
              {showQR && (
                <div className="mt-6 inline-block p-4 bg-white rounded-2xl border-2 border-slate-200">
                  <QRCodeSVG value={currentUrl} size={200} level="H" includeMargin />
                  <p className="text-xs text-slate-500 mt-3">QR 코드를 스캔하여 접속하세요</p>
                </div>
              )}
            </div>
          </section>
        )}

        {isConsultationMode && (
          <section className="text-center">
            <button
              type="button"
              onClick={() => navigate(`/c/${code}`)}
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 min-h-[44px]"
            >
              {placeLabel} 소개 페이지로 이동
            </button>
          </section>
        )}

        <footer className="text-center text-xs text-slate-500 py-4 space-y-1">
          <p>Powered by {appBrand.fullName}</p>
          <p className="text-slate-400">
            {appBrand.acronym} — {appBrand.acronymMeaning}
          </p>
          <p className="text-slate-400">{appBrand.tagline}</p>
        </footer>
      </main>
    </div>
  );
}
