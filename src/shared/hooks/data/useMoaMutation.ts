import { useCallback } from 'react';
import { useCreate, useUpdate, useDelete } from '@refinedev/core';
import type { BaseRecord } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantColumnForResource, isTenantScopedResource } from '@/providers/dataProvider';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { ResourceInsert, ResourceUpdate } from './types';

export interface UseMoaMutationOptions {
  /** 대상 엔티티의 한글 명칭 (예: '수강생', '사물함', '수업') */
  entityName?: string;
  /** 스키마 명칭 (예: 'piano', 'bath') */
  schema?: string;
  /** 자동 성공 토스트 비활성화 여부 */
  disableSuccessToast?: boolean;
  /** 자동 실패 토스트 비활성화 여부 */
  disableErrorToast?: boolean;
}

export function useMoaMutation<
  TResource extends string,
  TInsert = ResourceInsert<TResource>,
  TUpdate = ResourceUpdate<TResource>
>(
  resource: TResource,
  options: UseMoaMutationOptions = {}
) {
  const { currentOrganization } = useOrganization();
  const { entityName = '데이터', schema, disableSuccessToast = false, disableErrorToast = false } = options;

  const { mutateAsync: createMutate, mutation: createMutation } = useCreate<BaseRecord, any, TInsert>();
  const { mutateAsync: updateMutate, mutation: updateMutation } = useUpdate<BaseRecord, any, TUpdate>();
  const { mutateAsync: deleteMutate, mutation: deleteMutation } = useDelete();

  const meta = schema ? { schema } : undefined;

  /**
   * 신규 레코드 등록 (테넌트 ID 자동 주입 & 실패 시 한국어 정규화 에러 처리)
   */
  const createAsync = useCallback(
    async (values: TInsert, customSuccessMsg?: string) => {
      try {
        let finalValues = { ...values } as Record<string, unknown>;

        if (currentOrganization?.id && isTenantScopedResource(resource)) {
          const tenantCol = getTenantColumnForResource(resource);
          if (!finalValues[tenantCol]) {
            finalValues[tenantCol] = currentOrganization.id;
          }
        }

        const result = await createMutate({
          resource,
          values: finalValues as TInsert,
          meta,
        });

        // 성공 시 Cross-Cache Bridge 통지 (StorageService 미러 갱신)
        notifyStorageFromRefineResource(resource, 'create');

        if (!disableSuccessToast) {
          showToast(customSuccessMsg || `${entityName}이(가) 등록되었습니다.`, 'success');
        }

        return result;
      } catch (err: unknown) {
        const parsed = parseSupabaseError(err, { entity: entityName, action: '등록' });
        if (!disableErrorToast) {
          showToast(parsed.userMessage, 'error');
        }
        throw parsed;
      }
    },
    [resource, currentOrganization?.id, meta, entityName, disableSuccessToast, disableErrorToast, createMutate]
  );

  /**
   * 레코드 수정 (실패 시 한국어 정규화 에러 처리)
   */
  const updateAsync = useCallback(
    async (id: string | number, values: TUpdate, customSuccessMsg?: string) => {
      try {
        const result = await updateMutate({
          resource,
          id,
          values,
          meta,
        });

        notifyStorageFromRefineResource(resource, 'update');

        if (!disableSuccessToast) {
          showToast(customSuccessMsg || `${entityName} 정보가 수정되었습니다.`, 'success');
        }

        return result;
      } catch (err: unknown) {
        const parsed = parseSupabaseError(err, { entity: entityName, action: '수정' });
        if (!disableErrorToast) {
          showToast(parsed.userMessage, 'error');
        }
        throw parsed;
      }
    },
    [resource, meta, entityName, disableSuccessToast, disableErrorToast, updateMutate]
  );

  /**
   * 레코드 삭제 (실패 시 한국어 정규화 에러 처리)
   */
  const deleteAsync = useCallback(
    async (id: string | number, customSuccessMsg?: string) => {
      try {
        const result = await deleteMutate({
          resource,
          id,
          meta,
        });

        notifyStorageFromRefineResource(resource, 'delete');

        if (!disableSuccessToast) {
          showToast(customSuccessMsg || `${entityName}이(가) 삭제되었습니다.`, 'info');
        }

        return result;
      } catch (err: unknown) {
        const parsed = parseSupabaseError(err, { entity: entityName, action: '삭제' });
        if (!disableErrorToast) {
          showToast(parsed.userMessage, 'error');
        }
        throw parsed;
      }
    },
    [resource, meta, entityName, disableSuccessToast, disableErrorToast, deleteMutate]
  );

  return {
    createAsync,
    updateAsync,
    deleteAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPending:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
