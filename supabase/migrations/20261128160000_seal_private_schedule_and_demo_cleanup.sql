-- 직인(도장) URL · 일정 비공개 플래그 · 데모 주입 RPC 제거

-- 1) 사업장 직인 URL (납입증명서 연동)
ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS seal_image_url TEXT;

COMMENT ON COLUMN core.organizations.seal_image_url IS
  '사업장 직인(도장) 이미지 URL. 클라이언트 Canvas 200x200/200KB 정규화 후 저장.';

-- 2) 일정 비공개 (작성자 본인·owner/admin 외 마스킹)
ALTER TABLE core.schedules
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN core.schedules.is_private IS
  'true면 타 직원 조회 시 제목·고객·메모 마스킹(비공개 일정). owner/admin/본인은 원본 열람.';

CREATE INDEX IF NOT EXISTS idx_core_schedules_org_staff_private
  ON core.schedules (organization_id, staff_id, starts_at)
  WHERE is_private = true;

-- 3) 데모/샘플 주입 RPC 제거 (존재 시)
DROP FUNCTION IF EXISTS public.inject_demo_students(uuid);
DROP FUNCTION IF EXISTS public.inject_demo_data(uuid);
DROP FUNCTION IF EXISTS core.inject_demo_students(uuid);
DROP FUNCTION IF EXISTS core.inject_demo_data(uuid);

-- 4) 고객 메타데이터 샘플 태그 정리(표시용 플래그만 해제)
UPDATE core.customers
SET metadata = COALESCE(metadata, '{}'::jsonb) - 'is_sample' - 'demo_sandbox',
    updated_at = now()
WHERE metadata ? 'is_sample'
   OR metadata ? 'demo_sandbox';
