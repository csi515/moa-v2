import { showToast } from '@/shared/feedback/uiFeedback';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Keyboard,
} from 'lucide-react';
import { Modal } from '@/shared/components';
import {
  type InventoryItem,
  type BundleProduct,
  scanBarcodeAndFindItem,
  applyStockMovement,
  deductBundleStock,
} from '../domain/inventoryEngine';

/** Web Audio API를 활용한 무과금 즉각 비프음 발생기 */
function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 (경쾌한 비프음)
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // 오디오 컨텍스트 차단 환경 예외 안전 무시
  }
}

/** 햅틱 진동 피드백 */
function triggerHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([60, 40, 60]);
    } catch {
      // noop
    }
  }
}

export interface InventoryScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  bundles?: BundleProduct[];
  onStockUpdated: (updatedItem: InventoryItem, reason: string) => void;
  onBundleSold?: (bundle: BundleProduct, quantity: number) => void;
}

export const InventoryScannerModal: React.FC<InventoryScannerModalProps> = ({
  isOpen,
  onClose,
  items,
  bundles = [],
  onStockUpdated,
  onBundleSold,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);

  // 스캔 결과 상태
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
  const [matchedBundle, setMatchedBundle] = useState<BundleProduct | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // 카메라 스트림 시작
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('카메라에 접근할 수 없습니다. 권한을 확인하거나 수동 입력을 이용하세요.');
      setHasCamera(false);
    }
  }, []);

  // 카메라 스트림 정지
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // 바코드 탐지 루프 (Web 표준 BarcodeDetector API 지원 시 구동)
  useEffect(() => {
    if (!isOpen || !hasCamera) return;

    let detector: any = null;
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (BarcodeDetectorClass) {
      try {
        detector = new BarcodeDetectorClass({
          formats: ['qr_code', 'ean_13', 'code_128', 'code_39', 'upc_a'],
        });
      } catch {
        detector = null;
      }
    }

    let isScanning = true;

    const detectLoop = async () => {
      if (!isScanning) return;

      if (detector && videoRef.current && videoRef.current.readyState === 4 && !matchedItem && !matchedBundle) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue;
            handleBarcodeScanned(rawVal);
          }
        } catch {
          // 탐지 루프 프레임 에러 무시
        }
      }

      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    void startCamera().then(() => {
      if (detector) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
      }
    });

    return () => {
      isScanning = false;
      stopCamera();
    };
  }, [isOpen, hasCamera, matchedItem, matchedBundle, startCamera, stopCamera]);

  // 바코드 감지 성공 처리
  const handleBarcodeScanned = (code: string) => {
    if (!code || isProcessing) return;

    if (soundEnabled) playBeepSound();
    triggerHaptic();

    const match = scanBarcodeAndFindItem({
      barcodeRaw: code,
      items,
      bundles,
    });

    if (match.success) {
      if (match.foundType === 'single' && match.item) {
        setMatchedItem(match.item);
        setMatchedBundle(null);
      } else if (match.foundType === 'bundle' && match.bundle) {
        setMatchedBundle(match.bundle);
        setMatchedItem(null);
      }
    } else {
      setActionSuccessMessage(`미등록 코드입니다: [${code}]`);
      setTimeout(() => setActionSuccessMessage(null), 2500);
    }
  };

  // 수동 바코드 제출
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeScanned(manualCode.trim());
    setManualCode('');
  };

  // 1개 즉시 출고 (판매/소진)
  const handleQuickDeduct = (item: InventoryItem) => {
    setIsProcessing(true);
    const result = applyStockMovement(item, {
      itemId: item.id,
      type: 'OUT',
      quantity: 1,
      reason: '모바일 바코드 현장 1개 출고',
      timestamp: new Date().toISOString(),
    });

    if (result.success) {
      onStockUpdated(result.updatedItem, '바코드 1개 출고');
      setActionSuccessMessage(`출고 완료: ${item.name} (잔여: ${result.updatedItem.currentStock}개)`);
      if (soundEnabled) playBeepSound();
      triggerHaptic();

      if (continuousMode) {
        setTimeout(() => {
          setMatchedItem(null);
          setActionSuccessMessage(null);
          setIsProcessing(false);
        }, 1200);
      } else {
        setMatchedItem(result.updatedItem);
        setIsProcessing(false);
      }
    } else {
      showToast(result.error || '재고 출고에 실패했습니다.', 'error');
      setIsProcessing(false);
    }
  };

  // 1개 즉시 입고
  const handleQuickInbound = (item: InventoryItem) => {
    setIsProcessing(true);
    const result = applyStockMovement(item, {
      itemId: item.id,
      type: 'IN',
      quantity: 1,
      reason: '모바일 바코드 현장 1개 입고',
      timestamp: new Date().toISOString(),
    });

    if (result.success) {
      onStockUpdated(result.updatedItem, '바코드 1개 입고');
      setActionSuccessMessage(`입고 완료: ${item.name} (현재고: ${result.updatedItem.currentStock}개)`);
      if (soundEnabled) playBeepSound();

      if (continuousMode) {
        setTimeout(() => {
          setMatchedItem(null);
          setActionSuccessMessage(null);
          setIsProcessing(false);
        }, 1200);
      } else {
        setMatchedItem(result.updatedItem);
        setIsProcessing(false);
      }
    }
  };

  // 번들 세트 판매 차감
  const handleBundleSell = (bundle: BundleProduct) => {
    if (onBundleSold) {
      onBundleSold(bundle, 1);
      setActionSuccessMessage(`번들 세트 판매 처리: ${bundle.name}`);
      if (soundEnabled) playBeepSound();
      triggerHaptic();

      if (continuousMode) {
        setTimeout(() => {
          setMatchedBundle(null);
          setActionSuccessMessage(null);
        }, 1200);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="모바일 카메라 바코드/QR 실시간 스캐너">
      <div className="p-4 sm:p-6 space-y-4">
        {/* 상단 툴바: 사운드 및 모드 설정 */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-bold"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>{soundEnabled ? '비프음 ON' : '무음'}</span>
            </button>
          </div>

          <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>연속 스캔 모드 (자동 다음 스캔)</span>
          </label>
        </div>

        {/* 카메라 뷰파인더 영역 */}
        <div className="relative w-full aspect-4/3 max-h-[380px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-slate-400 space-y-2">
              <Camera className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
              <p className="text-xs font-medium">
                {cameraError || '카메라를 지원하지 않는 환경입니다. 아래에서 바코드를 수동 입력하세요.'}
              </p>
            </div>
          )}

          {/* 중앙 조준선 오버레이 타겟 */}
          {hasCamera && !matchedItem && !matchedBundle && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-teal-400/80 rounded-2xl relative shadow-lg">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-teal-400 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-teal-400 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-teal-400 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-teal-400 -mb-1 -mr-1 rounded-br-lg" />
                {/* 붉은색 스캔 레이저 빔 애니메이션 */}
                <div className="w-full h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse mt-18" />
              </div>
              <span className="absolute bottom-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] text-white font-bold">
                바코드 또는 QR을 네모 틀 안에 맞춰주세요
              </span>
            </div>
          )}

          {/* 성공 토스트 알림 오버레이 */}
          {actionSuccessMessage && (
            <div className="absolute top-4 inset-x-4 p-3 bg-emerald-600/95 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-md animate-bounce">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{actionSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* 스캔 감지된 상품/번들 액션 카드 (바텀 시트) */}
        {matchedItem && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-200 text-teal-900">
                  <Package className="w-3 h-3" />
                  단품 매칭
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{matchedItem.name}</h4>
                <p className="text-xs text-slate-500 font-mono">
                  SKU: {matchedItem.sku} · 바코드: {matchedItem.barcode || '없음'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block">현재고</span>
                <span className="text-xl font-black text-teal-800 tabular-nums">
                  {matchedItem.currentStock}
                  <span className="text-xs font-normal text-slate-600 ml-0.5">개</span>
                </span>
              </div>
            </div>

            {/* 원터치 입출고 액션 버튼 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-teal-100">
              <button
                type="button"
                disabled={isProcessing || matchedItem.currentStock <= 0}
                onClick={() => handleQuickDeduct(matchedItem)}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Minus className="w-4 h-4" />
                1개 즉시 출고 (소진)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleQuickInbound(matchedItem)}
                className="py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                1개 즉시 입고
              </button>
            </div>
          </div>
        )}

        {matchedBundle && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-200 text-purple-900">
                  <Layers className="w-3 h-3" />
                  번들 세트 상품
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{matchedBundle.name}</h4>
                <p className="text-xs text-slate-500 font-mono">
                  코드: {matchedBundle.bundleSku}
                </p>
              </div>

              <span className="text-sm font-black text-purple-900">
                {matchedBundle.sellingPrice.toLocaleString('ko-KR')}원
              </span>
            </div>

            <div className="pt-2 border-t border-purple-100">
              <button
                type="button"
                onClick={() => handleBundleSell(matchedBundle)}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                번들 1세트 판매 및 하위 부품 자동 출고
              </button>
            </div>
          </div>
        )}

        {/* 수동 바코드/SKU 입력 폼 (PC 및 키보드 바코드건 호환) */}
        <form onSubmit={handleManualSubmit} className="pt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="바코드 또는 SKU 직접 입력 (Enter)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white min-h-[44px]"
            />
            <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer"
          >
            검색
          </button>
        </form>
      </div>
    </Modal>
  );
};
