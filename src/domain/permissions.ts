/**
 * Moa v2 Hybrid RBAC & Custom Permission Evaluation Engine
 *
 * Evaluates tenant-defined custom role permissions with wildcard support.
 * Pure function with zero UI/DB dependencies.
 */

/**
 * Evaluates whether a user's permissions grant access to a required action.
 *
 * Wildcard rules:
 * - '*' -> Grants all actions across all domains.
 * - 'domain:*' -> Grants all actions within that domain (e.g. 'passes:*' grants 'passes:view', 'passes:deduct').
 * - 'domain:action' -> Grants only the exact action.
 *
 * Backward Compatibility:
 * - If role === 'owner' or role === 'admin', unconditionally returns true.
 * - Both colon (':') and dot ('.') separators are normalized for interoperability.
 */
export function evaluateCustomPermission(
  userPermissions: string[] | undefined | null,
  requiredAction: string,
  role?: string | null
): boolean {
  // 1. Backward compatibility: Owner and Admin have omnipotent access
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  if (!requiredAction || typeof requiredAction !== 'string') {
    return false;
  }

  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  // Normalize separator (e.g. 'passes.view' -> 'passes:view')
  const normRequired = requiredAction.trim().replace(/\./g, ':').toLowerCase();

  for (const rawPerm of userPermissions) {
    if (!rawPerm || typeof rawPerm !== 'string') continue;
    const normPerm = rawPerm.trim().replace(/\./g, ':').toLowerCase();

    // Case 1: Global wildcard
    if (normPerm === '*') {
      return true;
    }

    // Case 2: Exact match
    if (normPerm === normRequired) {
      return true;
    }

    // Case 3: Domain wildcard (e.g. 'passes:*' matches 'passes:deduct')
    if (normPerm.endsWith(':*')) {
      const domainPrefix = normPerm.slice(0, -2);
      if (normRequired === domainPrefix || normRequired.startsWith(`${domainPrefix}:`)) {
        return true;
      }
    }
  }

  return false;
}
