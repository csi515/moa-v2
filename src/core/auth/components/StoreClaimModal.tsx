import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, RefreshCw, Share2, CheckCircle2, Clock, Copy } from 'lucide-react';
import { supabase, getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { shareLink } from '@/core/utils/shareLink';

export interface StoreClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  customerId: string;
  customerName?: string;
}

export const StoreClaimModal: React.FC<StoreClaimModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  customerId,
  customerName,
}) => {
  const [tokenRecord, setTokenRecord] = useState<{ id: string; claim_token: string; expires_at: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateClaimToken = useCallback(async () => {
    if (!isSupabaseConfigured() || !tenantId || !customerId) return;
    setLoading(true);
    setIsClaimed(false);

    try {
      // Generate a secure, unique alphanumeric claim token
      const rawRandom = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
      const claimToken = `ST-${rawRandom}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { data, error } = await getCoreClient()
        .from('onboarding_tokens')
        .insert({
          tenant_id: tenantId,
          issuer_type: 'STORE',
          claim_token: claimToken,
          customer_id: customerId,
          payload: { customer_name: customerName || '고객' },
          expires_at: expiresAt,
          is_used: false,
        })
        .select('id, claim_token, expires_at')
        .single();

      if (error) {
        showToast('토큰 발급에 실패했습니다: ' + error.message);
        return;
      }

      setTokenRecord(data);
      setRemainingSeconds(300);
    } catch (err: unknown) {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, customerId, customerName]);

  // Initial load when opened
  useEffect(() => {
    if (isOpen) {
      generateClaimToken();
    } else {
      setTokenRecord(null);
      setIsClaimed(false);
    }
  }, [isOpen, generateClaimToken]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !tokenRecord || isClaimed || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, tokenRecord, isClaimed, remainingSeconds]);

  // Supabase Realtime channel subscription
  useEffect(() => {
    if (!isOpen || !tokenRecord || !supabase) return;

    const channelName = `store-claim-${tokenRecord.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'core',
          table: 'onboarding_tokens',
          filter: `id=eq.${tokenRecord.id}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.is_used) {
            setIsClaimed(true);
            showToast('고객 스마트폰과 즉시 연결되었습니다!');
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, tokenRecord, onClose]);

  if (!isOpen) return null;

  const claimUrl = tokenRecord
    ? `${window.location.origin}/claim/${tokenRecord.claim_token}`
    : '';

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    if (!claimUrl) return;
    await shareLink({
      title: 'MOA 스마트 멤버십 연결',
      text: `${customerName || '고객'}님의 멤버십 등록/수강권 연결 링크입니다 (5분간 유효).`,
      url: claimUrl,
      onFeedback: (msg) => showToast(msg),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">스마트폰 1회용 QR 연결</h2>
            <p className="text-xs text-slate-500">
              {customerName ? `${customerName} 고객 연결용` : '고객 계정 본인 연결'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {toastMessage && (
            <div className="w-full mb-4 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-xl text-center font-medium">
              {toastMessage}
            </div>
          )}

          {isClaimed ? (
            <div className="py-10 flex flex-col items-center text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce mb-3" />
              <h3 className="text-xl font-bold text-slate-900">연결 완료!</h3>
              <p className="text-sm text-slate-600 mt-1">고객 스마트폰과 성공적으로 연동되었습니다.</p>
            </div>
          ) : (
            <>
              {/* SVG QR Code Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner mb-4 flex items-center justify-center">
                {claimUrl ? (
                  <QRCodeSVG
                    value={claimUrl}
                    size={200}
                    level="M"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center space-x-2 text-sm font-semibold mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className={remainingSeconds > 60 ? 'text-slate-700' : 'text-rose-600 animate-pulse'}>
                  유효 시간: {formatTimer(remainingSeconds)}
                </span>
                {remainingSeconds === 0 && (
                  <span className="text-xs text-rose-500 font-normal">(만료됨)</span>
                )}
              </div>

              <p className="text-xs text-center text-slate-500 mb-6 leading-relaxed">
                고객 스마트폰 기본 카메라로 QR 코드를 비추면<br />
                앱 설치 없이 1초 만에 회원 바인딩이 완료됩니다.
              </p>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={loading || remainingSeconds === 0}
                  className="h-12 flex items-center justify-center space-x-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  <span>원격 링크 전송</span>
                </button>

                <button
                  type="button"
                  onClick={generateClaimToken}
                  disabled={loading}
                  className="h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-100"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>QR 새로고침</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
