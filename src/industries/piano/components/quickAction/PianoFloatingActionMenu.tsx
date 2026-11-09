import React, { useState } from 'react';
import { Plus, X, CheckSquare, Edit3, DoorOpen, Music } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface PianoFloatingActionMenuProps {
  className?: string;
}

/**
 * 피아노 레슨실 순회 강사용 모바일 플로팅 액션 메뉴 (FAB)
 *
 * 방과 후 레슨 시간에 연습실을 오가며 한 손 엄지만으로
 * 출결 확인, 레슨 노트 기록, 연습실 퀵 입실을 1초 만에 실행.
 */
export const PianoFloatingActionMenu: React.FC<PianoFloatingActionMenuProps> = ({
  className = '',
}) => {
  const { setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (tabKey: string) => {
    setActiveTab(tabKey);
    setIsOpen(false);
  };

  return (
    <>
      {/* 딤 오버레이 (열려 있을 때만) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 transition-opacity md:hidden"
        />
      )}

      {/* FAB 컨테이너 (모바일/소형 화면 우하단 고정) */}
      <div
        className={`fixed right-4 bottom-20 z-50 flex flex-col items-end gap-2.5 md:hidden select-none ${className}`}
      >
        {/* 펼쳐지는 하위 액션 버튼들 */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* 1. 연습실 배정 */}
            <button
              type="button"
              onClick={() => handleAction('practice-rooms')}
              className="flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-full bg-white text-slate-800 shadow-lg border border-slate-200/90 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold">연습실 배정</span>
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <DoorOpen className="w-4 h-4" />
              </span>
            </button>

            {/* 2. 수업 노트 기록 */}
            <button
              type="button"
              onClick={() => handleAction('today-lesson')}
              className="flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-full bg-white text-slate-800 shadow-lg border border-slate-200/90 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold">수업 노트 기록</span>
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Edit3 className="w-4 h-4" />
              </span>
            </button>

            {/* 3. 출결 체크 */}
            <button
              type="button"
              onClick={() => handleAction('attendance')}
              className="flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-full bg-white text-slate-800 shadow-lg border border-slate-200/90 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold">출결 체크</span>
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}

        {/* 메인 트리거 버튼 */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-200 cursor-pointer active:scale-90 ${
            isOpen
              ? 'bg-slate-800 rotate-45 ring-4 ring-slate-300'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
          }`}
          aria-label="빠른 레슨 액션 메뉴"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
};
