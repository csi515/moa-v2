-- 20261015130000_tenant_capabilities_and_terms.sql
-- 사업주 기능 ON/OFF 스위치보드 (active_capabilities) 및 맞춤 용어사전 (settings.custom_terms) 지원

ALTER TABLE core.organizations 
ADD COLUMN IF NOT EXISTS active_capabilities TEXT[] NOT NULL DEFAULT '{}';

-- 주석 추가
COMMENT ON COLUMN core.organizations.active_capabilities IS '사업주가 프리셋 외 추가 활성화한 Capability 식별자 목록';

-- 사업주(owner)의 organizations 설정 및 활성 기능 수정 RLS 보강
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'core' 
      AND tablename = 'organizations' 
      AND policyname = 'organizations_owner_update_settings'
  ) THEN
    CREATE POLICY organizations_owner_update_settings
      ON core.organizations
      FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT organization_id FROM core.organization_members
          WHERE user_id = auth.uid() AND role = 'owner'
        )
      )
      WITH CHECK (
        id IN (
          SELECT organization_id FROM core.organization_members
          WHERE user_id = auth.uid() AND role = 'owner'
        )
      );
  END IF;
END $$;
