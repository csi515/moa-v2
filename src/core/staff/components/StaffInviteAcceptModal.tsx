import React, { useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import {
  acceptStaffInvite,
  formatStaffInviteCode,
  normalizeStaffInviteCode,
  previewStaffInvite,
  type AcceptStaffInviteResult,
  type StaffInvitePreview,
} from '@/core/staff/services/staffAccountService';

interface StaffInviteAcceptModalProps {
  initialCode?: string | null;
  onClose: () => void;
  onAccepted: (result: AcceptStaffInviteResult) => void | Promise<void>;
}

/** 교직원 초대 수락: 코드 확인(사업장 이름 표시) → 사용자가 명시적으로 수락 */
export const StaffInviteAcceptModal: React.FC<StaffInviteAcceptModalProps> = ({
  initialCode,
  onClose,
  onAccepted,
}) => {
  const [code, setCode] = useState(initialCode ? formatStaffInviteCode(initialCode) : '');
  const [preview, setPreview] = useState<StaffInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runPreview = async (value: string) => {
    const normalized = normalizeStaffInviteCode(value);
    if (normalized.length < 8) {
      setError('초대 코드를 정확히 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setPreview(await previewStaffInvite(normalized));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : '초대 코드를 확인하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode) void runPreview(initialCode);
  }, [initialCode]);

  const handleAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await acceptStaffInvite(code);
      await onAccepted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 수락 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="직원·강사 초대 수락" maxWidth="sm" intent="form">
      <div className="p-6 space-y-4">
        {!preview ? (
          <>
            <p className="text-sm text-slate-600">
              사업장에서 받은 초대 코드를 입력해 주세요.
            </p>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="예: ABCD-EFGH-JKLM"
              className="w-full px-3 py-2.5 text-base font-mono tracking-widest uppercase border border-slate-200 rounded-xl"
              aria-label="초대 코드"
            />
            <button
              type="button"
              onClick={() => void runPreview(code)}
              disabled={busy}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              코드 확인
            </button>
          </>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900">
                <p className="font-bold">{preview.organizationName}</p>
                <p className="text-xs mt-0.5">
                  <strong>{preview.staffName}</strong> 직원·강사 자리로 초대되었습니다.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              수락하면 현재 로그인한 계정이 이 사업장의 직원으로 연결됩니다. 본인에게 온 초대가
              아니라면 수락하지 마세요.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl min-h-[44px]"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => void handleAccept()}
                disabled={busy}
                className="py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                초대 수락
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
