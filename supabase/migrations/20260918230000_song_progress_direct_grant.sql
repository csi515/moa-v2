-- 선생님 수동 완곡 수여 + Realtime 미러링 지원
-- granted_by / granted_at 추가, 스태프 APPROVED INSERT, grant_song_stamp_direct

ALTER TABLE piano.song_progress
  ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ;

UPDATE piano.song_progress
SET
  granted_by = COALESCE(granted_by, approved_by),
  granted_at = COALESCE(granted_at, approved_at)
WHERE status = 'APPROVED';

-- 승인 RPC도 granted_* 동기화
CREATE OR REPLACE FUNCTION piano.approve_song_progress(
  p_progress_id UUID,
  p_stamps INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piano, core, public
AS $$
DECLARE
  v_row piano.song_progress%ROWTYPE;
  v_stamps INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM piano.song_progress WHERE id = p_progress_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song progress not found';
  END IF;

  IF NOT core.is_org_staff_actor(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only PENDING requests can be approved';
  END IF;

  v_stamps := GREATEST(1, LEAST(COALESCE(p_stamps, 1), 10));

  UPDATE piano.song_progress
  SET
    status = 'APPROVED',
    stamps_awarded = v_stamps,
    approved_at = now(),
    approved_by = auth.uid(),
    granted_at = now(),
    granted_by = auth.uid(),
    updated_at = now()
  WHERE id = p_progress_id;

  RETURN true;
END;
$$;

-- 스태프 INSERT: PENDING 또는 APPROVED 허용
DROP POLICY IF EXISTS song_progress_insert ON piano.song_progress;
CREATE POLICY song_progress_insert ON piano.song_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      status = 'PENDING'
      AND (
        core.is_my_customer(organization_id, customer_id)
        OR core.parent_owns_student(organization_id, customer_id)
        OR core.is_org_staff_actor(organization_id)
      )
    )
    OR (
      status = 'APPROVED'
      AND core.is_org_staff_actor(organization_id)
    )
  );

-- 레슨 중 즉시 스탬프 수여
CREATE OR REPLACE FUNCTION piano.grant_song_stamp_direct(
  p_org_id UUID,
  p_customer_id UUID,
  p_book_name TEXT,
  p_song_title TEXT,
  p_stamps INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piano, core, public
AS $$
DECLARE
  v_id UUID;
  v_book TEXT;
  v_title TEXT;
  v_stamps INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_book := NULLIF(trim(p_book_name), '');
  v_title := NULLIF(trim(p_song_title), '');
  IF v_book IS NULL OR v_title IS NULL THEN
    RAISE EXCEPTION 'book_name and song_title are required';
  END IF;
  IF char_length(v_book) > 50 OR char_length(v_title) > 100 THEN
    RAISE EXCEPTION 'book_name or song_title too long';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  v_stamps := GREATEST(1, LEAST(COALESCE(p_stamps, 1), 10));

  INSERT INTO piano.song_progress (
    organization_id,
    customer_id,
    book_name,
    song_title,
    status,
    stamps_awarded,
    requested_at,
    approved_at,
    approved_by,
    granted_at,
    granted_by
  ) VALUES (
    p_org_id,
    p_customer_id,
    v_book,
    v_title,
    'APPROVED',
    v_stamps,
    now(),
    now(),
    auth.uid(),
    now(),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION piano.grant_song_stamp_direct IS
  '원장/강사 레슨 중 완곡 스탬프 즉시 수여 (APPROVED INSERT)';

GRANT EXECUTE ON FUNCTION piano.grant_song_stamp_direct(UUID, UUID, TEXT, TEXT, INT) TO authenticated;

-- Realtime (이미 포함되어 있으면 무시)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE piano.song_progress;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
