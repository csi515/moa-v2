import { useState, type FC, type FormEvent } from 'react';
import { Check, Edit3, Loader2, MapPin, Search } from 'lucide-react';
import { Modal } from '@/shared/components/ui';
import { searchAddress } from '../services/addressSearchService';
import type { AddressSearchResult } from '../types';

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: AddressSearchResult) => void;
}

export const AddressSearchModal: FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const trimmed = keyword.trim();

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    if (trimmed.length < 2) {
      setError('검색어는 최소 2자 이상 입력해 주세요.');
      return;
    }
    setIsSearching(true);
    setError(null);
    setSearched(true);
    try {
      const response = await searchAddress(trimmed);
      if (response.error && response.results.length === 0) {
        setResults([]);
        setError(response.error);
        return;
      }
      setResults(response.results);
      if (response.results.length === 0) {
        setError('일치하는 검색 결과가 없습니다. 직접 주소를 입력하여 바로 적용할 수 있습니다.');
      }
    } catch {
      setResults([]);
      setError('주소 검색 중 오류가 발생했습니다. 직접 주소를 입력하여 바로 적용할 수 있습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: AddressSearchResult) => {
    onSelect(result);
    setKeyword('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  };

  const handleUseCurrentKeyword = () => {
    if (!trimmed) return;
    handleSelect({
      roadAddress: trimmed,
      fullAddress: trimmed,
      jibun: null,
      postal: null,
      sido: null,
      sigungu: null,
      dong: null,
      buildingName: null,
    });
  };

  const handleClose = () => {
    setKeyword('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="사업장 주소 입력" maxWidth="lg">
      <div className="p-4 sm:p-6 space-y-4">
        {/* 안내 문구 */}
        <p className="text-xs text-slate-500">
          도로명 주소 또는 건물명을 입력해 주세요. (예: 희망길 39)
        </p>

        {/* 주소 입력 및 검색 폼 */}
        <div className="flex gap-2">
          <input
            type="search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (trimmed) {
                  handleUseCurrentKeyword();
                }
              }
            }}
            placeholder="도로명 또는 건물명 입력 (예: 희망길 39)"
            data-testid="input-address-search-keyword"
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            autoFocus
            aria-label="사업장 주소 입력"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            data-testid="btn-address-search-submit"
            disabled={isSearching || trimmed.length < 2}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] min-w-[44px] disabled:opacity-50 shadow-xs cursor-pointer transition-colors"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            <span className="hidden sm:inline">검색</span>
          </button>
        </div>

        {/* 입력한 주소 원클릭 바로 적용 버튼 */}
        {trimmed.length > 0 && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
            <div className="min-w-0 mr-3">
              <span className="text-slate-500 block text-[11px]">입력한 주소</span>
              <strong className="text-indigo-950 font-bold text-sm truncate block">
                {trimmed}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentKeyword}
              data-testid="btn-apply-entered-address"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>입력한 주소 적용하기</span>
            </button>
          </div>
        )}

        {/* 에러 및 안내 메시지 */}
        {error && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 leading-relaxed">
            {error}
          </div>
        )}

        {/* 검색 결과 목록 */}
        {results.length > 0 && (
          <ul className="space-y-2 max-h-[45vh] overflow-y-auto" role="listbox" aria-label="주소 검색 결과">
            {results.map((item, idx) => (
              <li key={`${item.postal}-${item.roadAddress}-${idx}`}>
                <button
                  type="button"
                  data-testid="item-address-search-result"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors min-h-[44px] cursor-pointer"
                  role="option"
                >
                  <p className="text-sm font-bold text-slate-900 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
                    <span>{item.roadAddress}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 pl-6">
                    {[item.postal && `우편번호 ${item.postal}`, item.jibun].filter(Boolean).join(' · ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 검색 후 결과가 없을 때의 추가 안내 */}
        {!isSearching && searched && results.length === 0 && !error && (
          <div className="text-center py-5 space-y-2">
            <p className="text-xs text-slate-500">일치하는 공식 도로명 검색 결과가 없습니다.</p>
            {trimmed && (
              <button
                type="button"
                onClick={handleUseCurrentKeyword}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>입력한 "{trimmed}" 그대로 등록하기</span>
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
