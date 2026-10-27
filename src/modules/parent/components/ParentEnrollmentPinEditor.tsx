import React, { useState } from 'react';
import { KeyRound, Loader2, RefreshCw, X } from 'lucide-react';
import {
  ENROLLMENT_STATUS_LABELS,
  ACTIVE_ENROLLMENT_STATUSES,
  type StudentEnrollment,
} from '@/core/parent/types/globalParent';
import {
  parentClearChildCheckInPin,
  parentGenerateChildCheckInPin,
  parentPinErrorMessage,
  parentSetChildCheckInPin,
} from '@/core/parent/services/parentChildPinService';

interface ParentEnrollmentPinEditorProps {
  childName: string;
  enrollment: StudentEnrollment;
  onUpdated: () => void | Promise<void>;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** 학원별 자녀 출입 PIN 설정 모달 */
export const ParentEnrollmentPinEditor: React.FC<ParentEnrollmentPinEditorProps> = ({
  childName,
  enrollment,
  onUpdated,
  onClose,
  showToast,
}) => {
  const [customPin, setCustomPin] = useState('');
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canEdit = ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status);
  const pinSet = enrollment.checkInPinSet;

  const handleResult = async (ok: boolean, error?: Parameters<typeof parentPinErrorMessage>[0]) => {
    if (!ok && error) {
      showToast(parentPinErrorMessage(error), 'error');
      return false;
    }
    await onUpdated();
    return true;
  };

  const handleSaveCustom = async () => {
    setLoading(true);
    try {
      const result = await parentSetChildCheckInPin(
        enrollment.organizationId,
        enrollment.customerId,
        customPin
      );
      if (!result.success) {
        await handleResult(false, result.error);
        return;
      }
      setRevealedPin(customPin);
      setCustomPin('');
      showToast(`${childName}님 PIN이 저장되었습니다.`, 'success');
      await handleResult(true);
    } catch {
      showToast('PIN 저장에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await parentGenerateChildCheckInPin(
        enrollment.organizationId,
        enrollment.customerId
      );
      if (!result.success || !result.pin) {
        await handleResult(false, result.error);
        return;
      }
      setRevealedPin(result.pin);
      showToast(`${childName}님 PIN이 발급되었습니다.`, 'success');
      await handleResult(true);
    } catch {
      showToast('PIN 발급에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      const result = await parentClearChildCheckInPin(
        enrollment.organizationId,
        enrollment.customerId
      );
      if (!result.success) {
        await handleResult(false, result.error);
        return;
      }
      setRevealedPin(null);
      setCustomPin('');
      showToast('PIN이 삭제되었습니다.', 'info');
      await handleResult(true);
    } catch {
      showToast('PIN 삭제에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="pin-editor-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{enrollment.organizationName}</p>
            <h2 id="pin-editor-title" className="text-lg font-black text-slate-900 truncate">
              {childName} 출입 PIN
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              상태: {ENROLLMENT_STATUS_LABELS[enrollment.status]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {!canEdit ? (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
            퇴원·졸업된 기록은 PIN을 변경할 수 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">출결 PIN</span>
              <span
                className={`text-[10px] font-bold ml-auto ${pinSet ? 'text-emerald-600' : 'text-rose-500'}`}
              >
                {pinSet ? '설정됨' : '미설정'}
              </span>
            </div>

            {revealedPin && (
              <div className="bg-indigo-600 text-white rounded-xl p-3 text-center">
                <p className="text-[10px] opacity-80">발급·저장된 PIN (한 번만 표시)</p>
                <p className="text-2xl font-black tracking-[0.3em] font-mono mt-1">{revealedPin}</p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              자녀마다 다른 PIN을 설정해 주세요. 같은 학원의 다른 회원과 중복될 수 없습니다.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="직접 입력 (4~8자리)"
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl font-mono min-h-[44px]"
              />
              <button
                type="button"
                disabled={loading || customPin.length < 4}
                onClick={() => void handleSaveCustom()}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[44px]"
              >
                저장
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGenerate()}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                PIN 자동 발급
              </button>
              {pinSet && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleClear()}
                  className="px-4 py-3 bg-white border border-rose-200 rounded-xl text-xs font-bold text-rose-600 min-h-[44px]"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
