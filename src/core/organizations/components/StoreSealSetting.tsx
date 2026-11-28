import { useRef, useState, type FC } from 'react';
import { Stamp, Trash2, Upload, Loader2 } from 'lucide-react';
import { normalizeSealImage } from '@/shared/utils/normalizeSealImage';
import { showToast } from '@/shared/feedback/uiFeedback';

interface StoreSealSettingProps {
  sealUrl: string | null;
  onChange: (nextUrl: string | null) => void;
  disabled?: boolean;
}

/**
 * 사업장 직인(도장) 초경량 업로드 카드
 * - Canvas 200×200 / 200KB 자동 정규화 후 data URL 로 저장(설정 JSON)
 */
export const StoreSealSetting: FC<StoreSealSettingProps> = ({
  sealUrl,
  onChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePick = () => {
    if (disabled || isProcessing) return;
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 등록할 수 있습니다.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const normalized = await normalizeSealImage(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('직인 이미지를 읽지 못했습니다.'));
        reader.readAsDataURL(normalized);
      });
      onChange(dataUrl);
      showToast('직인 이미지가 등록되었습니다. (200×200 / 200KB 이하로 최적화)', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : '직인 이미지 처리에 실패했습니다.',
        'error'
      );
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
          {sealUrl ? (
            <img src={sealUrl} alt="사업장 직인 미리보기" className="w-full h-full object-contain p-1" />
          ) : (
            <Stamp className="w-7 h-7 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-bold text-slate-900">사업장 직인(도장)</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              납입증명서 서명란에 표시됩니다. 업로드 시 자동으로 200×200px · 200KB 이하 PNG로 압축됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePick}
              disabled={disabled || isProcessing}
              className="inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{sealUrl ? '도장 이미지 변경' : '도장 이미지 등록'}</span>
            </button>
            {sealUrl && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled || isProcessing}
                className="inline-flex items-center justify-center gap-1.5 h-12 px-3 rounded-xl bg-white border border-slate-200 text-rose-600 text-xs font-bold hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>삭제</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
};
