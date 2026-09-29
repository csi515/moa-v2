import { useState, type FC, type FormEvent } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
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

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    setIsSearching(true);
    setError(null);
    setSearched(true);
    try {
      const response = await searchAddress(keyword);
      if (response.error && response.results.length === 0) {
        setResults([]);
        setError(response.error);
        return;
      }
      setResults(response.results);
      if (response.results.length === 0) {
        setError('검색 결과가 없습니다. 도로명 또는 건물명으로 다시 검색해 주세요.');
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : '주소 검색 중 오류가 발생했습니다.');
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

  const handleClose = () => {
    setKeyword('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="도로명 주소 검색" maxWidth="lg">
      <div className="p-4 sm:p-6 space-y-4">
        <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 테헤란로 123, 강남대로"
            className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
            autoFocus
            aria-label="주소 검색어"
          />
          <button
            type="submit"
            disabled={isSearching || keyword.trim().length < 2}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] min-w-[44px] disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            <span className="hidden sm:inline">검색</span>
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
            {error}
          </div>
        )}

        <ul className="space-y-2 max-h-[50vh] overflow-y-auto" role="listbox" aria-label="주소 검색 결과">
          {results.map((item) => (
            <li key={`${item.postal}-${item.roadAddress}-${item.jibun}`}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors min-h-[44px]"
                role="option"
              >
                <p className="text-sm font-bold text-slate-900 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
                  <span>{item.roadAddress}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 pl-6">
                  {[item.postal, item.jibun].filter(Boolean).join(' · ')}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {!isSearching && searched && results.length === 0 && !error && (
          <p className="text-sm text-slate-500 text-center py-6">검색 결과가 없습니다.</p>
        )}
      </div>
    </Modal>
  );
};
