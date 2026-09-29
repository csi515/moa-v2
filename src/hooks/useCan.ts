import type { CanInput } from '@/core/authorization';
import { useAuthorization } from './useAuthorization';

/** Permission-only UI hook. Navigation and workspace presentation are intentionally excluded. */
export function useCan(): (input: CanInput) => boolean {
  return useAuthorization().authorization.can;
}
