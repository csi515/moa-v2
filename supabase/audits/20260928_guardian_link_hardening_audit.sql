-- =============================================================================
-- 보호자 연결 코드 보강 점검 (READ ONLY) — 2026-09-28 STEP 2 (20260928150000) 후속
--
-- 실행 (20260928130000 → 20260928140000 → 20260928150000 적용 후, 관리자 권한):
--   Supabase Dashboard > SQL Editor 또는
--   psql "$DATABASE_URL" -f supabase/audits/20260928_guardian_link_hardening_audit.sql
-- 데이터는 변경하지 않는다.
-- =============================================================================

BEGIN TRANSACTION READ ONLY;

-- (1) 활성 연결 코드 현황: 기존(v1, 8자리) vs 신규(v2, 20자리)
--     v1 은 만료되면 자연 소멸. max_uses>1 인 기존 코드는 트리거 이전 발급분.
SELECT '1_active_tokens_by_format' AS check_name,
       COALESCE(glt.metadata->>'code_format', 'v1_legacy') AS code_format,
       count(*) AS active_count,
       count(*) FILTER (WHERE glt.max_uses > 1) AS multi_use_count,
       max(glt.expires_at) AS last_expiry
FROM core.guardian_link_tokens glt
WHERE glt.used_count < glt.max_uses
  AND (glt.expires_at IS NULL OR glt.expires_at > now())
GROUP BY 1, 2
ORDER BY 2;

-- (2) 만료 없는(expires_at IS NULL) 활성 코드 — 있으면 관리자 화면에서 폐기 권장
SELECT '2_active_tokens_without_expiry' AS check_name,
       glt.id, glt.organization_id, glt.student_id, glt.created_at, glt.max_uses, glt.used_count
FROM core.guardian_link_tokens glt
WHERE glt.expires_at IS NULL AND glt.used_count < glt.max_uses;

-- (3) 계정 연결 보호자 수가 상한(core.max_linked_guardians_per_student())을 넘는 학생
--     (보강 이전 데이터 또는 직원 명시 연결). 신규 코드 연결은 거절된다.
SELECT '3_students_over_guardian_cap' AS check_name,
       g.student_id, count(*) AS linked_guardians, core.max_linked_guardians_per_student() AS cap
FROM core.parent_student_guardians g
JOIN core.parents p ON p.id = g.parent_id
WHERE p.user_id IS NOT NULL
GROUP BY g.student_id
HAVING count(*) > core.max_linked_guardians_per_student()
ORDER BY linked_guardians DESC;

-- (4) 최근 24시간 rate limit / 실패 상위 사용자 (대입 공격 징후)
SELECT '4_recent_guardian_link_failures' AS check_name,
       a.user_id,
       count(*) FILTER (WHERE NOT a.success) AS failures,
       count(*) FILTER (WHERE a.reason = 'rate_limited') AS rate_limited,
       min(a.created_at) AS first_at, max(a.created_at) AS last_at
FROM core.guardian_link_attempts a
WHERE a.created_at > now() - interval '24 hours'
GROUP BY a.user_id
HAVING count(*) FILTER (WHERE NOT a.success) >= 5
ORDER BY failures DESC
LIMIT 50;

-- (5) 코드 연결로 생성된 재등록 승인 대기 요청 (퇴원 학생) — 직원 처리 필요
SELECT '5_pending_reenroll_from_link' AS check_name,
       r.id, r.organization_id, r.student_id, r.parent_id, r.requested_at
FROM core.guardian_enrollment_requests r
WHERE r.status = 'pending' AND r.metadata->>'source' = 'guardian_link_redeem'
ORDER BY r.requested_at DESC;

-- (6) 시도 기록 테이블 크기 (보관 주기 정리 필요 여부 판단)
SELECT '6_attempts_table_size' AS check_name,
       count(*) AS total_rows,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_than_30d
FROM core.guardian_link_attempts;

-- (7) [20260928160000] 계정(user_id)이 다른 전역 parents 행에 있는데 그 보호자에 매핑되지 않은 조직 학부모 고객
--     (수정 이전 데이터 후보). 직원 연결이 계정 보호자에 반영되지 않을 수 있음 → 브리지 동기화 또는 수동 확인.
SELECT '7_parent_customer_unmapped_account' AS check_name,
       c.id AS customer_id, c.organization_id, c.user_id, p.id AS account_parent_id, o.parent_id AS mapped_parent_id
FROM core.customers c
JOIN core.parents p ON p.user_id = c.user_id AND p.id <> c.id
LEFT JOIN core.org_parent_profiles o ON o.customer_id = c.id
WHERE c.metadata->>'entityType' = 'parent'
  AND c.user_id IS NOT NULL
  AND o.parent_id IS DISTINCT FROM p.id
ORDER BY c.organization_id;

COMMIT;
