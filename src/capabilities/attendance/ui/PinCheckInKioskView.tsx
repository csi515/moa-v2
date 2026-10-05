import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import { settingsStorage } from '@/services/storage/settingsStorage';
import { isAttendanceModuleEnabled } from '../domain/features';
import type { CheckInMethod } from '../domain/types';
import {
  isKioskOrganizationReady,
  resolveKioskOrganizationIdFromApp,
} from '../infrastructure/resolveKioskOrganizationId';
import { Delete, RotateCcw, Settings } from 'lucide-react';
import { getIndustryAccent, runsPinCheckInSideEffects } from '@/core/industry/industryUi';
import {
  kioskAdminExitBody,
  kioskAlreadyCheckedMessage,
  kioskCheckInSuccess,
  kioskEyebrow,
  kioskModuleDisabledHint,
  kioskNoPinHint,
  kioskRepeatHint,
} from '@/core/attendance/attendanceIndustryCopy';
import { runPinCheckInSideEffects } from '../application/pinCheckInSideEffects';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'] as const;
const ADMIN_EXIT_HOLD_MS = 2000;

interface PinCheckInKioskViewProps {
  method?: CheckInMethod;
  /** 전용 라우트 전체화면 모드 */
  standalone?: boolean;
}

export const PinCheckInKioskView: React.FC<PinCheckInKioskViewProps> = ({
  method = 'pin',
  standalone = false,
}) => {
  const navigate = useNavigate();
  const org = useOptionalOrganization();
  const organizationId = resolveKioskOrganizationIdFromApp(
    org?.currentOrganization?.id,
    standalone ? 'standalone' : 'embedded'
  );
  const industry = org?.currentOrganization?.industry_type || 'piano';
  const settings = settingsStorage.getSettings();

  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' | 'info' } | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moduleEnabled = isAttendanceModuleEnabled(settings, industry);
  const accent = getIndustryAccent(industry);

  const customerPins = attendanceStorage.getCustomerPins();
  const hasPinsConfigured = customerPins.length > 0;
  const orgReady = isKioskOrganizationReady(organizationId);

  const maskedPin = useMemo(() => (pin ? '●'.repeat(pin.length) : ''), [pin]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const startAdminExitHold = () => {
    if (!standalone) return;
    clearHold();
    holdTimer.current = setTimeout(() => {
      setExitPrompt(true);
    }, ADMIN_EXIT_HOLD_MS);
  };

  const confirmAdminExit = () => {
    setExitPrompt(false);
    navigate('/', { replace: true });
  };

  const handleKey = useCallback(
    async (key: (typeof KEYPAD)[number]) => {
      if (processing) return;

      if (key === 'clear') {
        setPin('');
        setFeedback(null);
        return;
      }

      if (key === 'enter') {
        if (standalone && !orgReady) {
          setFeedback({ text: '사업장 로그인 후 키오스크를 사용해 주세요.', tone: 'error' });
          return;
        }
        if (pin.length < 4) {
          setFeedback({ text: 'PIN은 4자리 이상 입력해 주세요.', tone: 'error' });
          return;
        }
        setProcessing(true);
        try {
          const result = await attendanceStorage.toggleCheckInByPin(
            pin,
            method as CheckInMethod,
            organizationId
          );
          if (result.success) {
            if (result.action === 'check_in' && runsPinCheckInSideEffects(industry)) {
              const sync = await runPinCheckInSideEffects(result.customerId);
              if (sync.warning) {
                showToast(sync.warning, 'warning');
              }
            }
            const successText = kioskCheckInSuccess(industry, result.customerName);
            setFeedback({
              text: successText,
              tone: 'success',
            });
            showToast(successText, 'success');
          } else if (result.success === false) {
            const err = result.error;
            const messages: Record<string, string> = {
              invalid_pin: '등록되지 않은 PIN입니다.',
              already_checked_in: kioskAlreadyCheckedMessage(industry, result.customerName),
              already_checked_out: kioskAlreadyCheckedMessage(industry, result.customerName),
              module_disabled: 'PIN 출결이 비활성화되어 있습니다.',
            };
            setFeedback({
              text: messages[err] || '처리할 수 없습니다.',
              tone: 'error',
            });
          }
        } finally {
          setPin('');
          setProcessing(false);
          setTimeout(() => setFeedback(null), 3000);
        }
        return;
      }

      if (pin.length >= 8) return;
      setPin((prev) => prev + key);
    },
    [pin, processing, method, organizationId, showToast, industry, standalone, orgReady]
  );

  const shellClass = standalone
    ? 'min-h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 px-4 py-8'
    : 'max-w-md mx-auto pb-4 md:pb-0';

  if (!moduleEnabled) {
    return (
      <div className={shellClass}>
        <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-10 text-center shadow-sm max-w-md w-full">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <Settings className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">PIN 출결이 꺼져 있습니다</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            {kioskModuleDisabledHint(industry)}
          </p>
          <button
            type="button"
            onClick={() => (standalone ? navigate('/', { replace: true }) : window.history.back())}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl min-h-[44px] transition-colors"
          >
            {standalone ? '앱으로 이동' : '뒤로 가기'}
          </button>
        </div>
      </div>
    );
  }

  if (!hasPinsConfigured) {
    return (
      <div className={shellClass}>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <p className="text-xs text-slate-500 font-semibold">{kioskEyebrow(industry)}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">PIN 입력</h3>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Delete className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 mb-2">등록된 PIN이 없습니다</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {kioskNoPinHint(industry)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {standalone && (
        <button
          type="button"
          aria-label="관리자 종료 (길게 누르기)"
          className="absolute top-0 left-0 w-16 h-16 opacity-0"
          onPointerDown={startAdminExitHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
        />
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-md w-full relative">
        <div className="text-center mb-6">
          <p className="text-xs text-slate-500 font-semibold">{kioskEyebrow(industry)}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">PIN 번호를 입력해주세요</h3>
          <p className="text-xs text-slate-400 mt-2">{kioskRepeatHint(industry)}</p>
        </div>

        <div
          className={`h-14 rounded-2xl border-2 flex items-center justify-center text-2xl tracking-[0.5em] font-mono mb-4 ${
            feedback?.tone === 'error'
              ? 'border-rose-300 bg-rose-50'
              : feedback?.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-200 bg-slate-50'
          }`}
          aria-label="PIN 입력 표시"
        >
          {maskedPin || '••••'}
        </div>

        {feedback && (
          <p
            className={`text-center text-sm font-bold mb-4 ${
              feedback.tone === 'success'
                ? 'text-emerald-600'
                : feedback.tone === 'error'
                  ? 'text-rose-600'
                  : 'text-slate-600'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {KEYPAD.map((key) => (
            <button
              key={key}
              type="button"
              disabled={processing}
              onClick={() => handleKey(key)}
              className={`min-h-[56px] rounded-2xl text-lg font-black transition-all active:scale-95 ${
                key === 'enter'
                  ? `${accent.btn} text-white ${accent.btnHover}`
                  : key === 'clear'
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
              } ${processing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {key === 'clear' ? (
                <Delete className="w-5 h-5 mx-auto" />
              ) : key === 'enter' ? (
                '확인'
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setPin('');
            setFeedback(null);
          }}
          className="mt-4 w-full py-2 text-xs text-slate-500 font-semibold flex items-center justify-center gap-1 min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          초기화
        </button>
      </div>

      {exitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="font-bold text-slate-900 text-lg">관리자 화면으로 나가기</h4>
            <p className="text-sm text-slate-500">
              {kioskAdminExitBody(industry)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExitPrompt(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmAdminExit}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold text-white ${accent.btn}`}
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
