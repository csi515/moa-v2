import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

export interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * AppDrawer: 모바일 카운터 인터랙션 공통 반응형 바텀시트
 * 
 * - 모바일(lg 미만): 화면 하단에서 슬라이드 업되는 바텀시트 (핸들바, 스와이프 닫기, Safe Area 준수).
 * - 데스크톱(lg 이상): 우측 슬라이드 인 사이드 패널(Sheet)로 자동 승격되어 작업 맥락 보존.
 * - 뒷배경 스크롤 방지 및 필터 상태 100% 보존.
 */
export const AppDrawer: React.FC<AppDrawerProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = '',
}) => {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 선언적 ESC 키 닫기
  useEscapeKey(() => onOpenChange(false), open);

  // 모달 활성화 시 배경 스크롤 방지
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  // 모바일 스와이프 다운 제스처 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    // 아래로 드래그할 때만 오프셋 적용
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 90) {
      onOpenChange(false);
    }
    setTouchStartY(null);
    setDragOffset(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 백드롭 (Backdrop) */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* 시트 컨테이너 (모바일: 바텀시트, 데스크톱: 우측 사이드 패널) */}
      <div
        ref={sheetRef}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: touchStartY === null ? 'transform 0.2s ease-out' : 'none',
        }}
        className={`relative z-10 w-full bg-white shadow-2xl flex flex-col
          rounded-t-3xl lg:rounded-t-none lg:rounded-l-3xl
          max-h-[92dvh] lg:max-h-full lg:h-full lg:w-[460px] xl:w-[520px]
          animate-in slide-in-from-bottom lg:slide-in-from-right duration-250 ease-out
          ${className}`}
      >
        {/* 모바일 스와이프 드래그 핸들 (Thumb Zone) */}
        <div
          className="lg:hidden w-full flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* 헤더 영역 */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="pr-4">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 본문 영역 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {/* 하단 고정 푸터 (엄지존 48px 버튼 배치 및 Safe Area 여백 준수) */}
        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-slate-50/80 backdrop-blur-xs">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
