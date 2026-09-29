import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { shareLink } from '@/core/platform/shareLink';
import {
  buildStaffInviteUrl,
  formatStaffInviteCode,
} from '@/core/staff/services/staffAccountService';

interface StaffInviteResultModalProps {
  staffName: string;
  organizationName?: string;
  token: string;
  expiresAt?: string;
  staffLabel?: string;
  onClose: () => void;
}

function formatExpiry(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 교직원 초대 코드·링크 1회 표시 (서버는 해시만 저장하므로 닫으면 다시 볼 수 없음) */
export const StaffInviteResultModal: React.FC<StaffInviteResultModalProps> = ({
  staffName,
  organizationName,
  token,
  expiresAt,
  staffLabel = '교직원',
  onClose,
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const url = buildStaffInviteUrl(token);
  const code = formatStaffInviteCode(token);
  const expiry = formatExpiry(expiresAt);

  const copy = async (key: 'code' | 'link', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard 미지원: 사용자가 직접 선택해 복사
    }
  };

  const handleShare = async () => {
    const result = await shareLink({
      title: `${organizationName ?? ''} ${staffLabel} 초대`.trim(),
      text: `${staffName}님, 아래 링크로 로그인한 뒤 초대를 수락해 주세요. 초대 코드: ${code}`,
      url,
    });
    if (result === 'copied') {
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${staffLabel} 계정 초대`} maxWidth="sm" intent="view">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-600">
          <strong>{staffName}</strong>님에게 아래 링크나 초대 코드를 전달해 주세요. 받는 분이
          로그인(또는 가입)한 뒤 직접 수락해야 연결됩니다.
        </p>

        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <QRCodeSVG value={url} size={160} level="M" includeMargin={false} />
          </div>
          <p className="text-[10px] text-slate-400 text-center break-all max-w-[240px]">{url}</p>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500">초대 코드</p>
            <p
              className="text-lg font-black font-mono tracking-widest text-indigo-700"
              data-testid="staff-invite-code"
            >
              {code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copy('code', code)}
            className="p-2 rounded-lg bg-white border border-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="초대 코드 복사"
          >
            {copied === 'code' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void copy('link', url)}
            className="py-2.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
          >
            {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            링크 복사
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            공유
          </button>
        </div>

        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
          {expiry && <li>{expiry}까지 1회만 사용할 수 있습니다.</li>}
          <li>보안을 위해 코드는 지금만 표시됩니다. 분실하면 &lsquo;재발급&rsquo;하세요 (이전 코드는 즉시 무효).</li>
          <li>이메일이 같아도 자동으로 연결되지 않습니다.</li>
        </ul>
      </div>
    </Modal>
  );
};
