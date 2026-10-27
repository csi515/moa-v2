-- =============================================================================
-- 학부모/교직원 연결 보안 감사 (READ ONLY) — 2026-09-28 parent-link hotfix 후속
--
-- 목적: 핫픽스 이전에 "이메일 일치 자동 연결" 취약점으로 잘못 연결되었을 수 있는
--       계정을 찾기 위한 조회 전용 스크립트. 데이터는 전혀 변경하지 않는다.
--
-- 실행 방법 (핫픽스 마이그레이션 20260928130000 + 20260928140000 적용 후, 관리자 권한):
--   Supabase Dashboard > SQL Editor 에 붙여넣어 실행하거나
--   psql "$DATABASE_URL" -f supabase/audits/20260928_parent_link_audit.sql
--
-- 결과 해석: 여기 나오는 행은 "의심 후보"이지 확정된 침해가 아니다.
--   특히 (4)(5)는 휴리스틱이다 — 등록 요청 승인, 학부모 직접 등록 등 정상 경로도 포함될 수 있다.
--   의심 행은 기관 관리자/학부모 본인 확인 후 수동으로 연결 해제(unlink)할 것.
-- =============================================================================

BEGIN TRANSACTION READ ONLY;

-- (1) 현재 profiles.email 과 auth.users.email 불일치
--     핫픽스 트리거가 적용되면 0건이어야 한다.
SELECT '1_live_profile_email_mismatch' AS check_name,
       p.id AS user_id, p.email AS profile_email, u.email AS auth_email, p.updated_at
FROM core.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(coalesce(p.email, '')) IS DISTINCT FROM lower(coalesce(u.email, ''))
ORDER BY p.updated_at DESC NULLS LAST;

-- (2) 핫픽스 적용 직전 스냅샷: profiles.email 이 auth 이메일과 달랐던 사용자
--     (사용자가 이메일을 직접 바꾼 흔적 — 가장 강한 신호)
SELECT '2_pre_hotfix_email_snapshot' AS check_name, s.*
FROM core.security_profile_email_snapshot s
ORDER BY s.captured_at DESC NULLS LAST;

-- (3) auth_providers.email 이 auth.users.email 과 다른 행 (클라이언트가 지정 가능했던 값)
SELECT '3_auth_provider_email_mismatch' AS check_name,
       ap.user_id, ap.provider, ap.email AS provider_email, u.email AS auth_email, ap.updated_at
FROM core.auth_providers ap
JOIN auth.users u ON u.id = ap.user_id
WHERE ap.email IS NOT NULL
  AND lower(ap.email) IS DISTINCT FROM lower(coalesce(u.email, ''))
ORDER BY ap.updated_at DESC NULLS LAST;

-- (4) 'accepted' 상태의 학부모 초대 = 이메일 일치 자동 연결(connect_parent_on_login /
--     invite_parent_member 즉시 연결)로 수락된 초대. 연결된 계정의 이메일과 비교한다.
SELECT '4_accepted_parent_invitations' AS check_name,
       pi.id AS invitation_id, pi.organization_id, o.name AS organization_name,
       pi.parent_customer_id, c.name AS parent_name,
       pi.email AS invited_email, c.user_id AS linked_user_id,
       u.email AS linked_auth_email, pr.email AS linked_profile_email,
       u.created_at AS linked_user_created_at, pi.created_at AS invited_at, pi.accepted_at,
       (u.created_at > pi.created_at) AS account_created_after_invite,
       EXISTS (SELECT 1 FROM core.security_profile_email_snapshot s WHERE s.user_id = c.user_id)
         AS had_email_mismatch
FROM core.parent_invitations pi
LEFT JOIN core.organizations o ON o.id = pi.organization_id
LEFT JOIN core.customers c ON c.id = pi.parent_customer_id
LEFT JOIN auth.users u ON u.id = c.user_id
LEFT JOIN core.profiles pr ON pr.id = c.user_id
WHERE pi.status = 'accepted'
ORDER BY pi.accepted_at DESC NULLS LAST;

-- (5) 계정이 연결된 학부모 고객 중, 해당 학부모용 연결 코드가 한 번도 사용되지 않은 경우
--     (redeem 은 사용자 ID 를 기록하지 않으므로 휴리스틱)
SELECT '5_linked_parent_without_token_redeem' AS check_name,
       c.id AS parent_customer_id, c.organization_id, o.name AS organization_name, c.name AS parent_name,
       c.email AS customer_email, c.user_id AS linked_user_id, u.email AS linked_auth_email,
       u.created_at AS linked_user_created_at, c.updated_at,
       EXISTS (SELECT 1 FROM core.parent_invitations pi
               WHERE pi.parent_customer_id = c.id AND pi.status = 'accepted') AS has_accepted_invitation,
       EXISTS (SELECT 1 FROM core.guardian_enrollment_requests ger
               WHERE ger.parent_id = c.id AND ger.organization_id = c.organization_id
                 AND ger.status = 'approved') AS has_approved_enrollment_request
FROM core.customers c
LEFT JOIN core.organizations o ON o.id = c.organization_id
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.user_id IS NOT NULL
  AND c.metadata->>'entityType' = 'parent'
  AND NOT EXISTS (
    SELECT 1 FROM core.guardian_link_tokens glt
    WHERE glt.organization_id = c.organization_id
      AND glt.used_count > 0
      AND glt.metadata->>'parent_customer_id' = c.id::text
  )
ORDER BY c.updated_at DESC NULLS LAST;

-- (6) 학부모-학생 보호자 연결 중 해당 학생에 대해 사용된 연결 코드가 없는 경우 (휴리스틱)
SELECT '6_guardian_link_without_token' AS check_name,
       psg.parent_id, par.user_id AS parent_user_id, u.email AS parent_auth_email,
       psg.student_id, s.display_name AS student_name, psg.created_at
FROM core.parent_student_guardians psg
JOIN core.parents par ON par.id = psg.parent_id
LEFT JOIN auth.users u ON u.id = par.user_id
LEFT JOIN core.students s ON s.id = psg.student_id
WHERE par.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core.guardian_link_tokens glt
    WHERE glt.student_id = psg.student_id
      AND glt.used_count > 0
      AND (glt.metadata->>'parent_customer_id' IS NULL
           OR glt.metadata->>'parent_customer_id' = psg.parent_id::text)
  )
  AND NOT EXISTS (
    SELECT 1 FROM core.guardian_enrollment_requests ger
    WHERE ger.parent_id = psg.parent_id AND ger.student_id = psg.student_id
      AND ger.status = 'approved'
  )
ORDER BY psg.created_at DESC NULLS LAST;

-- (7) 'accepted' 상태의 교직원 초대 (connect_staff_on_login / invite_staff_member 이메일 일치 연결)
--     accepted_by 가 NULL 이면 토큰 수락(accept_staff_invite) 이전 방식으로 연결된 것 → 우선 확인 대상
SELECT '7_accepted_staff_invitations' AS check_name,
       si.id AS invitation_id, si.organization_id, o.name AS organization_name,
       si.staff_id, st.name AS staff_name, si.email AS invited_email, si.role,
       st.user_id AS linked_user_id, u.email AS linked_auth_email,
       u.created_at AS linked_user_created_at, si.created_at AS invited_at, si.accepted_at,
       (si.accepted_by IS NULL) AS accepted_without_token,
       EXISTS (SELECT 1 FROM core.security_profile_email_snapshot s WHERE s.user_id = st.user_id)
         AS had_email_mismatch
FROM core.staff_invitations si
LEFT JOIN core.organizations o ON o.id = si.organization_id
LEFT JOIN core.staff st ON st.id = si.staff_id
LEFT JOIN auth.users u ON u.id = st.user_id
WHERE si.status = 'accepted'
ORDER BY si.accepted_at DESC NULLS LAST;

-- (7b) 토큰 없는 레거시 pending 교직원 초대 — 더 이상 수락 불가, 관리자가 '재발급' 필요
SELECT '7b_legacy_pending_staff_invites_without_code' AS check_name,
       si.id AS invitation_id, si.organization_id, o.name AS organization_name,
       si.staff_id, st.name AS staff_name, si.email AS invited_email, si.created_at
FROM core.staff_invitations si
LEFT JOIN core.organizations o ON o.id = si.organization_id
LEFT JOIN core.staff st ON st.id = si.staff_id
WHERE si.status = 'pending' AND si.token_hash IS NULL
ORDER BY si.created_at DESC;

-- (7c) 교직원 계정 연결(staff.user_id) 중 토큰 수락 기록이 없는 경우 (가입 신청 승인 경로는 정상일 수 있음)
SELECT '7c_staff_linked_without_token_accept' AS check_name,
       st.id AS staff_id, st.organization_id, o.name AS organization_name, st.name AS staff_name,
       st.user_id, u.email AS auth_email, u.created_at AS user_created_at, st.updated_at,
       EXISTS (SELECT 1 FROM core.organization_join_requests jr
               WHERE jr.organization_id = st.organization_id AND jr.user_id = st.user_id
                 AND jr.status = 'approved') AS has_approved_join_request
FROM core.staff st
LEFT JOIN core.organizations o ON o.id = st.organization_id
LEFT JOIN auth.users u ON u.id = st.user_id
WHERE st.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM core.staff_invitations si
                  WHERE si.staff_id = st.id AND si.status = 'accepted' AND si.accepted_by = st.user_id)
  AND NOT EXISTS (SELECT 1 FROM core.organization_members om
                  WHERE om.organization_id = st.organization_id AND om.user_id = st.user_id
                    AND om.role IN ('owner', 'admin'))
ORDER BY st.updated_at DESC NULLS LAST;

-- (8) 교직원 레코드 이메일과 연결된 계정의 auth 이메일이 다른 경우
SELECT '8_staff_email_mismatch' AS check_name,
       st.id AS staff_id, st.organization_id, st.name, st.email AS staff_email,
       st.user_id, u.email AS auth_email, om.role AS member_role
FROM core.staff st
JOIN auth.users u ON u.id = st.user_id
LEFT JOIN core.organization_members om
  ON om.organization_id = st.organization_id AND om.user_id = st.user_id
WHERE st.email IS NOT NULL
  AND lower(st.email) IS DISTINCT FROM lower(coalesce(u.email, ''))
ORDER BY st.updated_at DESC NULLS LAST;

-- (9) 요약
SELECT '9_summary' AS check_name,
  (SELECT count(*) FROM core.profiles p JOIN auth.users u ON u.id = p.id
    WHERE lower(coalesce(p.email,'')) IS DISTINCT FROM lower(coalesce(u.email,''))) AS live_email_mismatch,
  (SELECT count(*) FROM core.security_profile_email_snapshot) AS pre_hotfix_email_mismatch,
  (SELECT count(*) FROM core.parent_invitations WHERE status = 'accepted') AS accepted_parent_invitations,
  (SELECT count(*) FROM core.staff_invitations WHERE status = 'accepted') AS accepted_staff_invitations,
  (SELECT count(*) FROM core.staff_invitations WHERE status = 'accepted' AND accepted_by IS NULL)
    AS staff_accepted_without_token,
  (SELECT count(*) FROM core.staff_invitations WHERE status = 'pending' AND token_hash IS NULL)
    AS legacy_pending_staff_invites;

ROLLBACK;
