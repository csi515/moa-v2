-- ==============================================================================
-- Moa-v2 Clean Slate & Auto-Confirm Trigger Setup
-- 1. Clean existing test accounts and orphaned mock data
-- 2. Setup BEFORE INSERT trigger on auth.users for instant email auto-confirmation
-- 3. Re-seed core.permission_catalog for system permissions
-- ==============================================================================

-- 1. 하위 업무 트랜잭션 및 파생 레코드 삭제
DELETE FROM core.stock_movements;
DELETE FROM core.sale_items;
DELETE FROM core.sales;
DELETE FROM core.sale_returns;
DELETE FROM core.sale_return_items;
DELETE FROM core.point_transactions;
DELETE FROM core.point_accounts;
DELETE FROM core.session_passes;
DELETE FROM core.payments;
DELETE FROM core.payment_transactions;
DELETE FROM core.reservations;
DELETE FROM core.customer_sessions;
DELETE FROM core.room_reservations;
DELETE FROM core.attendance_sessions;
DELETE FROM core.schedules;
DELETE FROM core.consultations;
DELETE FROM core.notifications;
DELETE FROM core.customer_notifications;
DELETE FROM core.audit_logs;
DELETE FROM core.idempotency_keys;
DELETE FROM core.generic_entity_records;
DELETE FROM core.lockers;
DELETE FROM core.passes;
DELETE FROM core.outbox_events;
DELETE FROM core.care_journals;
DELETE FROM core.medication_requests;

-- 2. 고객/학부모/학생/직원 도메인 데이터 삭제
DELETE FROM core.student_enrollments;
DELETE FROM core.parent_student_links;
DELETE FROM core.parent_student_guardians;
DELETE FROM core.students;
DELETE FROM core.parents;
DELETE FROM core.customer_contacts;
DELETE FROM core.customer_join_requests;
DELETE FROM core.customers;
DELETE FROM core.staff;
DELETE FROM core.staff_invitations;
DELETE FROM core.organization_join_requests;
DELETE FROM core.guardian_enrollment_requests;

-- 3. 조직 멤버십 및 테넌트 삭제
DELETE FROM core.organization_members;
DELETE FROM core.locations;
DELETE FROM core.practice_rooms;
DELETE FROM core.seat_rooms;
DELETE FROM core.bookable_resources;
DELETE FROM core.product_variants;
DELETE FROM core.product_categories;
DELETE FROM core.inventory;
DELETE FROM core.products;
DELETE FROM core.tenant_roles;
DELETE FROM core.organization_roles;
DELETE FROM core.organizations;

-- 4. 사용자 프로필 및 소셜 인증 매핑 삭제
DELETE FROM core.auth_providers;
DELETE FROM core.profiles;

-- 5. piano 레거시 스키마 내 잔여 데이터 삭제
DELETE FROM piano.attendance;
DELETE FROM piano.class_members;
DELETE FROM piano.customers;
DELETE FROM piano.textbook_sales;
DELETE FROM piano.textbook_payments;
DELETE FROM piano.textbooks;
DELETE FROM piano.performance_videos;
DELETE FROM piano.song_progress;
DELETE FROM piano.curriculum_items;
DELETE FROM piano.curriculum_levels;

-- 6. 최상위 Supabase Auth 사용자 전량 삭제
DELETE FROM auth.users;

-- 7. [핵심] 신규 회원가입 시 이메일 확인 대기 원천 차단 (BEFORE INSERT 트리거)
CREATE OR REPLACE FUNCTION core.fn_auto_confirm_user_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_user_before_insert ON auth.users;
CREATE TRIGGER trg_auto_confirm_user_before_insert
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION core.fn_auto_confirm_user_before_insert();

-- 8. 시스템 기본 권한 카탈로그(core.permission_catalog) 기초 데이터 보강
INSERT INTO core.permission_catalog (permission, resource, action, description)
VALUES 
  ('org.manage', 'organization', 'manage', '조직 설정 및 기본 정보 관리'),
  ('inventory.manage', 'inventory', 'manage', '상품 및 자재 재고 입출고 관리')
ON CONFLICT (permission) DO NOTHING;
