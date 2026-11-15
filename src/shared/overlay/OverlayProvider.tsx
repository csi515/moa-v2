import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StandardConfirmModal } from './StandardConfirmModal';
import type {
  ConfirmDialogOptions,
  OverlayContextValue,
  OverlayItem,
} from './types';

const OverlayContext = createContext<OverlayContextValue | null>(null);

let overlayCounter = 0;

export interface OverlayProviderProps {
  children: ReactNode;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({ children }) => {
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);

  const close = useCallback((id: string, result?: any) => {
    setOverlays((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        target.resolve(result);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const closeAll = useCallback(() => {
    setOverlays((prev) => {
      prev.forEach((item) => item.resolve(undefined));
      return [];
    });
  }, []);

  const open = useCallback(
    <TResult = any, TProps = Record<string, any>>(
      Component: React.ComponentType<any>,
      props: any = {}
    ): Promise<TResult> => {
      return new Promise<TResult>((resolve, reject) => {
        const id = `overlay-${++overlayCounter}`;
        setOverlays((prev) => [
          ...prev,
          {
            id,
            Component,
            props,
            resolve,
            reject,
          },
        ]);
      });
    },
    []
  );

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return open<boolean>(StandardConfirmModal, options);
    },
    [open]
  );

  const contextValue = useMemo<OverlayContextValue>(
    () => ({
      open,
      close,
      closeAll,
      confirm,
    }),
    [open, close, closeAll, confirm]
  );

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
      {overlays.map(({ id, Component, props }) => (
        <Component
          key={id}
          isOpen={true}
          close={(result?: any) => close(id, result)}
          {...props}
        />
      ))}
    </OverlayContext.Provider>
  );
};

export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
}
