import type { ComponentType, ReactNode } from 'react';

/**
 * Overlay를 통해 렌더링되는 모달 컴포넌트가 주입받는 기본 Props
 */
export interface OverlayComponentProps<TResult = any> {
  isOpen: boolean;
  close: (result?: TResult) => void;
  [key: string]: any;
}

export interface OverlayItem {
  id: string;
  Component: ComponentType<any>;
  props: Record<string, any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export interface OverlayContextValue {
  /**
   * 커스텀 모달 컴포넌트를 열고 사용자의 닫기/확인 결과를 Promise로 반환
   */
  open: <TResult = any, TProps = Record<string, any>>(
    Component: ComponentType<TProps & OverlayComponentProps<TResult>>,
    props?: Omit<TProps, keyof OverlayComponentProps<TResult>>
  ) => Promise<TResult>;

  /**
   * 특정 모달을 ID로 닫음
   */
  close: (id: string, result?: any) => void;

  /**
   * 열려있는 모든 오버레이 강제 닫기
   */
  closeAll: () => void;

  /**
   * 시스템 표준 컨펌 다이얼로그 (Promise<boolean>)
   */
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}
