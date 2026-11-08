import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { HelpCircle, Info, X } from 'lucide-react';
import {
  getMicroGuide,
  type AcademyMicroGuideKey,
} from './microGuideCatalog';

export interface MicroGuideTooltipProps {
  guideKey?: AcademyMicroGuideKey;
  title?: string;
  content?: ReactNode;
  tip?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: 'sm' | 'md';
}

export const MicroGuideTooltip: React.FC<MicroGuideTooltipProps> = ({
  guideKey,
  title,
  content,
  tip,
  placement = 'top',
  className = '',
  iconSize = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const guide = guideKey ? getMicroGuide(guideKey) : null;
  const displayTitle = title || guide?.title;
  const displayContent = content || guide?.description;
  const displayTip = tip || guide?.tip;

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const sizeClass = iconSize === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle mx-1 ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
            return;
          }
          setIsOpen(false);
        }}
        aria-label={displayTitle ? `${displayTitle} 가이드 보기` : '도움말 가이드 보기'}
        className="text-slate-400 hover:text-indigo-600 focus:text-indigo-600 focus:outline-none transition-colors rounded-full p-0.5 hover:bg-indigo-50/70 cursor-pointer"
      >
        <HelpCircle className={sizeClass} />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 sm:w-72 max-w-[calc(100vw-32px)] p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xl text-left animate-in fade-in zoom-in-95 duration-150 pointer-events-auto ${
            placement === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : placement === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2'
              : placement === 'left'
              ? 'right-full top-1/2 -translate-y-1/2 mr-2'
              : 'left-full top-1/2 -translate-y-1/2 ml-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 말풍선 꼬리표 */}
          <div
            className={`absolute w-2 h-2 bg-white border-slate-200 rotate-45 ${
              placement === 'top'
                ? 'top-full -mt-1 left-1/2 -translate-x-1/2 border-r border-b'
                : 'bottom-full -mb-1 left-1/2 -translate-x-1/2 border-l border-t'
            }`}
          />

          <div className="relative z-10 space-y-1.5">
            {displayTitle && (
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{displayTitle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              {displayContent}
            </p>
            {displayTip && (
              <p className="text-[10px] text-indigo-700 bg-indigo-50/80 p-1.5 rounded-lg font-semibold leading-snug">
                {displayTip}
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
};
