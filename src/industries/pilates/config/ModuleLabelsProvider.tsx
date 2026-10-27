import React from 'react';
import { ModuleLabelsProvider as CoreLabelsProvider } from '@/core/labels';
import { pilatesModuleLabels, type ModuleLabels } from './labels';

export const ModuleLabelsProvider: React.FC<{
  children: React.ReactNode;
  labels?: ModuleLabels;
}> = ({ children, labels = pilatesModuleLabels }) => (
  <CoreLabelsProvider labels={labels}>{children}</CoreLabelsProvider>
);

export { useModuleLabels } from '@/core/labels';
