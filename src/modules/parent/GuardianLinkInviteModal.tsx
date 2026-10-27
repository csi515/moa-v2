import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Loader2, X, Check, RefreshCw, Ban } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  createGuardianLinkToken,
  listGuardianLinkTokens,
  revokeGuardianLinkToken,
  type GuardianLinkTokenItem,
} from '@/core/parent/services/guardianLinkService';
import { formatGuardianLinkCode } from '@/core/platform/deepLinkParser';
import { buildParentInviteUrl } from '@/core/parent/services/parentInviteService';
import { GuardianLinkQrDisplay } from '@/modules/parent/components/GuardianLinkQrDisplay';
import { useModuleLabels } from '@/core/labels';
import { guardianLinkContactLabel } from '@/modules/parent/guardianLinkContactLabel';
import { usePermissions } from '@/core/auth/usePermissions';

interface GuardianLinkInviteModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GuardianLinkInviteModal: React.FC<GuardianLinkInviteModalProps> = ({
  studentId,
  studentName,
  isOpen,
  onClose,
}) => {
  const { currentOrganization } = useOrganization();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const contactLabel = guardianLinkContactLabel(industry, labels.contact.singular);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTokens, setActiveTokens] = useState<GuardianLinkTokenItem[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const orgId = currentOrganization?.id;

  /** 이 학생의 활성(미사용·미만료) 연결 코드 목록. 코드 원문은 발급 직후에만 볼 수 있음 */
  const loadActiveTokens = useCallback(async () => {
    if (!orgId || !studentId) return;
    setTokensLoading(true);
    try {
      const rows = await listGuardianLinkTokens(orgId);
      setActiveTokens(rows.filter((r) => String(r.metadata?.customer_id ?? '') === studentId));
    } catch {
      setActiveTokens([]);
    } finally {
      setTokensLoading(false);
    }
  }, [orgId, studentId]);

  useEffect(() => {
    if (isOpen) void loadActiveTokens();
  }, [isOpen, loadActiveTokens]);

  if (!isOpen) return null;

  const genericActiveCount = activeTokens.filter((t) => !t.metadata?.parent_customer_id).length;

  const handleGenerate = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      // 서버가 1회용·최대 7일로 강제하고, 같은 학생의 이전 활성 코드는 자동 폐기
      const result = await createGuardianLinkToken(orgId, studentId, 7, 1);
      setToken(result.token);
      setExpiresAt(result.expiresAt);
      void loadActiveTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : '코드 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!orgId) return;
    setRevokingId(tokenId);
    setError(null);
    try {
      await revokeGuardianLinkToken(orgId, tokenId);
      await loadActiveTokens();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('Permission denied') ? '코드 폐기는 관리자만 할 수 있습니다.' : msg || '코드 폐기에 실패했습니다.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    const link = buildParentInviteUrl(token);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(formatGuardianLinkCode(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setToken(null);
    setExpiresAt(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600" />
            {contactLabel}에게 MOA 연결 안내
          </h3>
          <button type="button" onClick={handleClose} aria-label="닫기">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          <strong>{studentName}</strong> 학생과 연결할 {contactLabel}님께 QR·링크를 전달합니다.
        </p>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
            <p className="font-bold">안내 생성 실패</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        )}

        {(tokensLoading || activeTokens.length > 0) && (
          <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-2">
              사용 대기 중인 연결 코드 {tokensLoading ? '' : `${activeTokens.length}개`}
            </p>
            {tokensLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <ul className="space-y-1.5">
                {activeTokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="min-w-0">
                      {t.metadata?.parent_customer_id ? `${contactLabel} 초대` : 'QR·코드'} ·{' '}
                      {new Date(t.createdAt).toLocaleDateString('ko-KR')} 발급
                      {t.expiresAt ? ` · ${new Date(t.expiresAt).toLocaleDateString('ko-KR')}까지` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(t.id)}
                      disabled={revokingId === t.id}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 disabled:opacity-50 min-h-[32px]"
                    >
                      {revokingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                      폐기
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-slate-500 mt-2">
              코드는 발급 직후에만 확인할 수 있습니다. 분실 시 재발급하면 이전 코드는 자동 폐기됩니다.
            </p>
          </div>
        )}

        {!token ? (
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-900 leading-relaxed">
                <strong>전달 방법:</strong>
                <br />
                1. 생성 후 QR을 보여주거나 링크·코드를 공유
                <br />
                2. {contactLabel}님이 MOA에서 QR 스캔 또는 코드 입력
                <br />
                3. 코드는 1회용이며 7일간 유효합니다 (학생당 보호자 계정 최대 2명)
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : genericActiveCount > 0 ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {loading
                ? '생성 중...'
                : genericActiveCount > 0
                  ? '새 코드 재발급 (이전 코드 폐기)'
                  : `${contactLabel} 연결 QR 만들기`}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <GuardianLinkQrDisplay url={buildParentInviteUrl(token)} />
            <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[10px] text-indigo-600 font-bold uppercase mb-1">연결 코드</p>
              <p className="text-xl font-black font-mono tracking-wider text-indigo-900 break-all">
                {formatGuardianLinkCode(token)}
              </p>
              {expiresAt && (
                <p className="text-[10px] text-slate-500 mt-2">
                  {new Date(expiresAt).toLocaleDateString('ko-KR')}까지 유효 · 1회용
                </p>
              )}
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-900">
                <span className="font-bold">✓ 연결 안내가 준비되었습니다</span>
                <br />
                <span className="text-emerald-700">QR을 보여주거나 아래 버튼을 사용하세요</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-h-[44px] hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사 완료!' : '코드 복사'}
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-h-[44px] hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사 완료!' : '링크 복사'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
