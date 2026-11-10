import React, { useState } from 'react';
import { X, Calendar, Clock, Ticket, AlertCircle, Send } from 'lucide-react';
import {
  createMakeupRequest,
  type MakeupRequest,
} from '@/capabilities/makeup_lesson_pass/infrastructure/makeupLessonStorage';
import type { MakeupToken } from '@/capabilities/makeup_lesson_pass/domain/makeupLessonEngine';

export interface ParentMakeupRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: (MakeupToken & { daysRemaining: number }) | null;
  studentId: string;
  studentName: string;
  organizationId: string;
  onRequested?: (request: MakeupRequest) => void;
}

export const ParentMakeupRequestModal: React.FC<ParentMakeupRequestModalProps> = ({
  isOpen,
  onClose,
  token,
  studentId,
  studentName,
  organizationId,
  onRequested,
}) => {
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [preferredTime, setPreferredTime] = useState<string>('15:00');
  const [memo, setMemo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !token) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate) {
      setErrorMessage('희망 보강 날짜를 선택해 주세요.');
      return;
    }

    if (preferredDate < todayStr) {
      setErrorMessage('오늘 이후의 날짜를 선택해 주세요.');
      return;
    }

    if (preferredDate > token.expiresAt) {
      setErrorMessage(`보강권 유효기간(~${token.expiresAt}) 이내의 날짜를 선택해 주세요.`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const request = createMakeupRequest({
        organizationId,
        tokenId: token.id,
        studentId,
        studentName,
        originDate: token.originDate,
        preferredDate,
        preferredTime,
        memo,
      });

      onRequested?.(request);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('신청 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="makeup-request-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Ticket className="w-4 h-4" />
            </span>
            <div>
              <h2 id="makeup-request-modal-title" className="text-base font-bold text-slate-900">
                보강 수업 신청
              </h2>
              <p className="text-xs text-slate-500">
                원장님께 보강 희망 일정을 제출합니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 보강권 요약 배너 */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span>{studentName} 학생 보강권 (1회)</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
                D-{token.daysRemaining}일 남음
              </span>
            </div>
            <div className="text-[11px] text-indigo-700/90 flex items-center justify-between">
              <span>결석일자: <strong>{token.originDate}</strong></span>
              <span>유효기간: <strong>~{token.expiresAt}까지</strong></span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 희망 날짜 */}
          <div className="space-y-1.5">
            <label htmlFor="pref-date" className="block text-xs font-bold text-slate-700">
              희망 보강 날짜
            </label>
            <div className="relative">
              <input
                id="pref-date"
                type="date"
                min={todayStr}
                max={token.expiresAt}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              * 보강권 유효기간(~{token.expiresAt}) 내 평일/주말을 선택해 주세요.
            </p>
          </div>

          {/* 희망 시간 */}
          <div className="space-y-1.5">
            <label htmlFor="pref-time" className="block text-xs font-bold text-slate-700">
              희망 시간대
            </label>
            <select
              id="pref-time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="13:00">13:00 (오후 1시)</option>
              <option value="14:00">14:00 (오후 2시)</option>
              <option value="15:00">15:00 (오후 3시)</option>
              <option value="16:00">16:00 (오후 4시)</option>
              <option value="17:00">17:00 (오후 5시)</option>
              <option value="18:00">18:00 (오후 6시)</option>
              <option value="19:00">19:00 (오후 7시)</option>
            </select>
          </div>

          {/* 전달사항 메모 */}
          <div className="space-y-1.5">
            <label htmlFor="pref-memo" className="block text-xs font-bold text-slate-700">
              원장님께 전달할 말씀 (선택)
            </label>
            <textarea
              id="pref-memo"
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 셔틀 차량 탑승 가능한지 문의드립니다."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            💡 신청하신 시간은 원장님의 확인 및 정원 여유 확인 후 최종 확정되며, 확정 시 알림으로 안내해 드립니다.
          </p>

          {/* 하단 버튼 */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              보강 신청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
