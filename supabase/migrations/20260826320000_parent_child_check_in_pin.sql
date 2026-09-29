-- 학부모가 연결된 자녀(고객)별 출입 PIN 설정

-- 관리자 RPC: 학원 내 PIN 중복 검사 (동일 숫자 PIN이 다른 회원과 충돌하는지)
CREATE OR REPLACE FUNCTION core.is_check_in_pin_used_in_org(
  p_org_id UUID,
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.id <> p_customer_id
      AND c.check_in_pin_hash IS NOT NULL
      AND c.check_in_pin_hash = core.hash_check_in_pin(p_org_id, c.id, trim(p_pin))
  );
$$;

-- 관리자 PIN 설정 — 학원 전체 중복 검사 보강
CREATE OR REPLACE FUNCTION core.set_customer_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF NOT core.is_org_admin(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin_format');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers
    WHERE id = p_customer_id AND organization_id = p_org_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'customer_not_found');
  END IF;

  IF core.is_check_in_pin_used_in_org(p_org_id, p_customer_id, p_pin) THEN
    RETURN jsonb_build_object('success', false, 'error', 'pin_already_used');
  END IF;

  v_hash := core.hash_check_in_pin(p_org_id, p_customer_id, trim(p_pin));

  UPDATE core.customers
  SET check_in_pin_hash = v_hash, updated_at = now()
  WHERE id = p_customer_id AND organization_id = p_org_id;

  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id);
END;
$$;

-- 학부모: 자녀 PIN 설정
CREATE OR REPLACE FUNCTION core.parent_set_child_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF NOT core.parent_owns_student(p_org_id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin_format');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    JOIN core.student_enrollments se ON se.customer_id = c.id
    WHERE c.id = p_customer_id
      AND c.organization_id = p_org_id
      AND se.status IN ('active', 'leave')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'enrollment_inactive');
  END IF;

  IF core.is_check_in_pin_used_in_org(p_org_id, p_customer_id, p_pin) THEN
    RETURN jsonb_build_object('success', false, 'error', 'pin_already_used');
  END IF;

  v_hash := core.hash_check_in_pin(p_org_id, p_customer_id, trim(p_pin));

  UPDATE core.customers
  SET check_in_pin_hash = v_hash, updated_at = now()
  WHERE id = p_customer_id AND organization_id = p_org_id;

  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id);
END;
$$;

-- 학부모: 자녀 PIN 삭제
CREATE OR REPLACE FUNCTION core.parent_clear_child_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF NOT core.parent_owns_student(p_org_id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE core.customers
  SET check_in_pin_hash = NULL, updated_at = now()
  WHERE id = p_customer_id AND organization_id = p_org_id;

  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id);
END;
$$;

-- 학부모: 자녀 PIN 자동 발급
CREATE OR REPLACE FUNCTION core.parent_generate_child_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_pin TEXT;
  v_attempt INT;
  v_result JSONB;
BEGIN
  FOR v_attempt IN 1..40 LOOP
    v_pin := lpad((floor(random() * 9000) + 1000)::TEXT, 4, '0');
    v_result := core.parent_set_child_check_in_pin(p_org_id, p_customer_id, v_pin);
    IF (v_result->>'success')::BOOLEAN THEN
      RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id, 'pin', v_pin);
    END IF;
    IF v_result->>'error' NOT IN ('pin_already_used') THEN
      RETURN v_result;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', false, 'error', 'pin_generation_failed');
END;
$$;

GRANT EXECUTE ON FUNCTION core.is_check_in_pin_used_in_org(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_set_child_check_in_pin(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_clear_child_check_in_pin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_generate_child_check_in_pin(UUID, UUID) TO authenticated;

-- 포털 트리에 PIN 설정 여부 포함
CREATE OR REPLACE FUNCTION core.get_my_parent_portal_tree()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_result JSONB;
BEGIN
  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('parent', null, 'children', '[]'::JSONB);
  END IF;

  SELECT jsonb_build_object(
    'parent', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'phone', p.phone,
      'email', p.email
    ),
    'children', COALESCE((
      SELECT jsonb_agg(child ORDER BY (child->>'display_name'))
      FROM (
        SELECT jsonb_build_object(
          'student_id', s.id,
          'display_name', s.display_name,
          'birth_date', s.birth_date,
          'relationship', psg.relationship,
          'is_primary', psg.is_primary,
          'enrollments', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'enrollment_id', se.id,
                'organization_id', se.organization_id,
                'organization_name', o.name,
                'industry_type', o.industry_type,
                'customer_id', se.customer_id,
                'status', se.status,
                'enrolled_at', se.enrolled_at,
                'left_at', se.left_at,
                'check_in_pin_set', (c.check_in_pin_hash IS NOT NULL)
              ) ORDER BY se.status = 'active' DESC, se.enrolled_at DESC
            )
            FROM core.student_enrollments se
            JOIN core.organizations o ON o.id = se.organization_id
            JOIN core.customers c ON c.id = se.customer_id
            WHERE se.student_id = s.id
          ), '[]'::JSONB)
        ) AS child
        FROM core.parent_student_guardians psg
        JOIN core.students s ON s.id = psg.student_id
        WHERE psg.parent_id = v_parent_id
      ) sub
    ), '[]'::JSONB)
  ) INTO v_result
  FROM core.parents p
  WHERE p.id = v_parent_id;

  RETURN v_result;
END;
$$;
