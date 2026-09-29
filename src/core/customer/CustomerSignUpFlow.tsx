import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Building2,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import type { PublicOrgInfo, CustomerJoinRequest } from '@/types';
import { publicOrgService } from '@/core/public/services/publicOrgService';
import { customerJoinService } from './services/customerJoinService';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryLabel } from '@/core/industry/types';

type Step = 'search' | 'form' | 'pending';

type LocationState = {
  selectedOrgId?: string;
  publicCode?: string;
  orgName?: string;
  openPending?: boolean;
};

function getStatusLabel(status: string): { label: string; color: string } {
  const labels: Record<string, { label: string; color: string }> = {
    pending: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: '승인 완료', color: 'bg-green-100 text-green-700' },
    rejected: { label: '반려됨', color: 'bg-red-100 text-red-700' },
    cancelled: { label: '취소됨', color: 'bg-slate-100 text-slate-700' },
  };
  return labels[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
}

export function CustomerSignUpFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { enterCustomerPortal, refreshOrganizations } = useOrganization();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicOrgInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<PublicOrgInfo | null>(null);
  const [myRequests, setMyRequests] = useState<CustomerJoinRequest[]>([]);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [preloading, setPreloading] = useState(false);
  const [form, setForm] = useState({
    applicantName: '',
    applicantPhone: '',
    applicantEmail: user?.email || '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 랜딩에서 넘어온 사업장 자동 선택
  useEffect(() => {
    const state = (location.state || {}) as LocationState;
    if (state.openPending) {
      setJustSubmitted(false);
      setStep('pending');
      return;
    }
    if (!state.publicCode && !state.selectedOrgId) return;
    if (selectedOrg) return;

    let cancelled = false;
    const load = async () => {
      setPreloading(true);
      setPreloadError(null);
      try {
        let org: PublicOrgInfo | null = null;
        if (state.publicCode) {
          org = await publicOrgService.getOrganizationByCode(state.publicCode);
        }
        if (!org && state.publicCode) {
          const results = await publicOrgService.searchOrganizations(state.publicCode);
          org = results.find((r) => r.id === state.selectedOrgId) || results[0] || null;
        }
        if (!org && state.orgName) {
          const results = await publicOrgService.searchOrganizations(state.orgName);
          org =
            results.find((r) => r.id === state.selectedOrgId) ||
            results.find((r) => r.name === state.orgName) ||
            null;
        }
        if (cancelled) return;
        if (org) {
          setSelectedOrg(org);
          setStep('form');
          navigate(location.pathname, { replace: true, state: {} });
        } else {
          setPreloadError('사업장 정보를 불러오지 못했습니다. 검색으로 다시 찾아주세요.');
        }
      } catch (err) {
        if (!cancelled) {
          setPreloadError(err instanceof Error ? err.message : '사업장 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setPreloading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [location.state, location.pathname, navigate, selectedOrg]);

  useEffect(() => {
    if (user && step === 'pending') {
      void loadMyRequests();
    }
  }, [user, step]);

  const loadMyRequests = async () => {
    try {
      const requests = await customerJoinService.getMyJoinRequests();
      setMyRequests(requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await publicOrgService.searchOrganizations(searchQuery);
      setSearchResults(results);
      setHasSearched(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '검색에 실패했습니다');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOrg = (org: PublicOrgInfo) => {
    setSelectedOrg(org);
    setStep('form');
  };

  const openStudentPortal = async () => {
    setOpeningPortal(true);
    try {
      await refreshOrganizations();
      enterCustomerPortal();
      navigate('/', { replace: true, state: { openCustomerPortal: true } });
    } catch (err) {
      alert(err instanceof Error ? err.message : '수강생 포털을 열지 못했습니다');
      setOpeningPortal(false);
    }
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !user) return;

    try {
      setSubmitting(true);
      await customerJoinService.submitJoinRequest({
        orgId: selectedOrg.id,
        applicantName: form.applicantName,
        applicantPhone: form.applicantPhone,
        applicantEmail: form.applicantEmail,
        message: form.message,
      });
      setJustSubmitted(true);
      setStep('pending');
      await loadMyRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : '가입 신청에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-600 mb-6">가입 신청을 하려면 먼저 로그인해주세요</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">수강생 가입 신청</h1>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-1 rounded ${step === 'search' ? 'bg-indigo-600' : 'bg-indigo-200'}`} />
            <div
              className={`flex-1 h-1 rounded ${
                step === 'form' ? 'bg-indigo-600' : step === 'pending' ? 'bg-indigo-200' : 'bg-slate-200'
              }`}
            />
            <div className={`flex-1 h-1 rounded ${step === 'pending' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {preloading && (
          <p className="text-center text-sm text-slate-500 mb-4">사업장 정보를 불러오는 중...</p>
        )}
        {preloadError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {preloadError}
          </div>
        )}

        {step === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">사업장 검색</h2>
              <p className="text-slate-600 mb-6">가입하고 싶은 사업장을 검색하세요</p>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearched(false);
                      setSearchResults([]);
                    }}
                    placeholder="사업장 이름, 코드, 주소로 검색"
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-lg"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {searching ? '검색 중...' : '검색'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setJustSubmitted(false);
                  setStep('pending');
                }}
                className="w-full mt-4 py-3 text-sm font-bold text-indigo-600 min-h-[44px]"
              >
                내 신청 현황 보기
              </button>
            </div>

            {hasSearched && searchResults.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center">
                <p className="text-sm font-bold text-slate-700">검색 결과가 없습니다</p>
                <p className="text-xs text-slate-500 mt-1">사업장 이름이나 공개코드를 다시 확인해 주세요.</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">검색 결과 ({searchResults.length})</h3>
                {searchResults.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelectOrg(org)}
                    className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 text-left min-h-[44px]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 mb-1">{org.name}</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="inline-flex items-center gap-1">
                            {getIndustryLabel(org.industry_type)}
                            <span className="text-slate-400">•</span>
                            <span className="font-mono">{org.public_code}</span>
                          </span>
                        </p>
                        {org.address && (
                          <p className="text-sm text-slate-500 flex items-start gap-1">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{org.address}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'form' && selectedOrg && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setStep('search')}
                className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 min-h-[44px]"
              >
                ← 다른 사업장 검색
              </button>

              <div className="mb-6 pb-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{selectedOrg.name}</h3>
                <p className="text-sm text-slate-600">
                  {getIndustryLabel(selectedOrg.industry_type)} • {selectedOrg.public_code}
                </p>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">가입 신청서</h2>
              <p className="text-slate-600 mb-6">담당자가 승인하면 알림을 보내드립니다</p>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.applicantName}
                    onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.applicantPhone}
                    onChange={(e) => setForm({ ...form, applicantPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="010-0000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">이메일</label>
                  <input
                    type="email"
                    value={form.applicantEmail}
                    onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="예: name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    간단한 소개 (선택)
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="사업장에 전하고 싶은 말씀을 자유롭게 작성해주세요"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {submitting ? '제출 중...' : '가입 신청'}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'pending' && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-6 sm:p-8 text-center border-2 ${
                justSubmitted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              {justSubmitted && (
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {justSubmitted ? '가입 신청이 접수되었습니다' : '가입 신청 현황'}
              </h2>
              <p className="text-slate-700">
                {justSubmitted
                  ? '담당자가 승인하면 이용자 포털을 이용할 수 있습니다'
                  : '대기·승인·거절된 신청을 확인할 수 있습니다'}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">내 신청 목록</h3>

              {myRequests.length === 0 ? (
                <p className="text-center text-slate-500 py-8">신청 내역이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request) => {
                    const statusInfo = getStatusLabel(request.status);
                    return (
                      <div key={request.id} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900">
                              {request.organization_name || request.applicant_name}
                            </h4>
                            <p className="text-sm text-slate-600 mt-1">
                              {request.organization_name
                                ? `신청자 ${request.applicant_name} · `
                                : ''}
                              신청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                              {request.organization_public_code
                                ? ` · ${request.organization_public_code}`
                                : ''}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        {request.status === 'pending' && (
                          <div className="mt-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-4 h-4" />
                              <span>승인 대기 중입니다</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('이 가입 신청을 취소할까요?')) return;
                                try {
                                  await customerJoinService.cancelMyJoinRequest(request.id);
                                  await loadMyRequests();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : '취소에 실패했습니다');
                                }
                              }}
                              className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold min-h-[44px]"
                            >
                              신청 취소
                            </button>
                          </div>
                        )}

                        {request.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => void openStudentPortal()}
                            disabled={openingPortal}
                            className="mt-3 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold min-h-[44px] disabled:opacity-60"
                          >
                            {openingPortal ? '포털 여는 중...' : '수강생 포털 열기'}
                          </button>
                        )}

                        {request.status === 'rejected' && request.reject_reason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>반려 사유:</strong> {request.reject_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep('search');
                  setSearchQuery('');
                  setSearchResults([]);
                  setSelectedOrg(null);
                }}
                className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
              >
                다른 사업장 신청하기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
