/**
 * Moa v2 Form Error Adapter
 *
 * Bridges backend RPC / Domain business validation errors into
 * React Hook Form / Refine setError or field-error mappings.
 */

export interface BusinessError {
  field?: string;
  message: string;
  code?: string;
}

export interface BusinessResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: BusinessError | string;
  errors?: Array<{ field?: string; message: string; code?: string }>;
}

export type SetErrorFn = (
  field: string,
  error: { type?: string; message: string },
  options?: { shouldFocus?: boolean }
) => void;

/**
 * Extracts a normalized map of field -> message from a BusinessResult.
 */
export function extractErrorMap(
  result: BusinessResult,
  fallbackField = 'root'
): Record<string, string> {
  if (result.success) {
    return {};
  }

  const map: Record<string, string> = {};

  if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
    for (const err of result.errors) {
      const field = err.field?.trim() || fallbackField;
      if (!map[field]) {
        map[field] = err.message;
      }
    }
  }

  if (result.error) {
    if (typeof result.error === 'string') {
      if (!map[fallbackField]) {
        map[fallbackField] = result.error;
      }
    } else {
      const field = result.error.field?.trim() || fallbackField;
      if (!map[field]) {
        map[field] = result.error.message;
      }
    }
  }

  // Fallback if result.success is false but no error message was provided
  if (Object.keys(map).length === 0) {
    map[fallbackField] = 'An unexpected business error occurred.';
  }

  return map;
}

/**
 * Automatically calls React Hook Form's setError function for all errors in BusinessResult.
 * Returns true if errors were found and applied, false otherwise.
 */
export function applyFormErrors(
  result: BusinessResult,
  setError: SetErrorFn,
  fallbackField = 'root'
): boolean {
  if (result.success) {
    return false;
  }

  const errorMap = extractErrorMap(result, fallbackField);
  const fields = Object.keys(errorMap);

  for (const field of fields) {
    setError(field, {
      type: 'manual',
      message: errorMap[field],
    });
  }

  return fields.length > 0;
}

/**
 * Adapter bridging caught Error / exceptions to React Hook Form's setError
 */
export function applyDomainErrorToForm(
  error: unknown,
  setError: SetErrorFn,
  fallbackField = 'root'
): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null && 'success' in error) {
    return applyFormErrors(error as BusinessResult, setError, fallbackField);
  }
  const message = error instanceof Error ? error.message : String(error);
  return applyFormErrors(
    { success: false, error: { message, field: fallbackField } },
    setError,
    fallbackField
  );
}
