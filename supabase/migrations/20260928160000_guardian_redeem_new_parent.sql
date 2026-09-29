-- =============================================================================
-- 신규 학부모 계정의 일반 연결 코드 redeem 실패 수정 + 학부모 고객 재지정 차단
--
-- 선행: 20260928130000, 20260928140000 (#84), 20260928150000 (#85)
--
-- 원인:
--   redeem → ensure_global_parent_profile() 이 계정용 parents 행(G, user_id=계정)을 만든 뒤
--   ensure_org_parent_customer() 가 조직 학부모 고객(customers, user_id=계정)을 새로 INSERT.
--   customers 트리거 sync_customer_to_global_models 가 parents(id=고객id, user_id=계정)를
--   또 만들려다 parents_user_id_key(UNIQUE user_id) 충돌 → 트랜잭션 전체 실패.
--   (조직에 학부모 고객이 없는 모든 계정 = 학원이 코드를 주고 새 학부모가 가입하는 기본 흐름)
--
-- 수정:
--   1) ensure_org_parent_customer: 새 조직 고객 id 를 전역 parents id 와 같게 생성
--      (동기화 트리거들이 "고객 id = parents id" 를 전제로 함). id 가 이미 다른 조직
--      고객에 쓰였으면 새 id 로 만들고 2) 가 매핑.
--      이메일 일치 고객은 다른 계정에 연결되지 않은 경우에만 가져옴.
--   2) sync_customer_to_global_models: 고객의 user_id 가 이미 다른 parents 행에 있으면
--      중복 parents 를 만들지 않고 org_parent_profiles 로 그 보호자에 매핑
--      (placeholder parents 의 자녀 관계 이전). 계정 보호자 매핑은 고객 수정 시 유지.
--   3) sync_parent_link_to_guardian / sync_org_parent_student_bridge: 조직 고객 → 전역 보호자
--      매핑(org_parent_profiles)을 따라 parent_student_guardians 를 기록, user_id 중복 복사 금지.
--   4) enforce_guardian_limit_per_student: 직원 명시 연결 예외에 매핑 반영.
--   5) redeem/preview: 학부모 초대 코드의 대상 고객이 이미 다른 계정에 연결돼 있으면
--      status='parent_already_linked' 로 거절(코드 미소비). 초대 경로 병합 시 다른 조직
--      매핑·자녀 관계를 보존.
-- 호환: 모든 RPC 시그니처·기존 반환 키 유지.
-- =============================================================================

-- 1) ensure_org_parent_customer
CREATE OR REPLACE FUNCTION core.ensure_org_parent_customer(p_parent_id uuid, p_org_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_parent RECORD;
  v_customer_id UUID;
BEGIN
  IF p_parent_id IS NULL OR p_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT opp.customer_id INTO v_customer_id
  FROM core.org_parent_profiles opp
  WHERE opp.parent_id = p_parent_id
    AND opp.organization_id = p_org_id;

  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;

  SELECT * INTO v_parent FROM core.parents WHERE id = p_parent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Legacy: global parent id equals parent customer id in this org
  SELECT c.id INTO v_customer_id
  FROM core.customers c
  WHERE c.id = p_parent_id
    AND c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent';

  IF v_customer_id IS NULL AND v_parent.user_id IS NOT NULL THEN
    SELECT c.id INTO v_customer_id
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.metadata->>'entityType' = 'parent'
      AND c.user_id = v_parent.user_id
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_parent.email IS NOT NULL THEN
    -- 다른 계정에 이미 연결된 고객은 이메일이 같아도 가져오지 않음 (재지정 방지)
    SELECT c.id INTO v_customer_id
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.metadata->>'entityType' = 'parent'
      AND lower(trim(c.email)) = lower(trim(v_parent.email))
      AND (c.user_id IS NULL OR c.user_id = v_parent.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM core.org_parent_profiles o
        WHERE o.customer_id = c.id AND o.parent_id <> p_parent_id
          AND EXISTS (SELECT 1 FROM core.parents op WHERE op.id = o.parent_id AND op.user_id IS NOT NULL)
      )
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    -- 가능하면 조직 고객 id = 전역 parents id 로 맞춤 (동기화 트리거들이 이 전제를 사용).
    -- 이미 다른 조직 고객이 그 id 를 쓰면 새 id → 트리거가 org_parent_profiles 로 매핑.
    INSERT INTO core.customers (
      id, organization_id, name, phone, email, status, metadata, user_id
    )
    VALUES (
      CASE WHEN EXISTS (SELECT 1 FROM core.customers x WHERE x.id = p_parent_id)
           THEN gen_random_uuid() ELSE p_parent_id END,
      p_org_id,
      COALESCE(NULLIF(trim(v_parent.name), ''), '학부모'),
      v_parent.phone,
      v_parent.email,
      'active',
      jsonb_build_object('entityType', 'parent'),
      v_parent.user_id
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE core.customers
    SET
      user_id = COALESCE(user_id, v_parent.user_id),
      name = COALESCE(NULLIF(trim(name), ''), v_parent.name),
      phone = COALESCE(phone, v_parent.phone),
      email = COALESCE(email, v_parent.email),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (p_parent_id, p_org_id, v_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

  RETURN v_customer_id;
END;
$function$;

-- 2) sync_customer_to_global_models
CREATE OR REPLACE FUNCTION core.sync_customer_to_global_models()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_entity_type TEXT;
  v_birth_date DATE;
  v_join_date DATE;
  v_leave_date DATE;
  v_global_student_id UUID;
  v_owner UUID;
BEGIN
  v_entity_type := COALESCE(NEW.metadata->>'entityType', 'student');

  IF v_entity_type = 'parent' THEN
    IF NEW.user_id IS NOT NULL THEN
      SELECT p.id INTO v_owner
      FROM core.parents p
      WHERE p.user_id = NEW.user_id AND p.id <> NEW.id
      LIMIT 1;
    END IF;

    IF v_owner IS NOT NULL THEN
      -- 이 계정은 이미 다른 전역 보호자(parents) 행을 가짐.
      -- parents(id=고객id) 에 user_id 를 복사하면 parents_user_id_key 충돌 → 대신 조직 매핑.
      UPDATE core.parents
      SET name = NEW.name, phone = NEW.phone, email = NEW.email, updated_at = now()
      WHERE id = NEW.id AND user_id IS NULL;

      IF NOT EXISTS (
        SELECT 1 FROM core.org_parent_profiles o
        WHERE o.parent_id = v_owner
          AND o.organization_id = NEW.organization_id
          AND o.customer_id <> NEW.id
      ) THEN
        INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
        VALUES (v_owner, NEW.organization_id, NEW.id, NEW.created_at, now())
        ON CONFLICT (customer_id) DO UPDATE SET
          parent_id = EXCLUDED.parent_id,
          organization_id = EXCLUDED.organization_id,
          updated_at = now();

        -- 직원이 이 고객(계정 없는 placeholder parents 행)에 걸어 둔 자녀 관계를 계정 보호자로 이전
        IF EXISTS (SELECT 1 FROM core.parents p WHERE p.id = NEW.id AND p.user_id IS NULL) THEN
          INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at, updated_at)
          SELECT v_owner, g.student_id, g.relationship, g.is_primary, g.created_at, now()
          FROM core.parent_student_guardians g
          WHERE g.parent_id = NEW.id
          ON CONFLICT (parent_id, student_id) DO NOTHING;

          DELETE FROM core.parent_student_guardians WHERE parent_id = NEW.id;
        END IF;
      END IF;

      RETURN NEW;
    END IF;

    INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.name,
      NEW.phone,
      NEW.email,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      updated_at = now();

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
    VALUES (NEW.id, NEW.organization_id, NEW.id, NEW.created_at, NEW.updated_at)
    ON CONFLICT (customer_id) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      organization_id = EXCLUDED.organization_id,
      updated_at = now()
    WHERE NOT EXISTS (
      -- 계정 보호자에 매핑된 고객은 유지 (고객 정보 수정 시 매핑이 초기화되지 않도록)
      SELECT 1 FROM core.parents op
      WHERE op.id = core.org_parent_profiles.parent_id
        AND op.id <> EXCLUDED.customer_id
        AND op.user_id IS NOT NULL
    );

    RETURN NEW;
  END IF;

  v_birth_date := NULLIF(NEW.metadata->>'birthDate', '')::DATE;
  v_join_date := COALESCE(NULLIF(NEW.metadata->>'joinDate', '')::DATE, NEW.created_at::DATE);
  v_leave_date := NULLIF(NEW.metadata->>'leaveDate', '')::DATE;
  v_global_student_id := NULLIF(NEW.metadata->>'globalStudentId', '')::UUID;

  -- Guardian/CRM bridge: customer.id ≠ students.id — do not invent a shadow student
  IF v_global_student_id IS NOT NULL
     OR COALESCE(NEW.metadata->>'enrolledViaGuardianRequest', 'false') = 'true'
  THEN
    IF v_global_student_id IS NULL THEN
      -- Legacy approve rows without globalStudentId: enrollment은 approve RPC가 생성
      RETURN NEW;
    END IF;

    INSERT INTO core.student_enrollments (
      student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
    )
    VALUES (
      v_global_student_id,
      NEW.organization_id,
      NEW.id,
      core.customer_status_to_enrollment(NEW.status),
      v_join_date,
      v_leave_date,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      status = EXCLUDED.status,
      enrolled_at = EXCLUDED.enrolled_at,
      left_at = EXCLUDED.left_at,
      updated_at = now();

    RETURN NEW;
  END IF;

  -- Legacy / org-local student customer (id == students.id)
  INSERT INTO core.students (id, display_name, birth_date, created_at, updated_at)
  VALUES (NEW.id, NEW.name, v_birth_date, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    birth_date = COALESCE(EXCLUDED.birth_date, core.students.birth_date),
    updated_at = now();

  INSERT INTO core.student_enrollments (
    student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.organization_id,
    NEW.id,
    core.customer_status_to_enrollment(NEW.status),
    v_join_date,
    v_leave_date,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    status = EXCLUDED.status,
    enrolled_at = EXCLUDED.enrolled_at,
    left_at = EXCLUDED.left_at,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 3a) sync_parent_link_to_guardian
CREATE OR REPLACE FUNCTION core.sync_parent_link_to_guardian()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_parent_id UUID;
BEGIN
  IF current_setting('core.skip_link_to_guardian_sync', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT se.student_id INTO v_student_id
    FROM core.student_enrollments se
    WHERE se.customer_id = OLD.student_customer_id
      AND se.organization_id = OLD.organization_id
    LIMIT 1;

    -- 조직 고객 → 전역 보호자 매핑 (org_parent_profiles), 없으면 고객 id = parents id (레거시)
    SELECT o.parent_id INTO v_parent_id
    FROM core.org_parent_profiles o
    WHERE o.customer_id = OLD.parent_customer_id;
    v_parent_id := COALESCE(v_parent_id, OLD.parent_customer_id);

    IF v_student_id IS NOT NULL THEN
      DELETE FROM core.parent_student_guardians
      WHERE parent_id = v_parent_id
        AND student_id = v_student_id;
    END IF;

    RETURN OLD;
  END IF;

  SELECT se.student_id INTO v_student_id
  FROM core.student_enrollments se
  WHERE se.customer_id = NEW.student_customer_id
    AND se.organization_id = NEW.organization_id
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.parent_id INTO v_parent_id
  FROM core.org_parent_profiles o
  WHERE o.customer_id = NEW.parent_customer_id;

  IF v_parent_id IS NULL THEN
    v_parent_id := NEW.parent_customer_id;

    IF NOT EXISTS (SELECT 1 FROM core.parents WHERE id = v_parent_id) THEN
      -- 계정이 이미 다른 parents 행에 연결돼 있으면 user_id 복사 금지 (parents_user_id_key)
      INSERT INTO core.parents (id, user_id, name, phone, email)
      SELECT
        c.id,
        CASE
          WHEN c.user_id IS NOT NULL
               AND EXISTS (SELECT 1 FROM core.parents p2 WHERE p2.user_id = c.user_id)
          THEN NULL
          ELSE c.user_id
        END,
        c.name, c.phone, c.email
      FROM core.customers c
      WHERE c.id = NEW.parent_customer_id
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
      SELECT NEW.parent_customer_id, NEW.organization_id, NEW.parent_customer_id
      WHERE EXISTS (SELECT 1 FROM core.parents WHERE id = NEW.parent_customer_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM core.parents WHERE id = v_parent_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO core.parent_student_guardians (
    parent_id, student_id, relationship, is_primary, created_at, updated_at
  )
  VALUES (
    v_parent_id,
    v_student_id,
    NEW.relationship,
    NEW.is_primary,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 3b) sync_org_parent_student_bridge
CREATE OR REPLACE FUNCTION core.sync_org_parent_student_bridge(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_enrollments INT := 0;
  v_guardians INT := 0;
  v_parent RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- customers → students + enrollments
  INSERT INTO core.students (id, display_name, birth_date, created_at, updated_at)
  SELECT
    c.id,
    c.name,
    NULLIF(c.metadata->>'birthDate', '')::DATE,
    c.created_at,
    c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
    AND NOT EXISTS (SELECT 1 FROM core.students s WHERE s.id = c.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO core.student_enrollments (
    student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
  )
  SELECT
    c.id,
    c.organization_id,
    c.id,
    core.customer_status_to_enrollment(c.status),
    COALESCE(NULLIF(c.metadata->>'joinDate', '')::DATE, c.created_at::DATE),
    NULLIF(c.metadata->>'leaveDate', '')::DATE,
    c.created_at,
    c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
  ON CONFLICT (customer_id) DO UPDATE SET
    status = EXCLUDED.status,
    enrolled_at = EXCLUDED.enrolled_at,
    left_at = EXCLUDED.left_at,
    updated_at = now();

  GET DIAGNOSTICS v_enrollments = ROW_COUNT;

  -- parent customers → parents + org profiles
  -- (계정 보호자에 매핑된 고객은 건너뜀, 다른 parents 행이 가진 user_id 는 복사하지 않음)
  INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
  SELECT
    x.id,
    CASE WHEN x.owned_elsewhere OR x.user_rank > 1 THEN NULL ELSE x.user_id END,
    x.name, x.phone, x.email, x.created_at, x.updated_at
  FROM (
    SELECT
      c.*,
      (c.user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM core.parents p2 WHERE p2.user_id = c.user_id AND p2.id <> c.id
      )) AS owned_elsewhere,
      row_number() OVER (PARTITION BY c.user_id ORDER BY c.updated_at DESC, c.id) AS user_rank
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.metadata->>'entityType' = 'parent'
      AND NOT EXISTS (
        SELECT 1 FROM core.org_parent_profiles o
        JOIN core.parents op ON op.id = o.parent_id
        WHERE o.customer_id = c.id AND o.parent_id <> c.id AND op.user_id IS NOT NULL
      )
  ) x
  ON CONFLICT (id) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now();

  -- 계정이 다른 전역 parents 에 연결된 고객 → 그 보호자로 매핑 (조직당 1개)
  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
  SELECT DISTINCT ON (p.id) p.id, c.organization_id, c.id, c.created_at, now()
  FROM core.customers c
  JOIN core.parents p ON p.user_id = c.user_id AND p.id <> c.id
  WHERE c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent'
    AND c.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM core.org_parent_profiles o
      WHERE o.parent_id = p.id AND o.organization_id = c.organization_id
    )
  ORDER BY p.id, c.updated_at DESC
  ON CONFLICT (customer_id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
  SELECT c.id, c.organization_id, c.id, c.created_at, c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent'
    AND NOT EXISTS (
      SELECT 1 FROM core.org_parent_profiles o
      WHERE o.customer_id = c.id AND o.parent_id <> c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM core.org_parent_profiles o
      WHERE o.parent_id = c.id AND o.organization_id = c.organization_id AND o.customer_id <> c.id
    )
  ON CONFLICT (customer_id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    organization_id = EXCLUDED.organization_id,
    updated_at = now();

  -- links → guardians
  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at, updated_at)
  SELECT DISTINCT ON (m.parent_id, se.student_id)
    m.parent_id,
    se.student_id,
    psl.relationship,
    psl.is_primary,
    psl.created_at,
    now()
  FROM core.parent_student_links psl
  JOIN core.student_enrollments se
    ON se.customer_id = psl.student_customer_id
    AND se.organization_id = psl.organization_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT o.parent_id FROM core.org_parent_profiles o WHERE o.customer_id = psl.parent_customer_id),
      psl.parent_customer_id
    ) AS parent_id
  ) m
  WHERE psl.organization_id = p_org_id
    AND EXISTS (SELECT 1 FROM core.parents p WHERE p.id = m.parent_id)
  ORDER BY m.parent_id, se.student_id, psl.is_primary DESC, psl.updated_at DESC
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  GET DIAGNOSTICS v_guardians = ROW_COUNT;

  RETURN jsonb_build_object(
    'organization_id', p_org_id,
    'enrollments_synced', v_enrollments,
    'guardians_synced', v_guardians
  );
END;
$function$;

-- 4) enforce_guardian_limit_per_student
CREATE OR REPLACE FUNCTION core.enforce_guardian_limit_per_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_count INT;
  v_max INT := core.max_linked_guardians_per_student();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.parents p WHERE p.id = NEW.parent_id AND p.user_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- ON CONFLICT DO UPDATE 로 기존 관계를 갱신하는 경우
  IF EXISTS (
    SELECT 1 FROM core.parent_student_guardians g
    WHERE g.parent_id = NEW.parent_id AND g.student_id = NEW.student_id
  ) THEN
    RETURN NEW;
  END IF;

  -- 직원 동기화 트리거(parent_student_links → guardians) 경유
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- 직원이 명시적으로 연결한 관계 (조직 고객 → 전역 보호자 매핑 포함)
  IF EXISTS (
    SELECT 1
    FROM core.parent_student_links psl
    JOIN core.student_enrollments se
      ON se.customer_id = psl.student_customer_id
     AND se.organization_id = psl.organization_id
    LEFT JOIN core.org_parent_profiles o ON o.customer_id = psl.parent_customer_id
    WHERE (psl.parent_customer_id = NEW.parent_id OR o.parent_id = NEW.parent_id)
      AND se.student_id = NEW.student_id
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM 1 FROM core.students s WHERE s.id = NEW.student_id FOR UPDATE;

  SELECT COUNT(*) INTO v_count
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = NEW.student_id
    AND g.parent_id <> NEW.parent_id
    AND p.user_id IS NOT NULL;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Guardian limit reached (max % linked guardians per student)', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 5a) preview_guardian_link_token
CREATE OR REPLACE FUNCTION core.preview_guardian_link_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_guard JSONB;
  v_row RECORD;
  v_linked INT;
  v_found BOOLEAN := false;
  v_max INT := core.max_linked_guardians_per_student();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := core.guardian_link_code_hash(p_token);

  v_guard := core.guardian_link_rate_guard(v_uid, v_hash);
  IF NOT (v_guard->>'allowed')::BOOLEAN THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'rate_limited', NULL);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'rate_limited',
      'error', 'Too many attempts',
      'retry_after_seconds', (v_guard->>'retry_after')::INT
    );
  END IF;

  IF v_hash IS NOT NULL THEN
    SELECT
      glt.id,
      glt.organization_id,
      glt.student_id,
      glt.expires_at,
      glt.metadata,
      o.name AS org_name,
      COALESCE(NULLIF(trim(s.display_name), ''), NULLIF(trim(glt.metadata->>'student_name'), '')) AS student_name
    INTO v_row
    FROM core.guardian_link_tokens glt
    JOIN core.organizations o ON o.id = glt.organization_id
    LEFT JOIN core.students s ON s.id = glt.student_id
    WHERE glt.token_hash = v_hash
      AND glt.used_count < glt.max_uses
      AND (glt.expires_at IS NULL OR glt.expires_at > now())
      AND COALESCE(glt.metadata->>'revoked', 'false') <> 'true'
    ORDER BY glt.created_at DESC
    LIMIT 1;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'invalid_or_expired', NULL);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'invalid_or_expired',
      'error', 'Invalid or expired link code'
    );
  END IF;

  SELECT COUNT(*) INTO v_linked
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = v_row.student_id
    AND p.user_id IS NOT NULL
    AND p.user_id <> v_uid
    AND g.parent_id IS DISTINCT FROM NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  IF NULLIF(v_row.metadata->>'parent_customer_id', '') IS NOT NULL AND (
       EXISTS (SELECT 1 FROM core.customers c
               WHERE c.id = (v_row.metadata->>'parent_customer_id')::UUID
                 AND c.user_id IS NOT NULL AND c.user_id <> v_uid)
    OR EXISTS (SELECT 1 FROM core.parents p
               WHERE p.id = (v_row.metadata->>'parent_customer_id')::UUID
                 AND p.user_id IS NOT NULL AND p.user_id <> v_uid)
  ) THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'parent_already_linked', v_row.organization_id);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'parent_already_linked',
      'error', 'Parent already linked to another account'
    );
  END IF;

  IF v_linked >= v_max THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'guardian_limit_reached', v_row.organization_id);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'guardian_limit_reached',
      'error', 'Guardian limit reached',
      'max_guardians', v_max
    );
  END IF;

  PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, true, NULL, v_row.organization_id);
  PERFORM core.write_guardian_link_audit(
    v_row.organization_id, 'guardian_link.preview', v_row.id::TEXT,
    jsonb_build_object('student_id', v_row.student_id)
  );

  RETURN jsonb_build_object(
    'valid', true,
    'status', 'valid',
    'organization_name', v_row.org_name,
    'student_name', COALESCE(v_row.student_name, ''),
    'expires_at', v_row.expires_at
  );
END;
$function$;

-- 5b) redeem_guardian_link_token
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(
  p_token text,
  p_shared_fields jsonb DEFAULT '["display_name", "birth_date"]'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_guard JSONB;
  v_row RECORD;
  v_parent_id UUID;
  v_profile RECORD;
  v_parent_customer_id UUID;
  v_token_parent_customer_id UUID;
  v_relationship core.guardian_relationship := 'other';
  v_is_primary BOOLEAN := false;
  v_student_customer_id UUID;
  v_merged INT;
  v_links_synced INT;
  v_linked INT;
  v_max INT := core.max_linked_guardians_per_student();
  v_enrollment_status TEXT;
  v_status TEXT := 'linked';
  v_request_id UUID;
  v_found BOOLEAN := false;
  v_pc_user UUID;
  v_pp_user UUID;
  v_shared JSONB := COALESCE(p_shared_fields, '["display_name","birth_date"]'::JSONB);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := core.guardian_link_code_hash(p_token);

  v_guard := core.guardian_link_rate_guard(v_uid, v_hash);
  IF NOT (v_guard->>'allowed')::BOOLEAN THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'rate_limited', NULL);
    RETURN jsonb_build_object(
      'success', false,
      'status', 'rate_limited',
      'error', 'Too many attempts',
      'retry_after_seconds', (v_guard->>'retry_after')::INT
    );
  END IF;

  IF v_hash IS NOT NULL THEN
    SELECT glt.*, s.display_name AS student_name, o.name AS org_name
    INTO v_row
    FROM core.guardian_link_tokens glt
    JOIN core.students s ON s.id = glt.student_id
    JOIN core.organizations o ON o.id = glt.organization_id
    WHERE glt.token_hash = v_hash
      AND glt.used_count < glt.max_uses
      AND (glt.expires_at IS NULL OR glt.expires_at > now())
      AND COALESCE(glt.metadata->>'revoked', 'false') <> 'true'
    ORDER BY glt.created_at DESC
    LIMIT 1
    FOR UPDATE OF glt;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'invalid_or_expired', NULL);
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_or_expired',
      'error', 'Invalid or expired link code'
    );
  END IF;

  v_student_customer_id := NULLIF(v_row.metadata->>'customer_id', '')::UUID;
  v_token_parent_customer_id := NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  -- 학부모 초대 코드: 대상 학부모 고객이 이미 다른 계정에 연결돼 있으면 거절 (재지정 방지)
  IF v_token_parent_customer_id IS NOT NULL THEN
    SELECT c.user_id INTO v_pc_user FROM core.customers c WHERE c.id = v_token_parent_customer_id FOR UPDATE;
    SELECT p.user_id INTO v_pp_user FROM core.parents p WHERE p.id = v_token_parent_customer_id FOR UPDATE;
    IF (v_pc_user IS NOT NULL AND v_pc_user <> v_uid)
       OR (v_pp_user IS NOT NULL AND v_pp_user <> v_uid) THEN
      PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'parent_already_linked', v_row.organization_id);
      PERFORM core.write_guardian_link_audit(
        v_row.organization_id, 'guardian_link.redeem_rejected', v_row.id::TEXT,
        jsonb_build_object(
          'reason', 'parent_already_linked',
          'student_id', v_row.student_id,
          'parent_customer_id', v_token_parent_customer_id
        )
      );
      RETURN jsonb_build_object(
        'success', false,
        'status', 'parent_already_linked',
        'error', 'Parent already linked to another account',
        'student_name', v_row.student_name,
        'organization_name', v_row.org_name,
        'organization_id', v_row.organization_id
      );
    END IF;
  END IF;

  -- 보호자 상한 사전 검사 (코드 소비·변경 전). 동시 redeem 직렬화를 위해 학생 행 잠금.
  PERFORM 1 FROM core.students s WHERE s.id = v_row.student_id FOR UPDATE;

  SELECT COUNT(*) INTO v_linked
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = v_row.student_id
    AND p.user_id IS NOT NULL
    AND p.user_id <> v_uid
    AND g.parent_id IS DISTINCT FROM v_token_parent_customer_id;

  IF v_linked >= v_max THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'guardian_limit_reached', v_row.organization_id);
    PERFORM core.write_guardian_link_audit(
      v_row.organization_id, 'guardian_link.redeem_rejected', v_row.id::TEXT,
      jsonb_build_object(
        'reason', 'guardian_limit_reached',
        'student_id', v_row.student_id,
        'max_guardians', v_max
      )
    );
    RETURN jsonb_build_object(
      'success', false,
      'status', 'guardian_limit_reached',
      'error', 'Guardian limit reached',
      'max_guardians', v_max,
      'student_name', v_row.student_name,
      'organization_name', v_row.org_name,
      'organization_id', v_row.organization_id
    );
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = v_uid;

  UPDATE core.parents
  SET name = COALESCE(NULLIF(name, '학부모'), v_profile.full_name, '학부모'),
      email = COALESCE(email, v_profile.email),
      updated_at = now()
  WHERE id = v_parent_id;

  v_parent_customer_id := v_token_parent_customer_id;

  IF v_parent_customer_id IS NOT NULL THEN
    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parents
      SET user_id = NULL, updated_at = now()
      WHERE id = v_parent_id AND user_id = v_uid;
    END IF;

    UPDATE core.customers
    SET user_id = v_uid, updated_at = now()
    WHERE id = v_parent_customer_id AND organization_id = v_row.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, v_uid, c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = v_parent_customer_id
    ON CONFLICT (id) DO UPDATE SET
      user_id = v_uid,
      name = COALESCE(EXCLUDED.name, core.parents.name),
      phone = COALESCE(EXCLUDED.phone, core.parents.phone),
      email = COALESCE(EXCLUDED.email, core.parents.email),
      updated_at = now();

    IF v_parent_id <> v_parent_customer_id THEN
      -- 기존 전역 보호자(v_parent_id)의 자녀 관계를 초대 대상 학부모 행으로 병합 (중복은 건너뜀)
      INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at, updated_at)
      SELECT v_parent_customer_id, g.student_id, g.relationship, g.is_primary, g.created_at, now()
      FROM core.parent_student_guardians g
      WHERE g.parent_id = v_parent_id
      ON CONFLICT (parent_id, student_id) DO NOTHING;
      DELETE FROM core.parent_student_guardians WHERE parent_id = v_parent_id;

      -- 다른 조직 매핑도 새 보호자 행으로 이전 (해당 조직에 매핑이 없을 때만)
      UPDATE core.org_parent_profiles o
      SET parent_id = v_parent_customer_id, updated_at = now()
      WHERE o.parent_id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.org_parent_profiles o2
          WHERE o2.parent_id = v_parent_customer_id AND o2.organization_id = o.organization_id
        );

      DELETE FROM core.parents p
      WHERE p.id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.parent_student_guardians psg WHERE psg.parent_id = p.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM core.org_parent_profiles o WHERE o.parent_id = p.id
        );

      v_parent_id := v_parent_customer_id;
    END IF;
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(v_parent_id, v_row.organization_id);

  IF v_student_customer_id IS NOT NULL AND v_parent_customer_id IS NOT NULL THEN
    SELECT psl.relationship, psl.is_primary
    INTO v_relationship, v_is_primary
    FROM core.parent_student_links psl
    WHERE psl.organization_id = v_row.organization_id
      AND psl.parent_customer_id = v_parent_customer_id
      AND psl.student_customer_id = v_student_customer_id
    LIMIT 1;
  END IF;

  IF v_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, COALESCE(v_relationship, 'other'), COALESCE(v_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = COALESCE(EXCLUDED.relationship, core.parent_student_guardians.relationship),
    is_primary = EXCLUDED.is_primary OR core.parent_student_guardians.is_primary,
    updated_at = now();

  v_merged := core.merge_parent_created_student_if_duplicate(v_parent_id, v_row.student_id);

  INSERT INTO core.academy_data_sharing_consents (
    parent_id, student_id, organization_id, shared_fields
  )
  VALUES (
    v_parent_id,
    v_row.student_id,
    v_row.organization_id,
    v_shared
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  -- 등록 상태는 자동 변경하지 않음.
  -- 퇴원/졸업(withdrawn/alumni) 이면 직원 승인 대기 요청을 생성 (approve_guardian_enrollment 로 재등록).
  IF v_row.enrollment_id IS NOT NULL THEN
    SELECT se.status::TEXT INTO v_enrollment_status
    FROM core.student_enrollments se
    WHERE se.id = v_row.enrollment_id;
  END IF;

  IF v_enrollment_status IN ('withdrawn', 'alumni') THEN
    v_status := 'linked_enrollment_pending';

    INSERT INTO core.guardian_enrollment_requests (
      parent_id, student_id, organization_id, status, consent_fields, notes, metadata
    )
    VALUES (
      v_parent_id,
      v_row.student_id,
      v_row.organization_id,
      'pending',
      v_shared,
      '보호자 연결 코드로 연결됨 (퇴원 상태 — 재등록 승인 필요)',
      jsonb_build_object(
        'source', 'guardian_link_redeem',
        'token_id', v_row.id,
        'enrollment_id', v_row.enrollment_id,
        'enrollment_status', v_enrollment_status
      )
    )
    ON CONFLICT (parent_id, student_id, organization_id) WHERE status = 'pending'
    DO NOTHING
    RETURNING id INTO v_request_id;

    IF v_request_id IS NULL THEN
      SELECT ger.id INTO v_request_id
      FROM core.guardian_enrollment_requests ger
      WHERE ger.parent_id = v_parent_id
        AND ger.student_id = v_row.student_id
        AND ger.organization_id = v_row.organization_id
        AND ger.status = 'pending'
      LIMIT 1;
    END IF;
  END IF;

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1,
      metadata = metadata || jsonb_build_object(
        'redeemed_by', v_uid,
        'redeemed_at', now(),
        'redeem_status', v_status
      )
  WHERE id = v_row.id;

  v_links_synced := core.sync_parent_student_links_for_parent_org(v_parent_id, v_row.organization_id);

  PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, true, v_status, v_row.organization_id);
  PERFORM core.write_guardian_link_audit(
    v_row.organization_id, 'guardian_link.redeem', v_row.id::TEXT,
    jsonb_build_object(
      'status', v_status,
      'student_id', v_row.student_id,
      'parent_id', v_parent_id,
      'enrollment_status', v_enrollment_status,
      'enrollment_request_id', v_request_id,
      'shared_fields', v_shared
    )
  );

  -- 직원용 알림 (학부모 RLS 대상 타입 아님 → 관리자만 조회)
  INSERT INTO core.notifications (
    organization_id, type, title, message, target_type, target_id,
    status, channel, sent_at, metadata
  )
  VALUES (
    v_row.organization_id,
    'guardian_linked',
    '학부모 계정 연결',
    COALESCE(NULLIF(trim(v_row.student_name), ''), '학생') || ' 학생에 학부모 계정이 연결되었습니다.'
      || CASE WHEN v_status = 'linked_enrollment_pending'
              THEN ' 퇴원 상태라 재등록 승인이 필요합니다.' ELSE '' END,
    'student',
    COALESCE(v_student_customer_id, v_row.student_id),
    'sent',
    'app',
    now(),
    jsonb_build_object(
      'source', 'guardian_link_redeem',
      'student_id', v_row.student_id,
      'parent_id', v_parent_id,
      'token_id', v_row.id,
      'status', v_status,
      'enrollment_request_id', v_request_id,
      'audience', 'staff'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_status,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id,
    'student_id', v_row.student_id,
    'merged_duplicates', v_merged,
    'links_synced', v_links_synced,
    'enrollment_status', v_enrollment_status,
    'enrollment_request_id', v_request_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION core.preview_guardian_link_token(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.preview_guardian_link_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) TO authenticated;
