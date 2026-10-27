import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  Check,
  Zap,
  ZoomIn,
  ZoomOut,
  ShoppingCart,
  Maximize2,
} from 'lucide-react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import {
  playScannerSound,
  triggerScannerHaptic,
} from '@/capabilities/inventory';
import type { SaleCatalogItem, SaleCartLine } from '../../types/sale';
import { matchCatalogItem } from './saleCatalogMatch';

interface ExtendedMediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
}

interface ExtendedMediaTrack {
  getCapabilities?: () => ExtendedMediaTrackCapabilities;
  applyConstraints: (constraints?: { advanced?: Array<Record<string, unknown>> }) => Promise<void>;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; boundingBox?: DOMRectReadOnly }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

export interface SaleCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: SaleCatalogItem[];
  cart: SaleCartLine[];
  onScanItem: (item: SaleCatalogItem) => void;
  onUpdateQty: (key: string, quantity: number) => void;
  onRemoveItem: (key: string) => void;
}

interface DetectedBox {
  rawValue: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCenterTarget: boolean;
}

export const SaleCameraScannerModal: React.FC<SaleCameraScannerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  cart,
  onScanItem,
  onUpdateQty,
  onRemoveItem,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastDetectTimeRef = useRef<number>(0);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // 시각적 셔터 플래시 이펙트 (스캔 성공 시 0.15초간 테두리 번쩍임)
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // 화면에 잡힌 바코드들의 AR 바운딩 박스 오버레이
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);

  // 직전 스캔된 상품 카드
  const [lastScannedItem, setLastScannedItem] = useState<SaleCatalogItem | null>(null);
  const [unmatchedCode, setUnmatchedCode] = useState<string | null>(null);

  // 동일 코드 연속 오인식 방지 쿨다운 (1.2초)
  const recentScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // 카메라 시작
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setTorchOn(false);
    setIsZoomed(false);
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

      // 플래시(Torch) 및 Zoom 하드웨어 지원 여부 감지
      const track = stream.getVideoTracks()[0] as unknown as ExtendedMediaTrack | undefined;
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities?.() || {};
        setTorchSupported(Boolean(capabilities.torch));
        setZoomSupported(Boolean(capabilities.zoom));
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('카메라에 접근할 수 없습니다. 권한을 허용하거나 수동 입력을 이용해 주세요.');
      setHasCamera(false);
    }
  }, []);

  // 카메라 정지
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

  // 플래시(Torch) 토글
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0] as unknown as ExtendedMediaTrack | undefined;
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error', err);
    }
  };

  // 2배 줌 토글
  const toggleZoom = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0] as unknown as ExtendedMediaTrack | undefined;
    if (!track) return;
    try {
      const nextZoom = isZoomed ? 1 : 2;
      await track.applyConstraints({
        advanced: [{ zoom: nextZoom }],
      });
      setIsZoomed(!isZoomed);
    } catch (err) {
      console.warn('Zoom constraint error', err);
    }
  };

  // 스캔 성공 처리
  const handleDetectedCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      const now = performance.now();
      // 동일 바코드는 1.2초 내 중복 스캔 차단
      if (recentScanRef.current.code === code && now - recentScanRef.current.time < 1200) {
        return;
      }
      recentScanRef.current = { code, time: now };

      const matched = matchCatalogItem(code, catalog);
      if (matched) {
        if (soundEnabled) playScannerSound('success');
        triggerScannerHaptic('success');

        // [개선안 5] 시각적 셔터 플래시 피드백
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 160);

        setLastScannedItem(matched);
        setUnmatchedCode(null);
        onScanItem(matched);
      } else {
        if (soundEnabled) playScannerSound('error');
        triggerScannerHaptic('error');
        setUnmatchedCode(code);
      }
    },
    [catalog, soundEnabled, onScanItem]
  );

  // [개선안 1] 중앙 조준점(Reticle) 우선 감지 및 Bounding Box 계산 루프
  useEffect(() => {
    if (!isOpen || !hasCamera) return;

    let detector: BarcodeDetectorInstance | null = null;
    const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
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

      const now = performance.now();
      // [개선안 6] 프레임 스로틀링: 초당 약 11~12회(85ms 간격) 검사로 배터리 소모 및 발열 방지
      if (now - lastDetectTimeRef.current >= 85) {
        lastDetectTimeRef.current = now;

        const video = videoRef.current;
        if (detector && video && video.readyState >= 2) {
          try {
            const barcodes: any[] = await detector.detect(video);
            if (barcodes.length > 0) {
              const vw = video.videoWidth || 1280;
              const vh = video.videoHeight || 720;
              const centerX = vw / 2;
              const centerY = vh / 2;

              // 각 바코드 중심과 화면 중앙 사이의 유클리드 거리 계산
              let closestBarcode: any = null;
              let minDistance = Infinity;

              const boxes: DetectedBox[] = [];

              for (const b of barcodes) {
                const box = b.boundingBox;
                let bx = 0;
                let by = 0;
                let bw = 0;
                let bh = 0;
                let dist = 0;

                if (box) {
                  bx = (box.x / vw) * 100;
                  by = (box.y / vh) * 100;
                  bw = (box.width / vw) * 100;
                  bh = (box.height / vh) * 100;
                  const bcx = box.x + box.width / 2;
                  const bcy = box.y + box.height / 2;
                  dist = Math.hypot(bcx - centerX, bcy - centerY);
                } else {
                  dist = 0;
                }

                if (dist < minDistance) {
                  minDistance = dist;
                  closestBarcode = b;
                }

                boxes.push({
                  rawValue: b.rawValue,
                  x: bx,
                  y: by,
                  width: bw,
                  height: bh,
                  isCenterTarget: false,
                });
              }

              // 중앙에 가장 가까운 1개를 타깃으로 지정
              if (closestBarcode) {
                const targetBox = boxes.find((b) => b.rawValue === closestBarcode.rawValue);
                if (targetBox) targetBox.isCenterTarget = true;
                setDetectedBoxes(boxes);
                handleDetectedCode(closestBarcode.rawValue);
              }
            } else {
              setDetectedBoxes([]);
            }
          } catch {
            // 일시적 디텍션 프레임 에러 무시
          }
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
  }, [isOpen, hasCamera, startCamera, stopCamera, handleDetectedCode]);

  // 수동 바코드 입력
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode);
    setManualCode('');
  };

  // 장바구니에서 직전 스캔된 상품의 현재 수량 조회
  const lastScannedCartLine = lastScannedItem
    ? cart.find((line) => line.key === lastScannedItem.key)
    : null;

  // 장바구니 전체 총액
  const totalAmount = cart.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );
  const totalQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);

  // [개선안 2] 연타 수량 추가 핸들러
  const handleQuickAdd = () => {
    if (!lastScannedItem) return;
    if (soundEnabled) playScannerSound('success');
    triggerScannerHaptic('success');
    onScanItem(lastScannedItem);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="카메라 스마트 바코드·QR 스캔" maxWidth="lg">
      <div className="flex flex-col max-h-[88vh]">
        {/* 카메라 뷰파인더 영역 */}
        <div className="relative bg-black w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden flex items-center justify-center select-none">
          {hasCamera && !cameraError ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* [개선안 1 & 5] 중앙 조준점(Reticle) 및 시각적 셔터 플래시 테두리 */}
              <div
                className={`absolute inset-0 pointer-events-none flex items-center justify-center p-6 transition-all duration-150 ${
                  isFlashing ? 'bg-teal-500/25 ring-8 ring-teal-400 inset-ring-8' : ''
                }`}
              >
                {/* 중앙 조준점 사각형 */}
                <div
                  className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-150 ${
                    isFlashing
                      ? 'border-4 border-teal-300 scale-105 shadow-[0_0_30px_rgba(45,212,191,0.8)]'
                      : 'border-2 border-teal-400/80'
                  }`}
                >
                  {/* 모서리 강조 가이드 */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />

                  {/* 중앙 레이저 스캔 펄스 */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />

                  {/* 중앙 타깃 안내 문구 */}
                  <div className="absolute -bottom-7 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold text-teal-200/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      중앙에 바코드를 맞춰주세요
                    </span>
                  </div>
                </div>
              </div>

              {/* [개선안 1] 화면에 감지된 다중 바코드 AR 박스 오버레이 (클릭 시 수동 선택 스캔 가능) */}
              {detectedBoxes.map((box, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDetectedCode(box.rawValue)}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                  className={`absolute border rounded pointer-events-auto transition-transform active:scale-95 cursor-pointer ${
                    box.isCenterTarget
                      ? 'border-teal-400 bg-teal-400/20 ring-2 ring-teal-300'
                      : 'border-amber-300/80 bg-amber-300/10 hover:border-amber-400'
                  }`}
                  title="탭하여 이 상품 스캔"
                />
              ))}
            </>
          ) : (
            <div className="text-center p-6 text-white space-y-3">
              <Camera className="w-12 h-12 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {cameraError || '카메라를 사용할 수 없습니다.'}
              </p>
              <p className="text-xs text-slate-400">아래 수동 바코드 입력을 이용해 주세요.</p>
            </div>
          )}

          {/* [개선안 4] 하드웨어 제어 컨트롤 바 (Torch, Zoom, Sound) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {/* 플래시라이트 토글 */}
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-sm transition-colors cursor-pointer ${
                  torchOn ? 'bg-amber-500 text-white' : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
                title={torchOn ? '플래시 끄기' : '플래시 켜기'}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            {/* 2배 줌 토글 */}
            {zoomSupported && (
              <button
                type="button"
                onClick={toggleZoom}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold backdrop-blur-sm transition-colors cursor-pointer flex items-center gap-1 ${
                  isZoomed ? 'bg-teal-600 text-white' : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
                title={isZoomed ? '1배율로 복귀' : '2배 확대'}
              >
                {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                <span>{isZoomed ? '2X' : '1X'}</span>
              </button>
            )}

            {/* 비프음 토글 */}
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition-colors cursor-pointer"
              title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-teal-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* [개선안 2] 직전 스캔된 상품 카드 & 초고속 연타 [+] 수량 버튼 */}
        <div className="p-3 bg-teal-50/80 border-t border-b border-teal-200">
          {lastScannedItem ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-teal-950 truncate">
                    {lastScannedItem.productName}
                  </p>
                  <p className="text-[11px] text-teal-700">
                    {lastScannedItem.variantName || '단품'} · {formatCurrency(lastScannedItem.unitPrice)}
                    <span className="font-bold ml-1.5 text-teal-900">
                      (장바구니 총 {lastScannedCartLine?.quantity || 1}개)
                    </span>
                  </p>
                </div>
              </div>

              {/* 연타 클릭 버튼: 빠르게 클릭할 때마다 수량 1개씩 폭속 추가 */}
              <button
                type="button"
                onClick={handleQuickAdd}
                className="shrink-0 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 active:scale-95 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="클릭할 때마다 수량이 1개씩 추가됩니다"
              >
                <Plus className="w-4 h-4" />
                <span>연타 +1 추가</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
              <Maximize2 className="w-4 h-4 text-teal-600" />
              <span>상품 바코드를 중앙 프레임에 비추면 자동으로 장바구니에 담깁니다.</span>
            </div>
          )}
        </div>

        {/* 미등록 바코드 경고 알림 */}
        {unmatchedCode && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">등록되지 않은 바코드: {unmatchedCode}</span>
          </div>
        )}

        {/* [개선안 3] 모달 내부 '실시간 스캔 목록(미니 장바구니 피드)' */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 min-h-[140px] max-h-[220px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ShoppingCart className="w-3.5 h-3.5 text-teal-600" />
              <span>실시간 스캔 장바구니 목록 ({cart.length}개 품목)</span>
            </div>
            <span className="text-xs font-bold text-teal-700 tabular-nums">
              총 {totalQuantity}개 / {formatCurrency(totalAmount)}
            </span>
          </div>

          {cart.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">아직 담긴 상품이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
              {cart.map((line) => (
                <li key={line.key} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{line.productName}</p>
                    <p className="text-[11px] text-slate-500">
                      {line.variantName ? `${line.variantName} · ` : ''}
                      {formatCurrency(line.unitPrice)}
                    </p>
                  </div>

                  {/* 인라인 수량 조절 버튼 [ - ] [수량] [ + ] [삭제] */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(line.key, line.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold tabular-nums text-slate-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(line.key, line.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.key)}
                      className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1 cursor-pointer"
                      title="품목 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 수동 바코드 번호 입력 바 */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="바코드 번호 직접 입력 (스캔 불가 시)"
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 min-h-[40px] rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              입력
            </button>
          </form>
        </div>

        {/* 하단 완료 및 계산 버튼 바 */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">총 결제 예정 금액</p>
            <p className="text-lg font-bold text-teal-700 tabular-nums">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-6 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            스캔 완료 및 결제 진행
          </button>
        </div>
      </div>
    </Modal>
  );
};
