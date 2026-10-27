import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutRow {
  keys: string[];
  description: string;
  category: '탐색' | '입력/작업' | '공통';
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['Ctrl', 'K'], description: '통합 옴니서치 (고객, 상품, 매뉴얼 검색)', category: '탐색' },
  { keys: ['/'], description: '빠른 검색창 포커스', category: '탐색' },
  { keys: ['?'], description: '단축키 가이드 모달 열기', category: '공통' },
  { keys: ['Esc'], description: '현재 열려있는 창/다이얼로그 닫기', category: '공통' },
  { keys: ['Alt', 'N'], description: '신규 고객/예약 생성', category: '입력/작업' },
  { keys: ['↑', '↓'], description: '검색 결과 또는 목록 항목 탐색', category: '탐색' },
  { keys: ['Enter'], description: '선택 항목 열기 / 확인', category: '공통' },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // 입력창이 아닐 때 ? 키 입력 감지
      if (!isInput && e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomEvent = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('moa:keyboard-shortcuts', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('moa:keyboard-shortcuts', handleCustomEvent);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="키보드 단축키 안내"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">카운터 데스크 키보드 단축키</h2>
              <p className="text-[11px] text-slate-500">빠른 현장 응대를 위해 단축키를 활용하세요.</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
          {(['탐색', '입력/작업', '공통'] as const).map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="pt-3 first:pt-0">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {cat}
                </div>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 text-xs"
                    >
                      <span className="text-slate-700 font-medium">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 font-bold bg-white border rounded text-[10px]">ESC</kbd> 키를 누르면 닫힙니다.
        </div>
      </div>
    </div>
  );
};
