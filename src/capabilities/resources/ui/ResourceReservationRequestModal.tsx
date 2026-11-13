import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import React, { useEffect,  useState } from 'react';
import {
  X,
  Calendar,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react';
import type { Resource, ResourceReservation } from '../types';
import { resourceRangesOverlap, isBlockingReservationStatus } from '../overlap';
import {
  requestResourceReservation,
  requestMemberResourceReservation,
  determineInitialReservationStatus,
} from '../reservationService';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { createApprovalWithChosenLine } from '@/capabilities/approval_workflow/services/approvalWorkflowService';

interface ResourceReservationRequestModalProps {
  organizationId: string;
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingReservations?: ResourceReservation[];
  defaultDate?: string; // YYYY-MM-DD
  defaultStartTime?: string; // HH:mm
  defaultEndTime?: string; // HH:mm
  currentUserId?: string;
  /** 세션에서 주입된 표시명(수기 선택 제거) */
  requesterDisplayName?: string;
  requesterDepartmentName?: string;
  /**
   * member: 사내 직원(request_member_room_reservation, require_approval 시 pending).
   * customer: 학원 고객 신청(request_room_reservation, pending 가능).
   */
  bookingMode?: 'member' | 'customer';
  /** require_approval 시 전자결재 연계에 사용 */
  approvalMembers?: Array<{ userId: string; name: string }>;
  enableApprovalWorkflow?: boolean;
}

export const ResourceReservationRequestModal: React.FC<ResourceReservationRequestModalProps> = ({
  organizationId,
  resource,
  isOpen,
  onClose,
  onSuccess,
  existingReservations = [],
  defaultDate,
  defaultStartTime = '10:00',
  defaultEndTime = '11:00',
  currentUserId,
  requesterDisplayName,
  requesterDepartmentName,
  bookingMode = 'member',
  approvalMembers = [],
  enableApprovalWorkflow = false,
}) => {
  const [date, setDate] = useState<string>(
    defaultDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>(defaultStartTime);
  const [endTime, setEndTime] = useState<string>(defaultEndTime);
  const [purpose, setPurpose] = useState<string>('');
  const [attendees, setAttendees] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');

  const sessionUser = useActiveUser();
  const displayName =
    requesterDisplayName?.trim() ||
    sessionUser?.name ||
    sessionUser?.email ||
    '로그인 사용자';
  const departmentLabel = requesterDepartmentName?.trim() || '세션 부서 자동 적용';

  if (!isOpen || !resource) return null;

  const metadata = (resource.metadata || {}) as Record<string, any>;
  const isRequireApproval = determineInitialReservationStatus(resource) === 'pending';
  const approverLabel = metadata.approver_name || '지정 관리자';
  const needsApprovalLine =
    bookingMode === 'member' && isRequireApproval && enableApprovalWorkflow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setErrorMessage('사용 목적을 입력해주세요.');
      return;
    }
    if (startTime >= endTime) {
      setErrorMessage('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    // ISO 일시 구성
    const startsAt = `${date}T${startTime}:00+09:00`;
    const endsAt = `${date}T${endTime}:00+09:00`;

    // overlap.ts를 활용한 동일 시간대 중복 예약 검증
    const conflicting = existingReservations.find((res) => {
      if (res.resourceId !== resource.id) return false;
      if (!isBlockingReservationStatus(res.status)) return false;
      return resourceRangesOverlap(startsAt, endsAt, res.starts_at, res.ends_at);
    });

    if (conflicting) {
      const conflictStart = conflicting.starts_at.substring(11, 16);
      const conflictEnd = conflicting.ends_at.substring(11, 16);
      setErrorMessage(
        `이미 해당 시간대(${conflictStart} ~ ${conflictEnd})에 다른 예약(${conflicting.status === 'pending' ? '승인 대기' : '확정'})이 존재합니다.`
      );
      return;
    }

    const fullMemo = [
      purpose.trim() ? `[목적] ${purpose.trim()}` : '',
      attendees.trim() ? `[참석/동승자] ${attendees.trim()}` : '',
      memo.trim() ? `[메모] ${memo.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    if (needsApprovalLine) {
      if (!reviewerId || !approverId) {
        setErrorMessage('검토자와 최종 승인자를 선택해 주세요.');
        return;
      }
      if (reviewerId === approverId) {
        setErrorMessage('검토자와 최종 승인자는 서로 다른 사람이어야 합니다.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        organizationId,
        resourceId: resource.id,
        startsAt,
        endsAt,
        memo: fullMemo,
      };
      let reservationId: string;
      if (bookingMode === 'member') {
        reservationId = await requestMemberResourceReservation(payload);
      } else {
        reservationId = await requestResourceReservation(payload);
      }

      if (needsApprovalLine && currentUserId) {
        const reviewer = approvalMembers.find((m) => m.userId === reviewerId);
        const approver = approvalMembers.find((m) => m.userId === approverId);
        if (!reviewer || !approver) {
          throw new Error('결재선 구성원을 확인할 수 없습니다.');
        }
        await createApprovalWithChosenLine({
          organizationId,
          title: `[공용자원 예약] ${resource.name} (${date} ${startTime}~${endTime})`,
          content: {
            purpose: purpose.trim(),
            memo: fullMemo,
            starts_at: startsAt,
            ends_at: endsAt,
          },
          requesterId: currentUserId,
          requesterName: displayName,
          reviewer: { userId: reviewer.userId, name: reviewer.name },
          approver: { userId: approver.userId, name: approver.name },
          entityType: 'resource_reservation',
          entityId: reservationId,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '예약 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEscapeKey(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden cursor-default">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">공용 자원 예약 신청</h3>
              <p className="text-xs text-slate-500">{resource.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {bookingMode === 'member' ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
              <User className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <span className="font-bold">{displayName}</span>
                <span className="mx-1 text-slate-400">·</span>
                <span>{departmentLabel}</span>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  로그인 세션 기준으로 예약자가 자동 지정됩니다. 이름·부서를 다시 고르지 않습니다.
                </p>
              </div>
            </div>
          ) : null}

          {/* 승인 안내 배너 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              isRequireApproval
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {isRequireApproval ? (
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold block">
                  {isRequireApproval
                    ? '승인 대기 자원 (결재 후 확정)'
                    : '즉시 확정 자원 (신청 즉시 예약)'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isRequireApproval
                    ? `승인권자: [${approverLabel}] 검토 후 승인 완료`
                    : '별도 승인 없이 달력에 즉시 확정 등록됩니다.'}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isRequireApproval
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isRequireApproval ? '승인필요' : '즉시확정'}
            </span>
          </div>

          {needsApprovalLine ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-700">
                검토자
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  required
                >
                  <option value="">선택</option>
                  {approvalMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                최종 승인자
                <select
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  required
                >
                  <option value="">선택</option>
                  {approvalMembers.map((m) => (
                    <option key={`ap-${m.userId}`} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="sm:col-span-2 text-[11px] text-slate-500">
                결재함에서 승인되면 예약이 확정됩니다. 기본 승인권자 안내: {approverLabel}
              </p>
            </div>
          ) : null}

          {/* 일자 및 시간 선택 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                예약 날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* 사용 목적 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              사용 목적 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: 고객사 외근 미팅, 4분기 부서 주간회의, 임직원 건강상담"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 참석자 / 동승자 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              참석자 / 동승자 (선택)
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="예: 김철수 팀장, 박영희 주임 (외 2명)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 비고 / 추가 요청 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              추가 요청사항 (선택)
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 다과 준비 필요, 유류카드 수령 요청"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting ? '신청 처리 중...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isRequireApproval ? '승인 결재 신청' : '예약 즉시 확정'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceReservationRequestModal;
