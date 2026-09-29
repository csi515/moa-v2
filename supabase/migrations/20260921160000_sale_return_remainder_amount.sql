-- 부분 반품 금액 헬퍼: 누적 FLOOR 배분 + 전량 도달 시 잔여액 흡수
-- TypeScript computeReturnLineAmount와 동일 계약

CREATE OR REPLACE FUNCTION core.compute_return_line_amount(
  p_return_qty NUMERIC,
  p_sold_qty NUMERIC,
  p_unit_price NUMERIC,
  p_discount_amount NUMERIC,
  p_already_returned NUMERIC DEFAULT 0
)
RETURNS NUMERIC(14, 2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_return NUMERIC(14, 3) := GREATEST(0, COALESCE(p_return_qty, 0));
  v_sold NUMERIC(14, 3) := GREATEST(0, COALESCE(p_sold_qty, 0));
  v_already NUMERIC(14, 3) := GREATEST(0, COALESCE(p_already_returned, 0));
  v_orig NUMERIC(14, 2);
  v_before NUMERIC(14, 2);
  v_after NUMERIC(14, 2);
BEGIN
  IF v_return <= 0 OR v_sold <= 0 THEN
    RETURN 0;
  END IF;

  v_orig := GREATEST(
    0,
    (v_sold * GREATEST(0, COALESCE(p_unit_price, 0)))
      - GREATEST(0, COALESCE(p_discount_amount, 0))
  );

  IF v_already <= 0 THEN
    v_before := 0;
  ELSIF v_already >= v_sold THEN
    v_before := v_orig;
  ELSE
    v_before := FLOOR((v_orig * v_already) / v_sold);
  END IF;

  IF (v_already + v_return) >= v_sold THEN
    v_after := v_orig;
  ELSIF (v_already + v_return) <= 0 THEN
    v_after := 0;
  ELSE
    v_after := FLOOR((v_orig * (v_already + v_return)) / v_sold);
  END IF;

  RETURN GREATEST(0, v_after - v_before);
END;
$$;

COMMENT ON FUNCTION core.compute_return_line_amount(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
  '부분 반품 라인 금액. 누적 수량 FLOOR 배분, 전량 도달 시 잔여액 흡수. TS computeReturnLineAmount와 동일.';

GRANT EXECUTE ON FUNCTION core.compute_return_line_amount(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.compute_return_line_amount(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM anon;
