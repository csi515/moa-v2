import type { FC } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal } from '@/shared/components';
import { AppDrawer } from '@/shared/components/commandPalette/AppDrawer';
import {
  CustomerForm,
  type CustomerFormMode,
  type CustomerFormValues,
} from '@/core/customer/components/CustomerForm';

type Props = {
  open: boolean;
  mode: CustomerFormMode;
  title: string;
  initialValues?: Partial<CustomerFormValues>;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
};

/** 데스크톱은 모달, 모바일은 하단 드로어로 같은 고객 폼을 연다. */
export const RetailCustomerFormHost: FC<Props> = ({
  open,
  mode,
  title,
  initialValues,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  if (!open) return null;

  const form = (
    <CustomerForm
      key={`${mode}-${initialValues?.name ?? ''}-${initialValues?.phone ?? ''}`}
      mode={mode}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onClose}
      isSubmitting={isSubmitting}
      idPrefix={`retail-customer-${mode}`}
    />
  );

  if (isDesktop) {
    return (
      <Modal isOpen={open} onClose={onClose} title={title} maxWidth="md">
        <div className="p-4 sm:p-6">{form}</div>
      </Modal>
    );
  }

  return (
    <AppDrawer open={open} title={title} onClose={onClose}>
      {form}
    </AppDrawer>
  );
};
