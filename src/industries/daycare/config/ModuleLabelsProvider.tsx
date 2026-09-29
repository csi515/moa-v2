import type { FC, ReactNode } from 'react';
import { ModuleLabelsProvider as CoreLabelsProvider } from '@/core/labels';
import { daycareModuleLabels, type ModuleLabels } from './labels';

export const ModuleLabelsProvider: FC<{ children: ReactNode; labels?: ModuleLabels }> = ({
  children,
  labels = daycareModuleLabels,
}) => <CoreLabelsProvider labels={labels}>{children}</CoreLabelsProvider>;

export { useModuleLabels } from '@/core/labels';
