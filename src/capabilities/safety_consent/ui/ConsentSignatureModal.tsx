import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { buildConsentSubmission, nextConsentStatus } from '../domain/safetyConsentEngine';

const REQUIRED = ['개인정보', '안전수칙', '환불규정'] as const;

type Props = { openOnMount?: boolean };

export function ConsentSignatureModal({ openOnMount = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(openOnMount);
  const [status, setStatus] = useState<'REQUIRED' | 'SIGNED'>('REQUIRED');
  const [saved, setSaved] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let drawing = false;
    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const start = (event: PointerEvent) => {
      drawing = true;
      const p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
    };
    const move = (event: PointerEvent) => {
      if (!drawing) return;
      const p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    };
    const end = () => {
      drawing = false;
    };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
    };
  }, [open]);

  function submit() {
    const signature = canvasRef.current?.toDataURL('image/png') ?? '';
    const record = buildConsentSubmission({ version: 1, signature });
    setStatus(nextConsentStatus('REQUIRED', true));
    setSaved(`${record.consented_at} / v${record.consent_version}`);
    setOpen(false);
  }

  if (status === 'SIGNED' && !open) {
    return <p className="text-xs text-emerald-700">동의 기록 {saved}</p>;
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="필수 동의서"
      maxWidth="md"
      intent="form"
    >
      <div className="space-y-4">
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          {REQUIRED.map((item) => (
            <li key={item} className="font-medium text-slate-700">{item} 동의</li>
          ))}
        </ul>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">자필 전자서명</label>
          <canvas
            ref={canvasRef}
            width={320}
            height={140}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 touch-none cursor-crosshair"
          />
        </div>
        <button
          type="button"
          className="min-h-[48px] w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-black transition-colors cursor-pointer"
          onClick={submit}
        >
          서명 제출
        </button>
      </div>
    </Modal>
  );
}
