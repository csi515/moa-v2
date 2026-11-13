import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import React, { useState, useEffect, type FC } from 'react';
import {
  Zap,
  X,
  UserPlus,
  CheckCircle2,
  CreditCard,
  Piano,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StudentFormModal } from '@/capabilities/roster';
import {
  PIANO_QUICK_ACTIONS,
  resolveQuickActionBehavior,
  type QuickActionId,
} from './pianoQuickActionHelpers';

export const PianoQuickActionBottomSheet: FC = () => {
  const { setActiveTab, showToast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);

  // ESC 키로 바텀시트 닫기
  useEscapeKey(() => setIsOpen(false), isOpen);

  const handleActionClick = (actionId: QuickActionId) => {
    const behavior = resolveQuickActionBehavior(actionId);
    setIsOpen(false);

    if (behavior.openStudentForm) {
      setShowStudentForm(true);
    } else if (behavior.navTab) {
      setActiveTab(behavior.navTab as any);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user_plus':
        return <UserPlus className="w-5 h-5 text-indigo-600" />;
      case 'check_circle':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-violet-600" />;
      case 'piano':
        return <Piano className="w-5 h-5 text-amber-600" />;
      default:
        return <Zap className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getThemeBg = (color: string) => {
    switch (color) {
      case 'indigo':
        return 'bg-indigo-50 border-indigo-100 text-indigo-700';
      case 'emerald':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'violet':
        return 'bg-violet-50 border-violet-100 text-violet-700';
      case 'amber':
        return 'bg-amber-50 border-amber-100 text-amber-700';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  return (
    <>
      {/* 1. 모바일 한 손 플로팅 퀵 액션 버튼 (FAB) - 하단바 위 골든 터치존 */}
      <aside aria-label="모바일 바로 처리 액션" className="md:hidden fixed bottom-18 right-3 sm:right-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="자주 쓰는 업무 열기"
          className="group min-h-[48px] px-3.5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white font-black text-xs shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-1.5 border border-indigo-400/40 ring-4 ring-indigo-500/10 cursor-pointer"
        >
          <div className="relative">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <span className="tracking-tight">자주 쓰는 업무</span>
        </button>
      </aside>

      {/* 2. 한 손 엄지 전용 바텀 액션 시트 오버레이 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end transition-opacity"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="한 손 전용 바로 처리 시트"
        >
          <div
            className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단 드래그 핸들 & 헤더 */}
            <div className="space-y-3">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      자주 쓰는 업무 (한 손 바로가기)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      레슨 중에도 엄지손가락 1탭으로 핵심 업무 처리
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4대 핵심 액션 리스트 */}
            <div className="space-y-2.5 pt-1">
              {PIANO_QUICK_ACTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleActionClick(item.id)}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 active:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 transition-all flex items-center justify-between gap-3 min-h-[58px] cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${getThemeBg(
                        item.themeColor
                      )}`}
                    >
                      {getIcon(item.iconType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-600 text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>

            {/* 하단 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 3. 신규 원생 등록 모달 (어느 탭에서든 즉시 팝업 오픈) */}
      {showStudentForm && (
        <StudentFormModal
          isOpen={showStudentForm}
          onClose={() => setShowStudentForm(false)}
          onSaved={() => {
            setShowStudentForm(false);
            showToast('🎉 신규 원생이 성공적으로 등록되었습니다.', 'success');
          }}
        />
      )}
    </>
  );
};
