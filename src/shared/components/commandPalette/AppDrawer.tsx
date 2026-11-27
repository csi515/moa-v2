import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function AppDrawer({ open, title, onClose, children }: Props) {
  const [offset, setOffset] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) setOffset(0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl"
        style={{ transform: `translateY(${offset}px)`, transition: startY.current === null ? 'transform 180ms ease' : 'none' }}
        onPointerDown={(event) => {
          startY.current = event.clientY;
        }}
        onPointerMove={(event) => {
          if (startY.current === null) return;
          setOffset(Math.max(0, event.clientY - startY.current));
        }}
        onPointerUp={() => {
          if (offset > 80) onClose();
          setOffset(0);
          startY.current = null;
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="flex min-h-12 items-center justify-between px-4">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" className="min-h-12 px-3 text-sm" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
