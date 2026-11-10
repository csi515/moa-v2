import React, { useState } from 'react';
import { X, Check, XCircle, Calendar, Clock, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import {
  approveMakeupRequest,
  rejectMakeupRequest,
  type MakeupRequest,
} from '@/capabilities/makeup_lesson_pass/infrastructure/makeupLessonStorage';
import {
  createTemporaryMoveRecord,
  saveTemporaryMove,
} from '../schedule/studentTemporaryMoveHelpers';
import { weekdayFromDate } from '@/shared/utils/weekdayKo';
import type { DayOfWeek } from '@/core/staff/workWindow';

export interface PendingMakeupRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: MakeupRequest[];
  organizationId: string;
  reviewerName?: string;
  onProcessed?: () => void;
}

export const PendingMakeupRequestsModal: React.FC<PendingMakeupRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  organizationId,
  reviewerName = '원장님',
  onProcessed,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  if (!isOpen) return null;

  const handleApprove = (req: MakeupRequest) => {
    // 1. 보강 신청 승인 및 토큰 reserved 자동 전이
    const result = approveMakeupRequest(req.id, reviewerName);
    if (!result) return;

    // 2. 해당 날짜 시간표에 1회 임시 보강 자동 배정
    try {
      const targetDayKo = weekdayFromDate(new Date(req.preferredDate)) as DayOfWeek;
      const tempRecord = createTemporaryMoveRecord({
        studentId: req.studentId,
        studentName: req.studentName,
        originalDay: targetDayKo,
        originalStartTime: req.preferredTime,
        targetDay: targetDayKo,
        targetStartTime: req.preferredTime,
        targetDate: req.preferredDate,
        memo: `[보강 승인] 결석(${req.originDate}) 건 보강 / 학부모 메모: ${req.memo || '없음'}`,
      });
      saveTemporaryMove(tempRecord);
    } catch (err) {
      console.error('[PendingMakeupRequestsModal] Failed to create temp move:', err);
    }

    onProcessed?.();
  };

  const handleReject = (req: MakeupRequest) => {
    if (!rejectReason.trim()) return;
    rejectMakeupRequest(req.id, rejectReason.trim(), reviewerName);
    setRejectingId(null);
    setRejectReason('');
    onProcessed?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-makeups-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div>
            <h2 id="pending-makeups-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>학부모 보강 신청 목록</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {requests.length}건 대기
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              승인 시 해당 일자 시간표에 자동으로 보강 학생이 배정됩니다
            </p>
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

        {/* 본문 리스트 */}
        <div className="p-5 overflow-y-auto space-y-4">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              대기 중인 보강 신청이 없습니다.
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">{req.studentName}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        결석일: {req.originDate}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-indigo-900 bg-indigo-50/70 px-2.5 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>희망 일시: <strong>{req.preferredDate} {req.preferredTime}</strong></span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    대기 중
                  </span>
                </div>

                {req.memo && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-sans">{req.memo}</span>
                  </div>
                )}

                {/* 반려 입력 폼 */}
                {rejectingId === req.id ? (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="반려 사유 입력 (예: 해당 시간 정원 초과로 17시로 조율 부탁드립니다)"
                      className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(req)}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                      >
                        반려 확정
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 승인 / 반려 액션 버튼 */
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectingId(req.id)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      반려·시간조율
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      승인 및 시간표 자동 배정
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
