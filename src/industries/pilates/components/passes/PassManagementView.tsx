import type { FC } from 'react';
import {
  PassManagementView as CapabilityPassManagementView,
  type PassManagementConfig,
  type PassManagementViewProps,
} from '@/capabilities/billing/ui/PassManagementView';
import { pilatesPassConfig } from '../../config/passConfig';

export const PassManagementView: FC<PassManagementViewProps> = ({ config, ...props }) => (
  <CapabilityPassManagementView config={{ ...pilatesPassConfig, ...config }} {...props} />
);

export type { PassManagementConfig };
