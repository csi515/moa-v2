/**
 * Moa-v2 Client-Side Smart Image Compressor
 *
 * 모바일 카메라로 촬영된 10MB 이상의 고해상도 사진을
 * 브라우저 단에서 Web Worker 기반으로 1MB 이하 WebP/JPEG로 자동 압축하여
 * 테넌트 스토리지 및 네트워크 대역폭 비용을 대폭 절감합니다.
 */

import imageCompression, { type Options as BrowserImageCompressionOptions } from 'browser-image-compression';

export interface CompressImageOptions {
  /** 최대 파일 크기 (MB 단위, 기본값: 1MB) */
  maxSizeMB?: number;
  /** 최대 가로/세로 해상도 (기본값: 1920px) */
  maxWidthOrHeight?: number;
  /** Web Worker 사용 여부 (기본값: true) */
  useWebWorker?: boolean;
  /** 출력 파일 포맷 */
  fileType?: string;
  /** EXIF 회전 자동 보정 (기본값: true) */
  exifOrientation?: boolean;
}

/**
 * 이미지 파일 압축 (비브라우저 환경에서는 원본 File 반환)
 */
export async function compressImageFile(
  file: File,
  options?: CompressImageOptions
): Promise<File> {
  // 브라우저가 아닌 테스트/Node 환경에서는 원본 반환
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  // 이미 1MB 미만이면 추가 압축 건너뜀 (0.8MB 이하)
  const maxSize = options?.maxSizeMB ?? 1;
  if (file.size <= maxSize * 1024 * 1024 * 0.8) {
    return file;
  }

  const defaultOptions: BrowserImageCompressionOptions = {
    maxSizeMB: maxSize,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 1920,
    useWebWorker: options?.useWebWorker ?? true,
    fileType: options?.fileType || (file.type === 'image/png' ? 'image/png' : 'image/webp'),
  };

  try {
    const compressedBlob = await imageCompression(file, defaultOptions);
    return new File([compressedBlob], file.name, {
      type: defaultOptions.fileType || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image compression fallback to original:', error);
    return file;
  }
}
