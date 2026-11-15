import React, { type ReactNode } from 'react';
import { slotRegistry } from './slotRegistry';

export interface SlotProps<TContext = any> {
  name: string;
  context?: TContext;
  fallback?: ReactNode;
  wrapperClassName?: string;
}

export function Slot<TContext = any>({
  name,
  context,
  fallback = null,
  wrapperClassName,
}: SlotProps<TContext>): React.ReactElement | null {
  const extensions = slotRegistry.getExtensions<TContext>(name, context);

  if (extensions.length === 0) {
    return <>{fallback}</>;
  }

  const content = (
    <>
      {extensions.map(({ id, Component }) => (
        <Component key={id} context={context as TContext} />
      ))}
    </>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{content}</div>;
  }

  return content;
}
