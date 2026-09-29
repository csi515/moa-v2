-- 피아노 완곡 게이미피케이션: song_progress + RLS + RPC
-- Moa 매핑: academy_id → organization_id, student_id → customer_id (core.customers)

BEGIN;

DO $$ BEGIN
  CREATE TYPE piano.song_progress_status AS ENUM (
    'IN_PROGRESS',
    'PENDING',
    'APPROVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS piano.song_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  book_name       VARCHAR(50) NOT NULL,
  song_title      VARCHAR(100) NOT NULL,
  status          piano.song_progress_status NOT NULL DEFAULT 'PENDING',
  stamps_awarded  INT NOT NULL DEFAULT 1 CHECK (stamps_awarded >= 0 AND stamps_awarded <= 10),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT song_progress_approved_at_check CHECK (
    (status = 'APPROVED' AND approved_at IS NOT NULL)
    OR (status <> 'APPROVED')
  )
);

CREATE INDEX IF NOT EXISTS idx_song_progress_org_status
  ON piano.song_progress(organization_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_song_progress_customer
  ON piano.song_progress(customer_id, status, approved_at DESC);

COMMENT ON TABLE piano.song_progress IS
  '완곡 신청·승인·스탬프. PENDING→APPROVED 원장 루프.';

DROP TRIGGER IF EXISTS set_updated_at ON piano.song_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON piano.song_progress
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE piano.song_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS song_progress_select ON piano.song_progress;
CREATE POLICY song_progress_select ON piano.song_progress
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS song_progress_insert ON piano.song_progress;
CREATE POLICY song_progress_insert ON piano.song_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'PENDING'
    AND (
      core.is_my_customer(organization_id, customer_id)
      OR core.parent_owns_student(organization_id, customer_id)
      OR core.is_org_staff_actor(organization_id)
    )
  );

DROP POLICY IF EXISTS song_progress_update_staff ON piano.song_progress;
CREATE POLICY song_progress_update_staff ON piano.song_progress
  FOR UPDATE TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS song_progress_delete_staff ON piano.song_progress;
CREATE POLICY song_progress_delete_staff ON piano.song_progress
  FOR DELETE TO authenticated
  USING (core.is_org_staff_actor(organization_id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION piano.request_song_completion(
  p_org_id UUID,
  p_customer_id UUID,
  p_book_name TEXT,
  p_song_title TEXT,
  p_memo TEXT DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_book := NULLIF(trim(p_book_name), '');
  v_title := NULLIF(trim(p_song_title), '');
  IF v_book IS NULL OR v_title IS NULL THEN
    RAISE EXCEPTION 'book_name and song_title are required';
  END IF;
  IF char_length(v_book) > 50 OR char_length(v_title) > 100 THEN
    RAISE EXCEPTION 'book_name or song_title too long';
  END IF;

  IF NOT (
    core.is_my_customer(p_org_id, p_customer_id)
    OR core.parent_owns_student(p_org_id, p_customer_id)
    OR core.is_org_staff_actor(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  -- 동일 교재·곡 PENDING 중복 방지
  IF EXISTS (
    SELECT 1 FROM piano.song_progress sp
    WHERE sp.organization_id = p_org_id
      AND sp.customer_id = p_customer_id
      AND sp.book_name = v_book
      AND sp.song_title = v_title
      AND sp.status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Already pending for this song';
  END IF;

  INSERT INTO piano.song_progress (
    organization_id, customer_id, book_name, song_title, status, memo
  ) VALUES (
    p_org_id, p_customer_id, v_book, v_title, 'PENDING',
    NULLIF(trim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

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
    updated_at = now()
  WHERE id = p_progress_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION piano.approve_song_progress_bulk(
  p_progress_ids UUID[],
  p_stamps INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piano, core, public
AS $$
DECLARE
  v_id UUID;
  v_count INT := 0;
BEGIN
  IF p_progress_ids IS NULL OR array_length(p_progress_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_id IN ARRAY p_progress_ids
  LOOP
    BEGIN
      IF piano.approve_song_progress(v_id, p_stamps) THEN
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip failed ids
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION piano.request_song_completion(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION piano.approve_song_progress(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION piano.approve_song_progress_bulk(UUID[], INT) TO authenticated;

COMMIT;
