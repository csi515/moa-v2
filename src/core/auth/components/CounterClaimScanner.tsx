import React, { useState } from 'react';
import { QrCode, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';

export interface CounterClaimScannerProps {
  tenantId: string;
  onSuccess?: (result: { customerId: string; childCustomerIds?: string[] }) => void;
}

export const CounterClaimScanner: React.FC<CounterClaimScannerProps> = ({
  tenantId,
  onSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'idle';
    text: string;
  }>({ type: 'idle', text: '' });

  const handleConsumeToken = async (tokenToConsume?: string) => {
    const rawToken = (tokenToConsume || tokenInput).trim();
    if (!rawToken) {
      setStatusMessage({ type: 'error', text: '토큰 또는 QR 코드를 입력해주세요.' });
      return;
    }

    if (!isSupabaseConfigured() || !tenantId) {
      setStatusMessage({ type: 'error', text: 'Supabase 클라이언트 또는 사업장 설정이 올바르지 않습니다.' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      const { data, error } = await getCoreClient().rpc('consume_customer_qr', {
        p_token: rawToken,
        p_tenant_id: tenantId,
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatusMessage({
        type: 'success',
        text: '고객 정보가 원자적으로 생성 및 연동되었습니다!',
      });
      setTokenInput('');

      onSuccess?.({
        customerId: (data as any)?.customer_id,
        childCustomerIds: (data as any)?.child_customer_ids,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'QR 토큰 승인 중 오류가 발생했습니다.';
      setStatusMessage({
        type: 'error',
        text: msg.includes('expired') ? '만료되었거나 이미 사용된 QR입니다.' : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConsumeToken();
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">카운터 고객 QR 스캔 & 등록</h3>
          <p className="text-xs text-slate-500">
            고객 스마트폰의 1회용 QR 코드 또는 식별 코드를 입력/스캔하세요.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="바코드 스캐너 입력 또는 CQ-XXXXXX"
            className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono tracking-wide"
            autoFocus
          />
        </div>

        <button
          type="button"
          onClick={() => handleConsumeToken()}
          disabled={loading || !tokenInput.trim()}
          className="h-12 px-6 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shrink-0 shadow-sm"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>즉시 등록</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {statusMessage.type === 'success' && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {statusMessage.type === 'error' && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
