import React, { useState, useRef } from 'react';
import { X, Loader2, Shield, CheckCircle2, RotateCcw, PenTool } from 'lucide-react';
import { getPlaceLabel } from '@/core/industry/industryUi';
import type { OrganizationSearchResult } from '@/core/parent/services/enrollmentRequestService';
import type { GlobalStudent } from '@/core/parent/types/globalParent';
import {
  SHARED_CHILD_FIELD_LABELS,
  DEFAULT_SHARED_CHILD_FIELDS,
  sharedFieldPreview,
} from '@/core/parent/services/parentChildService';

interface ParentEnrollmentConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationSearchResult;
  student: GlobalStudent;
  onConfirm: (consentFields: string[], notes?: string) => Promise<void>;
}

export const ParentEnrollmentConsentModal: React.FC<ParentEnrollmentConsentModalProps> = ({
  isOpen,
  onClose,
  organization,
  student,
  onConfirm,
}) => {
  const [consentFields, setConsentFields] = useState<string[]>([...DEFAULT_SHARED_CHILD_FIELDS]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모바일 Canvas 서명 드로잉 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  const place = getPlaceLabel(organization.industryType);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    lastPointRef.current = null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPointRef.current = { x: currentX, y: currentY };
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = async () => {
    if (consentFields.length === 0) {
      setError('최소 하나 이상의 정보 제공에 동의해야 합니다');
      return;
    }
    if (!hasSigned) {
      setError('하단 서명 패드에 학부모 서명을 완료해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(consentFields, notes.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 요청에 실패했습니다');
      setLoading(false);
    }
  };

  const toggleField = (field: string) => {
    if (consentFields.includes(field)) {
      setConsentFields(consentFields.filter((f) => f !== field));
    } else {
      setConsentFields([...consentFields, field]);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-lg">정보 제공 동의</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" disabled={loading}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-sm font-bold text-indigo-900 mb-2">등록 정보</p>
          <div className="space-y-1 text-sm text-indigo-800">
            <p>• 자녀: <span className="font-bold">{student.displayName}</span></p>
            <p>• {place}: <span className="font-bold">{organization.name}</span></p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {place}에 자녀 등록을 요청합니다. 아래 정보가 {place}에 공유됩니다.
          {place} 승인 후 정식 등록이 완료됩니다.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-xs text-rose-700">{error}</div>
        )}

        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2">제공 정보 선택</p>
          <div className="space-y-2">
            {DEFAULT_SHARED_CHILD_FIELDS.map((field) => (
              <label
                key={field}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={consentFields.includes(field)}
                  onChange={() => toggleField(field)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  disabled={loading}
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {SHARED_CHILD_FIELD_LABELS[field]}
                  </p>
                  <p className="text-xs text-slate-500">{sharedFieldPreview(field, student)}</p>
                </div>
                {consentFields.includes(field) && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">{place}에 전달할 메시지 (선택)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 오전반 희망합니다"
              rows={3}
              maxLength={500}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{notes.length} / 500</p>
          </label>
        </div>

        {/* 학부모 모바일 전자 서명 패드 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>학부모 전자 서명 (필수)</span>
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={loading || !hasSigned}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>서명 지우기</span>
            </button>
          </div>
          <div className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              width={380}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[140px] cursor-crosshair block"
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                여기에 손가락이나 펜으로 정자 서명하세요
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
          <p className="text-xs font-bold text-amber-900 mb-1">⚠️ 유의사항</p>
          <ul className="text-xs text-amber-800 space-y-0.5">
            <li>• {place} 승인 후 정식 등록이 완료됩니다</li>
            <li>• 승인/거절 여부는 알림으로 안내됩니다</li>
            <li>• 승인 후 {place} 포털에서 자녀 정보를 확인할 수 있습니다</li>
          </ul>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 min-h-[48px] h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || consentFields.length === 0 || !hasSigned}
            className="flex-1 min-h-[48px] h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            동의 및 서명 제출
          </button>
        </div>
      </div>
    </div>
  );
};
