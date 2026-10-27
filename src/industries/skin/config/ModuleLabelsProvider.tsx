import React from 'react';
import { ModuleLabelsProvider as CoreLabelsProvider } from '@/core/labels';
import { skinModuleLabels, type ModuleLabels } from './labels';

export const ModuleLabelsProvider: React.FC<{
  children: React.ReactNode;
  labels?: ModuleLabels;
}> = ({ children, labels = skinModuleLabels }) => (
  <CoreLabelsProvider labels={labels}>{children}</CoreLabelsProvider>
);

export { useModuleLabels } from '@/core/labels';
