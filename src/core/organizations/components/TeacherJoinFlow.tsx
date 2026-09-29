import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { getIndustryLabel } from '@/core/industry/types';
import * as joinRequestService from '../services/joinRequestService';

interface TeacherJoinFlowProps {
  onBack?: () => void;
}

export const TeacherJoinFlow: React.FC<TeacherJoinFlowProps> = ({ onBack }) => {
  const { showToast } = useApp();
  const [myRequests, setMyRequests] = useState<joinRequestService.JoinRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<joinRequestService.OrganizationSearchResult[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    try {
      const requests = await joinRequestService.getMyJoinRequests();
      setMyRequests(requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await joinRequestService.searchOrganizations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      showToast('사업장 검색 중 오류가 발생했습니다.', 'error');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitRequest = async (orgId: string, orgName: string) => {
    setSubmitting(true);
    try {
      await joinRequestService.submitJoinRequest(orgId, requestMessage.trim() || undefined);
      showToast(`${orgName}에 가입 신청을 보냈습니다.`, 'success');
      setSelectedOrg(null);
      setRequestMessage('');
      setSearchQuery('');
      setSearchResults([]);
      await loadMyRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : '가입 신청 중 오류가 발생했습니다.';
      showToast(message, 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const pendingRequests = myRequests.filter((r) => r.status === 'pending');
  const hasApprovedRequest = myRequests.some((r) => r.status === 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        {onBack && (
          <div className="mb-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 min-h-[44px] min-w-[44px] px-2 -ml-2 rounded-xl hover:bg-white/80 transition-colors"
              aria-label="뒤로"
            >
              <ArrowLeft className="w-5 h-5" />
              뒤로
            </button>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">사업장 찾기</h1>
              <p className="text-sm text-slate-500">근무할 사업장을 검색하고 가입 신청하세요</p>
            </div>
          </div>

          {hasApprovedRequest && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>가입 승인이 완료되었습니다. 페이지를 새로고침해 주세요.</span>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="text-sm font-bold text-slate-700 mb-2">신청 현황</h3>
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900">{req.organizationName}</p>
                    <p className="text-xs text-amber-700">승인 대기 중</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="사업장 이름을 입력하세요"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white min-h-[44px]"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-5 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((org) => {
                  const isSelected = selectedOrg === org.id;
                  const hasPendingRequest = pendingRequests.some(
                    (r) => r.organizationId === org.id
                  );

                  return (
                    <div
                      key={org.id}
                      className={`border rounded-xl transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedOrg(isSelected ? null : org.id)}
                        disabled={hasPendingRequest}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 min-h-[44px]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{org.name}</p>
                          <p className="text-xs text-slate-500">
                            {getIndustryLabel(org.industryType)}
                          </p>
                        </div>
                        {hasPendingRequest && (
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            신청중
                          </span>
                        )}
                      </button>

                      {isSelected && !hasPendingRequest && (
                        <div className="px-4 pb-4 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              신청 메시지 <span className="font-normal text-slate-400">(선택)</span>
                            </label>
                            <textarea
                              value={requestMessage}
                              onChange={(e) => setRequestMessage(e.target.value)}
                              placeholder="간단한 소개나 근무 희망 사항을 적어주세요"
                              rows={3}
                              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSubmitRequest(org.id, org.name)}
                            disabled={submitting}
                            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                가입 신청하기
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searching && (
              <div className="p-8 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {myRequests.filter((r) => r.status === 'rejected').length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">반려된 신청</h3>
            <div className="space-y-2">
              {myRequests
                .filter((r) => r.status === 'rejected')
                .map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-100"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <p className="text-sm font-bold text-rose-900">{req.organizationName}</p>
                    </div>
                    {req.rejectionReason && (
                      <p className="text-xs text-rose-700 ml-6">{req.rejectionReason}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
