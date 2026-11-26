-- ==============================================================================
-- Moa-v2 Enterprise Migration: Atomic Event Plan Booking with Turnaround Buffer
-- 공간 대여, 연회홀 및 파티룸 행사 예약 시 세팅/철수 버퍼 충돌을 DB 레벨에서 원자적으로 방어
-- ==============================================================================

CREATE OR REPLACE FUNCTION core.fn_book_event_plan_with_turnaround_atomic(
  p_organization_id uuid,
  p_entity_type text,
  p_record_key text,
  p_room_id uuid,
  p_event_date text,
  p_setup_start_time text,
  p_teardown_end_time text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflict_record record;
  v_new_setup_mins integer;
  v_new_teardown_mins integer;
  v_new_id uuid;
  v_setup_parts text[];
  v_teardown_parts text[];
BEGIN
  -- 1. 시간 문자열(HH:mm)을 분(minutes)으로 환산
  v_setup_parts := string_to_array(p_setup_start_time, ':');
  v_new_setup_mins := v_setup_parts[1]::integer * 60 + v_setup_parts[2]::integer;

  v_teardown_parts := string_to_array(p_teardown_end_time, ':');
  v_new_teardown_mins := v_teardown_parts[1]::integer * 60 + v_teardown_parts[2]::integer;

  -- 2. 해당 공간(Room) Row-level Lock 획득 (동시성 제어)
  PERFORM id FROM core.seat_rooms 
  WHERE id = p_room_id AND organization_id = p_organization_id
  FOR UPDATE;

  -- 3. 기존 동일 공간/일자의 활성 예약과 버퍼 충돌 검증
  FOR v_conflict_record IN
    SELECT 
      id,
      record_key,
      payload->>'title' AS title,
      payload->>'setupStartTime' AS setup_start,
      payload->>'teardownEndTime' AS teardown_end
    FROM core.generic_entity_records
    WHERE organization_id = p_organization_id
      AND entity_type = p_entity_type
      AND payload->>'roomId' = p_room_id::text
      AND payload->>'eventDate' = p_event_date
      AND coalesce(payload->>'status', '') <> 'CANCELLED'
  LOOP
    IF v_conflict_record.setup_start IS NOT NULL AND v_conflict_record.teardown_end IS NOT NULL THEN
      DECLARE
        v_exist_s text[] := string_to_array(v_conflict_record.setup_start, ':');
        v_exist_t text[] := string_to_array(v_conflict_record.teardown_end, ':');
        v_exist_setup_mins integer := v_exist_s[1]::integer * 60 + v_exist_s[2]::integer;
        v_exist_teardown_mins integer := v_exist_t[1]::integer * 60 + v_exist_t[2]::integer;
      BEGIN
        -- 시간 구간 교집합 검사 (New Start < Existing End AND Existing Start < New End)
        IF v_new_setup_mins < v_exist_teardown_mins AND v_exist_setup_mins < v_new_teardown_mins THEN
          RAISE EXCEPTION 'BUFFER_COLLISION_DETECTED: 기존 예약 "%" (세팅/철수: % ~ %)와 시간이 겹칩니다.',
            v_conflict_record.title, v_conflict_record.setup_start, v_conflict_record.teardown_end
            USING ERRCODE = '23P01';
        END IF;
      END;
    END IF;
  END LOOP;

  -- 4. 충돌이 없으면 원자적 INSERT 실행
  v_new_id := gen_random_uuid();
  INSERT INTO core.generic_entity_records (
    id,
    organization_id,
    entity_type,
    record_key,
    payload,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    p_organization_id,
    p_entity_type,
    p_record_key,
    p_payload,
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'message', '예약 및 세팅/철수 버퍼 배정이 원자적으로 완료되었습니다.'
  );
END;
$$;
