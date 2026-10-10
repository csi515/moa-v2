import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Plus, Trash2, Clock, CheckCircle2, User, Users, RefreshCw } from 'lucide-react';
import { supabase, getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { buildEnrollmentPayload, type ChildEnrollmentInput } from '../domain/claimEngine';
import { normalizeToE164 } from '@/domain/phoneValidation';

export interface CustomerQrDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export const CustomerQrDrawer: React.FC<CustomerQrDrawerProps> = ({
  isOpen,
  onClose,
  tenantId,
}) => {
  const [isSelf, setIsSelf] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [children, setChildren] = useState<ChildEnrollmentInput[]>([
    { name: '', birthDate: '', memo: '' },
  ]);

  const [step, setStep] = useState<'FORM' | 'QR'>('FORM');
  const [tokenRecord, setTokenRecord] = useState<{ id: string; claim_token: string; expires_at: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300); // 5 min TTL
  const [isUsed, setIsUsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setStep('FORM');
      setTokenRecord(null);
      setIsUsed(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleAddChild = () => {
    setChildren((prev) => [...prev, { name: '', birthDate: '', memo: '' }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleChildChange = (index: number, field: keyof ChildEnrollmentInput, value: string) => {
    setChildren((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenerateQr = async () => {
    setErrorMsg(null);
    try {
      const phoneNorm = normalizeToE164(phone);
      const cleanPhone = phoneNorm.isValid ? phoneNorm.e164 : phone;

      const normalized = buildEnrollmentPayload({
        isSelf,
        name,
        phone: cleanPhone,
        email: email || undefined,
        children: isSelf ? [] : children,
      });

      if (!isSupabaseConfigured() || !tenantId) {
        throw new Error('데이터베이스 또는 사업장 식별자가 올바르지 않습니다.');
      }

      setLoading(true);

      const rawToken = 'CQ-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL

      // SHA-256 hash calculation for secure token verification
      const enc = new TextEncoder().encode(rawToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await getCoreClient()
        .from('onboarding_tokens')
        .insert({
          tenant_id: tenantId,
          issuer_type: 'CUSTOMER',
          claim_token: rawToken,
          token_hash: tokenHash,
          payload: normalized as any,
          expires_at: expiresAt,
          is_used: false,
        } as any)
        .select('id, claim_token, expires_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setTokenRecord(data);
      setRemainingSeconds(300);
      setStep('QR');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'QR 코드 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 3-minute Countdown timer
  useEffect(() => {
    if (step !== 'QR' || !tokenRecord || isUsed || remainingSeconds <= 0) return;

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
  }, [step, tokenRecord, isUsed, remainingSeconds]);

  // Realtime subscription
  useEffect(() => {
    if (step !== 'QR' || !tokenRecord || !supabase) return;

    const channel = supabase
      .channel(`cust-qr-${tokenRecord.id}`)
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
            setIsUsed(true);
            setTimeout(() => {
              onClose();
            }, 2500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, tokenRecord, onClose]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">내 정보 등록 QR</h2>
            <p className="text-xs text-slate-500">카운터에 제시하여 1초 만에 회원 등록</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {step === 'FORM' ? (
            <div className="space-y-5">
              {/* Enrollment Subject Selection (Radio Group / Tabs) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  수강 주체 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSelf(true)}
                    className={`h-12 flex items-center justify-center space-x-2 rounded-xl border text-sm font-semibold transition ${
                      isSelf
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>본인 수강</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSelf(false)}
                    className={`h-12 flex items-center justify-center space-x-2 rounded-xl border text-sm font-semibold transition ${
                      !isSelf
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>자녀/가족 대리</span>
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isSelf ? '성함' : '학부모/보호자 성함'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    연락처 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    이메일 (선택)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="moa@example.com"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Children Section (When isSelf is false) */}
              {!isSelf && (
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      수강 자녀 정보 <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>자녀 추가</span>
                    </button>
                  </div>

                  {children.map((child, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative"
                    >
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChild(index)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div>
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                          placeholder="자녀 이름"
                          className="w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={child.birthDate || ''}
                          onChange={(e) => handleChildChange(index, 'birthDate', e.target.value)}
                          placeholder="생년월일 (YYYY-MM-DD)"
                          className="h-10 px-3 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={child.memo || ''}
                          onChange={(e) => handleChildChange(index, 'memo', e.target.value)}
                          placeholder="특이사항 / 과정"
                          className="h-10 px-3 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleGenerateQr}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-100"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : '1회용 QR 코드 생성하기'}
              </button>
            </div>
          ) : (
            /* QR Presentation View */
            <div className="flex flex-col items-center py-4">
              {isUsed ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce mb-3" />
                  <h3 className="text-xl font-bold text-slate-900">등록 완료!</h3>
                  <p className="text-sm text-slate-600 mt-1">매장 카운터에서 정상 등록되었습니다.</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner mb-4 flex items-center justify-center">
                    {tokenRecord ? (
                      <QRCodeSVG
                        value={tokenRecord.claim_token}
                        size={220}
                        level="M"
                        includeMargin={false}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-sm font-semibold mb-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className={remainingSeconds > 30 ? 'text-slate-700' : 'text-rose-600 animate-pulse'}>
                      유효 시간: {formatTimer(remainingSeconds)}
                    </span>
                    {remainingSeconds === 0 && (
                      <span className="text-xs text-rose-500 font-normal">(만료됨)</span>
                    )}
                  </div>

                  <p className="text-xs text-center text-slate-500 mb-6 leading-relaxed">
                    매장 사장님/직원 카운터 화면의 스캐너로<br />
                    위 QR 코드를 보여주세요.
                  </p>

                  <div className="w-full grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('FORM')}
                      className="h-12 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition"
                    >
                      정보 수정
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateQr}
                      disabled={loading}
                      className="h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-100"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>재발급</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
