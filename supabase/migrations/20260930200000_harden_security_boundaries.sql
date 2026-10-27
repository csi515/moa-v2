-- =============================================================================
-- Security Boundary Hardening (RLS & RPC Boundaries)
--
-- 1. REVOKE PUBLIC/authenticated execute privileges on internal SECURITY DEFINER functions:
--    - core.book_room_reservation_guarded: 내부 전용 예약 생성 함수.
--      PostgREST RPC 직접 호출 시 status/reviewed_by 검증 우회 위험 차단.
--    - core.ensure_org_parent_customer: 부모-고객 매핑 내부 함수 (redeem 플로우 전용).
--    - core.merge_parent_created_student_if_duplicate: 학생 중복 정리 내부 함수.
--    - core.sync_guardians_for_parent_org: 보호자 동기화 브릿지 내부 함수.
--
-- 2. Direct INSERT RLS lockdown on reservation tables:
--    - core.reservations: direct INSERT 차단 (반드시 core.request_reservation RPC 사용).
--      정원/일정/조직 검증 우회 및 status='confirmed' 임의 삽입 원천 차단.
--    - core.room_reservations: direct INSERT 차단 (반드시 request/create_staff RPC 사용).
--      운영시간/겹침 검증 우회 및 status='approved' 임의 삽입 차단.
--
-- 3. Self-update RLS lockdown on room reservations:
--    - core.room_reservations: 신청자의 direct UPDATE는 pending -> cancelled 취소만 허용.
--      자신의 예약을 직접 approved 로 승인 변경하거나 reviewed_by 위조 차단.
--
-- 4. Restrict member scope on guardian enrollment requests:
--    - core.guardian_enrollment_requests: admin/staff SELECT 정책에서 is_org_member 제거.
--      일반 고객/학부모 멤버가 타 가정의 등록 신청서(학생 정보, 연락처 등)를 열람하지 못하도록
--      core.is_org_staff_actor 로 스코프 축소.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Internal SECURITY DEFINER Functions: Revoke authenticated / public execute
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION core.book_room_reservation_guarded(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, core.room_reservation_status, TEXT, UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION core.book_room_reservation_guarded(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, core.room_reservation_status, TEXT, UUID
) TO postgres, service_role;

REVOKE ALL ON FUNCTION core.ensure_org_parent_customer(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.ensure_org_parent_customer(UUID, UUID) TO postgres, service_role;

REVOKE ALL ON FUNCTION core.merge_parent_created_student_if_duplicate(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.merge_parent_created_student_if_duplicate(UUID, UUID) TO postgres, service_role;

REVOKE ALL ON FUNCTION core.sync_guardians_for_parent_org(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.sync_guardians_for_parent_org(UUID, UUID) TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 2. core.reservations: Direct INSERT Lockdown
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS reservations_insert_authenticated ON core.reservations;
DROP POLICY IF EXISTS reservations_insert_deny ON core.reservations;
CREATE POLICY reservations_insert_deny ON core.reservations
  FOR INSERT TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY reservations_insert_deny ON core.reservations IS
  '예약 생성은 core.request_reservation RPC만 허용. 직접 INSERT 차단.';

-- ---------------------------------------------------------------------------
-- 3. core.room_reservations: Direct INSERT / Self UPDATE Hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS room_reservations_insert ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_insert_deny ON core.room_reservations;
CREATE POLICY room_reservations_insert_deny ON core.room_reservations
  FOR INSERT TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY room_reservations_insert_deny ON core.room_reservations IS
  '연습실 예약은 request_room_reservation / create_staff_room_reservation RPC만 허용.';

DROP POLICY IF EXISTS room_reservations_update_self ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_update_self_cancel ON core.room_reservations;
CREATE POLICY room_reservations_update_self_cancel ON core.room_reservations
  FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'cancelled'
  );

COMMENT ON POLICY room_reservations_update_self_cancel ON core.room_reservations IS
  '신청자 직접 수정은 pending 상태 건의 cancelled 취소만 허용. 승인 변조 차단.';

-- ---------------------------------------------------------------------------
-- 4. core.guardian_enrollment_requests: Member Scope Hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS guardian_enrollment_requests_admin_select ON core.guardian_enrollment_requests;
CREATE POLICY guardian_enrollment_requests_admin_select ON core.guardian_enrollment_requests
  FOR SELECT TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.is_org_staff_actor(organization_id)
  );

COMMENT ON POLICY guardian_enrollment_requests_admin_select ON core.guardian_enrollment_requests IS
  '등록 신청서 전체 조회는 staff_actor 및 owner/admin만 가능. 일반 회원 scope 제거.';

COMMIT;
