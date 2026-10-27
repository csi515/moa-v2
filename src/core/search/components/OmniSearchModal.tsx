import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  User,
  Package,
  BookOpen,
  Layers,
  ArrowRight,
  X,
  Command,
  Clock,
  Trash2,
} from 'lucide-react';
import { useOptionalOrganization } from '../../organizations/OrganizationProvider';
import { getCoreClient } from '../../../lib/supabase';
import {
  searchOmni,
  type SearchResultItem,
} from '../services/omniSearchService';
import {
  getRecentItems,
  recordRecentItem,
  clearRecentItems,
  type RecentItem,
} from '../services/coreRecentStore';

export interface OmniSearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (route: string) => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onNavigate,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recentList, setRecentList] = useState<RecentItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const orgContext = useOptionalOrganization();
  const organizationId = orgContext?.currentOrganization?.id || 'default_org';
  const supabaseClient = getCoreClient();

  // 글로벌 단축키 (Ctrl+K or Cmd+K) 및 moa:command-palette 커스텀 이벤트 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 입력창이 아닐 때 '/' 키로 열기 지원 또는 Ctrl/Cmd+K
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setInternalOpen((prev) => !prev);
      } else if (!isInput && e.key === '/' && !isOpen) {
        e.preventDefault();
        setInternalOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleCustomEvent = () => {
      setInternalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('moa:command-palette', handleCustomEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('moa:command-palette', handleCustomEvent);
    };
  }, [isOpen]);

  // 모달 열릴 때 포커스 및 최근 항목 로드
  useEffect(() => {
    if (isOpen) {
      setRecentList(getRecentItems());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 검색어 입력 시 디바운스 검색
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const list = await searchOmni(organizationId, query, supabaseClient);
        setResults(list);
        setSelectedIndex(0);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, organizationId, supabaseClient]);

  const handleClose = () => {
    setInternalOpen(false);
    controlledOnClose?.();
  };

  const handleSelect = (item: SearchResultItem | RecentItem) => {
    // 최근 열람 스토어에 기록
    recordRecentItem({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      route: item.route,
      category: item.category as RecentItem['category'],
    });

    handleClose();
    if (onNavigate) {
      onNavigate(item.route);
    } else {
      window.location.href = item.route;
    }
  };

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentItems();
    setRecentList([]);
  };

  const activeItems = query.trim() ? results : recentList;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (activeItems.length > 0 ? (prev + 1) % activeItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (activeItems.length > 0 ? (prev - 1 + activeItems.length) % activeItems.length : 0));
    } else if (e.key === 'Enter' && activeItems.length > 0) {
      e.preventDefault();
      handleSelect(activeItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'customer':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold"><User className="w-2.5 h-2.5" />고객</span>;
      case 'product':
      case 'pass':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-semibold"><Package className="w-2.5 h-2.5" />이용권/상품</span>;
      case 'policy':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-semibold"><BookOpen className="w-2.5 h-2.5" />규정</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold"><Layers className="w-2.5 h-2.5" />메뉴</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* 검색 입력창 */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="고객명, 전화번호, 이용권, 매뉴얼을 검색하세요 (Ctrl+K 또는 /)..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* 결과 또는 최근 목록 */}
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">통합 검색 중...</div>
          ) : query && results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">검색 결과가 없습니다.</div>
          ) : !query ? (
            /* 최근 열람 목록 또는 안내문 */
            recentList.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    최근 열람한 항목
                  </span>
                  <button
                    onClick={handleClearRecents}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    기록 삭제
                  </button>
                </div>
                {recentList.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 border border-indigo-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(item.category)}
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-0.5">{item.subtitle}</div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                <div className="flex justify-center text-slate-300 mb-2">
                  <Command className="w-8 h-8" />
                </div>
                <p>어디서든 <kbd className="px-1.5 py-0.5 font-bold bg-slate-100 rounded">Ctrl + K</kbd> 또는 <kbd className="px-1.5 py-0.5 font-bold bg-slate-100 rounded">/</kbd> 키를 눌러보세요.</p>
                <p className="text-[11px] text-slate-400">고객, 상품, 매뉴얼, 공정 작업을 실시간으로 탐색합니다.</p>
              </div>
            )
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(item.category)}
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-0.5">{item.subtitle}</div>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 단축키 가이드 */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="font-semibold text-slate-600">↑↓</kbd> 이동</span>
            <span><kbd className="font-semibold text-slate-600">Enter</kbd> 선택</span>
          </div>
          <span>Moa-v2 OmniSearch Engine</span>
        </div>
      </div>
    </div>
  );
};
