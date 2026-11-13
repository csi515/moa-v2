/**
 * Moa-v2 선언적 키보드 단축키 & 접근성 훅
 *
 * `react-hotkeys-hook` 기반으로 25개 파일에 분산된
 * `window.addEventListener('keydown')` 보일러플레이트를 단일화하고,
 * 입력창(input/textarea) 포커스 시 단축키 오발동 방지 및 모달 스코프 격리를 보장합니다.
 */

import { useHotkeys, type Options as HotkeyOptions } from 'react-hotkeys-hook';

export interface MoaHotkeyOptions extends HotkeyOptions {
  /** 입력 폼(input, textarea 등) 내부에서도 단축키를 활성화할지 여부 (기본값: false) */
  enableOnFormTags?: boolean;
}

/**
 * 선언적 키보드 단축키 바인딩
 *
 * @example
 * useMoaHotkeys('mod+k', () => openCommandPalette());
 * useMoaHotkeys('mod+s', (e) => { e.preventDefault(); handleSave(); });
 */
export function useMoaHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: MoaHotkeyOptions,
  deps?: readonly unknown[]
) {
  return useHotkeys(
    keys,
    callback,
    {
      enableOnFormTags: options?.enableOnFormTags ?? false,
      preventDefault: options?.preventDefault ?? false,
      ...options,
    },
    deps
  );
}

/**
 * 모달, 드로어, 팝업 전용 Escape 키 닫기 훅
 * 
 * @param onEscape Escape 키 입력 시 실행할 콜백
 * @param enabled 활성화 여부 (기본값: true)
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  return useHotkeys(
    'escape',
    (e) => {
      e.stopPropagation();
      onEscape();
    },
    {
      enabled,
      enableOnFormTags: true, // 모달 내부 입력 중에도 ESC 누르면 닫기 허용
    },
    [onEscape, enabled]
  );
}
