-- =============================================================================
-- Rollback: 20261024100000_separate_rank_and_feature_permissions_down.sql
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_dept_member_change ON core.department_members;
DROP FUNCTION IF EXISTS core.handle_org_structure_change();
DROP FUNCTION IF EXISTS core.grant_member_feature_permission(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS core.member_has_feature_grant(UUID, TEXT);

ALTER TABLE core.organization_members
  DROP COLUMN IF EXISTS feature_permissions;

COMMIT;
