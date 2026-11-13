import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { Check, Edit3, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Modal } from '@/shared/components/ui';
import {
  loadDaumPostcodeScript,
  mapDaumPostcodeToSearchResult,
  type DaumPostcodeData,
} from '../services/daumPostcodeLoader';
import type { AddressSearchResult } from '../types';

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: AddressSearchResult) => void;
}

export const AddressSearchModal: FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoadingScript, setIsLoadingScript] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // 모달이 열릴 때 카카오 우편번호 스크립트 로드 및 인스턴스 임베드
  useEffect(() => {
    if (!isOpen) {
      setManualMode(false);
      setManualInput('');
      setScriptError(null);
      return;
    }

    if (manualMode) return;

    let isMounted = true;
    setIsLoadingScript(true);
    setScriptError(null);

    loadDaumPostcodeScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.daum?.Postcode) return;

        // 기존 임베드 DOM 비우기
        containerRef.current.innerHTML = '';

        new window.daum.Postcode({
          oncomplete: (data: DaumPostcodeData) => {
            if (!isMounted) return;
            const result = mapDaumPostcodeToSearchResult(data);
            onSelect(result);
            onClose();
          },
          width: '100%',
          height: '460px',
          animation: true,
          autoMapping: true,
          focusInput: true,
        }).embed(containerRef.current);

        setIsLoadingScript(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingScript(false);
        setScriptError(
          err instanceof Error
            ? err.message
            : '카카오 주소 검색 서비스를 불러오지 못했습니다.'
        );
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, manualMode, onSelect, onClose]);

  const handleManualSubmit = (e?: FormEvent | { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    const trimmed = manualInput.trim();
    if (!trimmed) return;

    onSelect({
      roadAddress: trimmed,
      fullAddress: trimmed,
      jibun: null,
      postal: null,
      sido: null,
      sigungu: null,
      dong: null,
      buildingName: null,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={manualMode ? '사업장 주소 직접 입력' : '도로명 주소 검색 (카카오 우편번호)'}
      maxWidth="lg"
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* 상단 탭 / 모드 스위처 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <p className="text-xs text-slate-500">
            {manualMode
              ? '주소를 직접 입력하여 바로 등록할 수 있습니다.'
              : '도로명, 건물명, 지번을 입력하여 주소를 선택하세요.'}
          </p>
          <button
            type="button"
            data-testid="btn-address-manual-mode"
            onClick={() => setManualMode((prev) => !prev)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition min-h-[32px] px-2 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1 cursor-pointer"
          >
            {manualMode ? (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span>카카오 주소 검색으로 전환</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>직접 주소 입력</span>
              </>
            )}
          </button>
        </div>

        {/* 1. 직접 주소 입력 모드 */}
        {manualMode ? (
          // 위저드 등 상위 <form> 내부에 중첩되면 HTML이 깨지므로 form 태그 대신 div 사용
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                소재지 주소 입력
              </label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
                placeholder="예: 서울시 강남구 테헤란로 123"
                autoFocus
                data-testid="input-address-search-keyword"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[40px] cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!manualInput.trim()}
                data-testid="btn-address-search-submit"
                onClick={() => handleManualSubmit()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[40px] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>입력한 주소 적용</span>
              </button>
            </div>
          </div>
        ) : (
          /* 2. 카카오 우편번호 서비스 임베드 모드 */
          <div className="relative min-h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {isLoadingScript && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 gap-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-600">
                  카카오 주소 검색을 불러오는 중...
                </p>
              </div>
            )}

            {scriptError && (
              <div className="p-6 text-center space-y-3 my-auto">
                <p className="text-sm font-bold text-rose-600">{scriptError}</p>
                <p className="text-xs text-slate-500">
                  네트워크 환경을 확인하시거나 직접 주소를 입력해 주세요.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScriptError(null);
                      setIsLoadingScript(true);
                      loadDaumPostcodeScript()
                        .then(() => setIsLoadingScript(false))
                        .catch(() => setIsLoadingScript(false));
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>다시 시도</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>직접 주소 입력하기</span>
                  </button>
                </div>
              </div>
            )}

            {/* 카카오 Postcode UI가 임베드되는 컨테이너 */}
            <div
              ref={containerRef}
              data-testid="kakao-postcode-container"
              className="w-full h-[460px]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
