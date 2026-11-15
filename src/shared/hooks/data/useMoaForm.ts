import { useForm as useHookForm, type UseFormProps } from 'react-hook-form';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantColumnForResource, isTenantScopedResource } from '@/providers/dataProvider';
import { useMoaMutation, type UseMoaMutationOptions } from './useMoaMutation';

export interface UseMoaFormOptions<TFormData extends Record<string, any> = Record<string, any>>
  extends UseFormProps<TFormData>,
    UseMoaMutationOptions {
  /** 대상 리소스명 */
  resource: string;
  /** 수정 모드일 때의 대상 레코드 ID */
  recordId?: string | number;
  /** 저장 성공 시 콜백 */
  onSuccess?: (savedData: any) => void;
}

export function useMoaForm<TFormData extends Record<string, any> = Record<string, any>>(
  options: UseMoaFormOptions<TFormData>
) {
  const { resource, recordId, onSuccess, entityName, schema, disableSuccessToast, disableErrorToast, ...formOptions } =
    options;

  const { currentOrganization } = useOrganization();
  const form = useHookForm<TFormData>(formOptions);

  const { createAsync, updateAsync, isPending } = useMoaMutation(resource, {
    entityName,
    schema,
    disableSuccessToast,
    disableErrorToast,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: Record<string, any> = { ...values };

    if (currentOrganization?.id && isTenantScopedResource(resource)) {
      const tenantCol = getTenantColumnForResource(resource);
      if (!payload[tenantCol]) {
        payload[tenantCol] = currentOrganization.id;
      }
    }

    let result;
    if (recordId) {
      result = await updateAsync(recordId, payload);
    } else {
      result = await createAsync(payload);
    }

    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: isPending || form.formState.isSubmitting,
  };
}
