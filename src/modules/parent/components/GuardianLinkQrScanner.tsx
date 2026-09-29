import React, { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Loader2, X } from 'lucide-react';
import { parseGuardianLinkCode } from '@/core/platform/deepLinkParser';

interface GuardianLinkQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

/** QR/링크에서 연결 코드 추출 (20자리 신규 코드 + 만료 전 8자리 기존 코드) */
export function extractGuardianLinkToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const link = url.searchParams.get('link');
    if (link) return parseGuardianLinkCode(link);
  } catch {
    // not a URL
  }

  const whole = parseGuardianLinkCode(trimmed);
  if (whole) return whole;

  const codeMatch = trimmed.match(/\b([A-Z0-9]{4}(?:-?[A-Z0-9]{4}){4}|[A-Z0-9]{8})\b/i);
  if (codeMatch) return parseGuardianLinkCode(codeMatch[1]);

  return null;
}

/** 학부모 포털: 카메라로 연결 QR 스캔 */
export const GuardianLinkQrScanner: React.FC<GuardianLinkQrScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const scannerId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const elementId = `guardian-qr-scanner-${scannerId}`;

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            const token = extractGuardianLinkToken(decoded);
            if (!token) return;
            void scanner.stop().then(() => {
              scannerRef.current = null;
              onScan(token);
              onClose();
            });
          },
          () => {
            // scan miss — ignore
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : '카메라를 사용할 수 없습니다. 코드를 직접 입력해 주세요.'
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => undefined);
      }
    };
  }, [isOpen, onClose, onScan, scannerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Camera className="w-4 h-4 text-indigo-600" />
            QR 코드 스캔
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div
          id={`guardian-qr-scanner-${scannerId}`}
          className="w-full overflow-hidden rounded-xl bg-slate-900 min-h-[240px]"
        />

        {starting && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            카메라 준비 중...
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-rose-600 text-center">{error}</p>
        )}

        <p className="mt-3 text-xs text-slate-500 text-center">
          받은 QR 코드를 화면 중앙에 맞춰 주세요.
        </p>
      </div>
    </div>
  );
};
