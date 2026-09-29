import React, { useState } from 'react';
import { Search, X, Loader2, Building2, MapPin, Phone, ChevronRight } from 'lucide-react';
import { getPlaceLabel } from '@/core/industry/industryUi';
import {
  searchOrganizations,
  findOrganizationByCode,
  type OrganizationSearchResult,
} from '@/core/parent/services/enrollmentRequestService';

interface ParentRequestEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrg: (org: OrganizationSearchResult) => void;
}

export const ParentRequestEnrollmentModal: React.FC<ParentRequestEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onSelectOrg,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [code, setCode] = useState('');
  const [results, setResults] = useState<OrganizationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'search' | 'code'>('code');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('검색어를 입력해 주세요');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const orgs = await searchOrganizations(searchQuery.trim(), 20);
      setResults(orgs);
      if (orgs.length === 0) {
        setError('검색 결과가 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleFindByCode = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('코드를 입력해 주세요');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const org = await findOrganizationByCode(trimmedCode);
      if (org) {
        onSelectOrg(org);
      } else {
        setError('유효하지 않은 코드입니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '코드 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">학원 연결하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          QR·8자리 연결 코드가 있으면 홈의 「QR 스캔 / 연결 코드」를 먼저 사용하세요. 여기에서는
          사업장 공개코드 또는 이름 검색으로 연결을 요청합니다.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors min-h-[44px] ${
              mode === 'code'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            학원 코드 입력
          </button>
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors min-h-[44px] ${
              mode === 'search'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            학원 이름 검색
          </button>
        </div>

        {mode === 'search' ? (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSearch();
                }}
                placeholder="이름 또는 지역 검색"
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 min-h-[44px] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                검색
              </button>
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-lg bg-rose-50 text-xs text-rose-700">{error}</div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => onSelectOrg(org)}
                    className="w-full text-left p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{org.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                          <Building2 className="w-3 h-3" />
                          <span>{getPlaceLabel(org.industryType)}</span>
                          {org.city && (
                            <>
                              <MapPin className="w-3 h-3 ml-1" />
                              <span>{org.city}</span>
                            </>
                          )}
                        </div>
                        {org.phone && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            <span>{org.phone}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-3">
              받은 공개 코드를 입력하세요
            </p>

            {error && (
              <div className="mb-3 p-3 rounded-lg bg-rose-50 text-xs text-rose-700">{error}</div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleFindByCode();
                }}
                placeholder="예: ABCD1234"
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px] font-mono"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => void handleFindByCode()}
                disabled={loading}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 min-h-[44px] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                찾기
              </button>
            </div>

            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-indigo-900 mb-1">💡 공개 코드란?</p>
              <p className="text-xs text-indigo-700 leading-relaxed">
                발급한 고유 코드입니다. 해당 곳에 문의하여 코드를 받으세요.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
