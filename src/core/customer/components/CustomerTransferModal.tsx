import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import {
  X,
  ShieldCheck,
  Smartphone,
  User,
  KeyRound,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  QrCode,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  issueCustomerTransferToken,
  safeTransferCustomerIdentity,
} from '../services/transferCustomerIdentityService';

export interface CustomerTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
  initialCustomerName?: string;
  initialCustomerId?: string;
}

export const CustomerTransferModal: React.FC<CustomerTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerName = '',
  initialCustomerId,
}) => {
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [phone, setPhone] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5분 TTL
  const [isIdentityMatched, setIsIdentityMatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerName(initialCustomerName);
      setStep('input');
      setPhone('');
      setTokenInput('');
      setIssuedToken(null);
      setRemainingSeconds(300);
      setIsIdentityMatched(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialCustomerName]);

  // 5분 카운트다운 타이머
  useEffect(() => {
    if (step !== 'verify' || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    

  return () => clearInterval(timer);
  }, [step, remainingSeconds]);

  if (!isOpen) return null;

  const handleIssueToken = async () => {
    if (!customerName.trim()) {
      setErrorMessage('회원 성명을 입력해주세요.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setErrorMessage('유효한 휴대폰 번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await issueCustomerTransferToken({
        customerName: customerName.trim(),
        phone: cleanPhone,
        targetCustomerId: initialCustomerId,
      });

      if (!res.success || !res.token) {
        setErrorMessage(res.error || '보안 토큰 발급에 실패했습니다.');
        return;
      }

      setIssuedToken(res.token);
      setStep('verify');
      setRemainingSeconds(300);
      showToast('2차 검증 일회용 토큰이 발급되었습니다 (5분 유효).', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (remainingSeconds <= 0) {
      setErrorMessage('인증 토큰 유효시간(5분)이 만료되었습니다. 다시 발급해주세요.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await safeTransferCustomerIdentity({
        token: tokenInput.trim(),
        customerName: customerName.trim(),
        phone: cleanPhone,
      });

      if (!res.success) {
        setErrorMessage(res.error || '신원 인계 처리에 실패했습니다.');
        return;
      }

      showToast(res.message || '회원 데이터 안전 인계가 완료되었습니다.', 'success');
      if (onSuccess && res.customerId) {
        onSuccess(res.customerId);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 cursor-default">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">회원 신원 안전 인계</h3>
              <p className="text-[11px] text-slate-500">번호 재개통/변경 시 계정 탈취 및 충돌 방어</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="닫기"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 에러 알림 */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1단계: 정보 입력 */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                회원 성명 (실명)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                새 휴대폰 번호 (인계 대상)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678 (- 없이 숫자만)"
                maxLength={11}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1 leading-relaxed">
              <p className="font-bold text-slate-800">🔒 데드락 & 계정 탈취 원천 방어</p>
              <p>5분간 유효한 일회성 토큰을 발급하여 고객 성명과 1:1 일치 검증 후, 기존 수강권·출결 데이터를 원자적으로 병합합니다.</p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleIssueToken}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>2차 검증 토큰 발급 (5분 유효)</span>
            </button>
          </div>
        )}

        {/* 2단계: 토큰 검증 및 인계 실행 */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center space-y-2">
              <div className="flex items-center justify-between border-b border-indigo-100/70 pb-2">
                <span className="text-[11px] text-indigo-700 font-bold flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                  카운터 1회용 인증 QR 및 토큰
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  5분 TTL
                </span>
              </div>

              <p className="text-3xl font-black font-mono tracking-widest text-indigo-900 py-1">
                {issuedToken}
              </p>

              <div className="flex items-center justify-center gap-1 text-[11px] text-indigo-600 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>만료까지 남은 시간: {formatTimer(remainingSeconds)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                보안 토큰 6자리 확인 입력
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ''))}
                placeholder="6자리 숫자 입력"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 수강생 이름/보호자 매칭 2차 확인 체크박스 */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-left transition hover:bg-slate-100/80">
              <input
                type="checkbox"
                checked={isIdentityMatched}
                onChange={(e) => setIsIdentityMatched(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-medium leading-snug">
                <strong>[2차 확인]</strong> 회원 성명(<strong>{customerName}</strong>) 및 수강·출결 인계 대상 명의가 일치함을 현장 카운터에서 확인했습니다.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors min-h-[48px]"
              >
                이전으로
              </button>
              <button
                type="button"
                disabled={loading || tokenInput.length < 6 || remainingSeconds <= 0 || !isIdentityMatched}
                onClick={handleExecuteTransfer}
                className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>계정 안전 인계 완료</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
