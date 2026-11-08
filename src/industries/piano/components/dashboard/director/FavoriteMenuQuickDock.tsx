import React, { useState, useEffect, useMemo, type FC } from 'react';
import {
  Star,
  Settings2,
  X,
  Check,
  Home,
  Users,
  Calendar,
  CheckCircle2,
  CreditCard,
  BookOpen,
  MessageSquare,
  Music,
  Award,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  PIANO_AVAILABLE_MENU_CATALOG,
  DEFAULT_PIANO_FAVORITE_TABS,
  MAX_FAVORITE_DOCK_ITEMS,
  loadFavoriteTabs,
  saveFavoriteTabs,
  toggleFavoriteTab,
  type AvailableMenuItem,
} from './favoriteMenuHelpers';

interface Props {
  onNavigate: (tab: any) => void;
  activeTab?: string;
}

export const FavoriteMenuQuickDock: FC<Props> = ({ onNavigate, activeTab }) => {
  const { showToast } = useApp();
  const [favoriteTabs, setFavoriteTabs] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempFavorites, setTempFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteTabs(loadFavoriteTabs());
  }, []);

  const handleOpenEdit = () => {
    setTempFavorites([...favoriteTabs]);
    setIsEditModalOpen(true);
  };

  const handleToggle = (tab: string) => {
    const res = toggleFavoriteTab(tempFavorites, tab, MAX_FAVORITE_DOCK_ITEMS);
    if (res.isLimitReached) {
      showToast(`즐겨찾기 메뉴는 최대 ${MAX_FAVORITE_DOCK_ITEMS}개까지 선택할 수 있습니다.`, 'warning');
      return;
    }
    setTempFavorites(res.tabs);
  };

  const handleSaveFavorites = () => {
    if (tempFavorites.length === 0) {
      showToast('최소 1개 이상의 메뉴를 즐겨찾기로 선택해 주세요.', 'warning');
      return;
    }
    saveFavoriteTabs(tempFavorites);
    setFavoriteTabs(tempFavorites);
    setIsEditModalOpen(false);
    showToast('⭐ 나만의 즐겨찾기 메뉴가 저장되었습니다.', 'success');
  };

  const handleResetDefaults = () => {
    setTempFavorites([...DEFAULT_PIANO_FAVORITE_TABS]);
    showToast('기본 추천 6대 메뉴로 초기화되었습니다.', 'info');
  };

  const favoriteMenuItems = useMemo(() => {
    const map = new Map(PIANO_AVAILABLE_MENU_CATALOG.map((m) => [m.tab, m]));
    return favoriteTabs.map((t) => map.get(t)).filter((m): m is AvailableMenuItem => Boolean(m));
  }, [favoriteTabs]);

  const renderIcon = (type: AvailableMenuItem['iconType'], className = 'w-4 h-4') => {
    switch (type) {
      case 'home':
        return <Home className={className} />;
      case 'users':
        return <Users className={className} />;
      case 'calendar':
        return <Calendar className={className} />;
      case 'check_circle':
        return <CheckCircle2 className={className} />;
      case 'credit_card':
        return <CreditCard className={className} />;
      case 'book_open':
        return <BookOpen className={className} />;
      case 'message':
        return <MessageSquare className={className} />;
      case 'music':
        return <Music className={className} />;
      case 'award':
        return <Award className={className} />;
      case 'wallet':
        return <Wallet className={className} />;
      default:
        return <Home className={className} />;
    }
  };

  return (
    <>
      {/* 1. 홈 상단 나만의 즐겨찾기 퀵 독(Dock) 바 */}
      <section className="bg-gradient-to-r from-amber-500/10 via-indigo-50/50 to-slate-50 border border-amber-200/60 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
            <h3 className="text-xs font-black text-slate-800 tracking-tight">
              나만의 즐겨찾기 퀵 독 (Quick Dock)
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              · 자주 쓰는 메뉴 {favoriteMenuItems.length}개 고정
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all shadow-2xs cursor-pointer hover:border-amber-300"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span>메뉴 편집</span>
          </button>
        </div>

        {/* 퀵 독 칩 버튼 리스트 (가로 스크롤 가능) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {favoriteMenuItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigate(item.tab)}
                title={item.description}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white hover:bg-indigo-50/60 text-slate-700 border border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                <span className={isActive ? 'text-amber-300' : 'text-indigo-600'}>
                  {renderIcon(item.iconType, 'w-4 h-4')}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. 즐겨찾기 편집 모달 */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsEditModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    나만의 즐겨찾기 메뉴 편집
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    자주 쓰는 메뉴를 최대 {MAX_FAVORITE_DOCK_ITEMS}개까지 선택하세요 ({tempFavorites.length}/{MAX_FAVORITE_DOCK_ITEMS})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 메뉴 선택 그리드 */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PIANO_AVAILABLE_MENU_CATALOG.map((item) => {
                  const isChecked = tempFavorites.includes(item.tab);
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => handleToggle(item.tab)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {renderIcon(item.iconType, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            {item.label}
                          </span>
                          {isChecked && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 모달 풋터 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>기본값 복원</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveFavorites}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
