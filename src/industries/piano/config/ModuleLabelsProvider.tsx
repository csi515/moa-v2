import React, { type ReactNode } from 'react';
import { ModuleLabelsProvider as CoreLabelsProvider } from '@/core/labels';
import { pianoModuleLabels, type ModuleLabels } from './labels';

export type { ModuleLabels };

export const ModuleLabelsProvider: React.FC<{ children: ReactNode; labels?: ModuleLabels }> = ({
  children,
  labels = pianoModuleLabels,
}) => <CoreLabelsProvider labels={labels}>{children}</CoreLabelsProvider>;

/** Piano 모듈 UI 라벨 (Customer→학생, Staff→선생님 등) */
export { useModuleLabels } from '@/core/labels';
