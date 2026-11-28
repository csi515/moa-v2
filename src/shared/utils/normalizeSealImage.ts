/**
 * 직인(도장) 이미지 초경량 정규화 — Canvas 200×200 / 200KB 가드
 * (기존 stampResizer 재노출)
 */

import {
  resizeStampImage,
  calculateAspectRatioFit,
  DEFAULT_STAMP_MAX_BYTES,
  DEFAULT_STAMP_MAX_HEIGHT,
  DEFAULT_STAMP_MAX_WIDTH,
  type StampResizeOptions,
} from './stampResizer';

export const SEAL_MAX_WIDTH = DEFAULT_STAMP_MAX_WIDTH;
export const SEAL_MAX_HEIGHT = DEFAULT_STAMP_MAX_HEIGHT;
export const SEAL_MAX_BYTES = DEFAULT_STAMP_MAX_BYTES;

export function assertSealByteLimit(size: number, maxBytes = SEAL_MAX_BYTES): void {
  if (size > maxBytes) {
    throw new Error(`직인 이미지는 ${Math.floor(maxBytes / 1024)}KB 이하여야 합니다.`);
  }
}

export function validateSealDimensions(
  width: number,
  height: number,
  maxWidth = SEAL_MAX_WIDTH,
  maxHeight = SEAL_MAX_HEIGHT
): { width: number; height: number; withinLimit: boolean } {
  const fitted = calculateAspectRatioFit(width, height, maxWidth, maxHeight);
  return {
    ...fitted,
    withinLimit: width <= maxWidth && height <= maxHeight,
  };
}

/** 투명 배경 유지 PNG Blob으로 리사이즈·압축 (최종 200KB 초과 시 호출부에서 차단) */
export async function normalizeSealImage(
  inputBlob: Blob,
  options?: StampResizeOptions
): Promise<Blob> {
  const blob = await resizeStampImage(inputBlob, {
    maxWidth: SEAL_MAX_WIDTH,
    maxHeight: SEAL_MAX_HEIGHT,
    maxBytes: SEAL_MAX_BYTES,
    mimeType: 'image/png',
    ...options,
  });
  assertSealByteLimit(blob.size, options?.maxBytes ?? SEAL_MAX_BYTES);
  return blob;
}

export { calculateAspectRatioFit };
