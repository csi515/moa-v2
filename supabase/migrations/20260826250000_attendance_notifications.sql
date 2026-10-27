-- Phase 6: Attendance session → core.notifications (parent app alerts)

-- =============================================
-- Parent-readable notifications (attendance + targeted notices)
-- =============================================
DROP POLICY IF EXISTS notifications_select ON core.notifications;

CREATE POLICY notifications_select ON core.notifications
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR (
      status = 'sent'
      AND (
        (
          type = 'attendance'
          AND target_id IS NOT NULL
          AND core.parent_owns_student(organization_id, target_id)
        )
        OR (
          type IN ('notice', 'announcement')
          AND target_id IS NOT NULL
          AND core.parent_owns_student(organization_id, target_id)
        )
        OR (
          type IN ('notice', 'announcement')
          AND (target_type = 'all' OR target_type IS NULL)
          AND EXISTS (
            SELECT 1
            FROM core.student_enrollments se
            JOIN core.parent_student_guardians psg ON psg.student_id = se.student_id
            JOIN core.parents p ON p.id = psg.parent_id
            WHERE se.organization_id = notifications.organization_id
              AND p.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- Attendance labels by industry
-- =============================================
CREATE OR REPLACE FUNCTION core.attendance_action_labels(
  p_industry_type TEXT,
  p_action TEXT
)
RETURNS TABLE(action_label TEXT, title_suffix TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN p_action = 'check_out' THEN
        CASE WHEN p_industry_type = 'daycare' THEN '하원' ELSE '퇴실' END
      ELSE
        CASE WHEN p_industry_type = 'daycare' THEN '등원' ELSE '입실' END
    END,
    CASE
      WHEN p_action = 'check_out' THEN ' 완료'
      ELSE ' 완료'
    END;
$$;

-- =============================================
-- Trigger: attendance_sessions → notifications
-- =============================================
CREATE OR REPLACE FUNCTION core.notify_attendance_session_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_industry TEXT;
  v_customer_name TEXT;
  v_action TEXT;
  v_action_label TEXT;
  v_title_suffix TEXT;
  v_title TEXT;
  v_message TEXT;
  v_at TIMESTAMPTZ;
  v_method TEXT;
BEGIN
  IF NOT core.is_attendance_module_enabled(NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  SELECT o.industry_type INTO v_industry
  FROM core.organizations o
  WHERE o.id = NEW.organization_id;

  v_customer_name := COALESCE(
    NULLIF(trim(NEW.metadata->>'customerName'), ''),
    (SELECT c.name FROM core.customers c WHERE c.id = NEW.customer_id),
    '회원'
  );

  IF NEW.check_in_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.check_in_at IS DISTINCT FROM NEW.check_in_at) THEN
    v_action := 'check_in';
    v_at := NEW.check_in_at;
    v_method := COALESCE(NEW.check_in_method::TEXT, 'manual');

    SELECT l.action_label, l.title_suffix
    INTO v_action_label, v_title_suffix
    FROM core.attendance_action_labels(v_industry, v_action) l;

    v_title := v_customer_name || v_action_label || v_title_suffix;
    v_message := core.business_time_text(
        v_at,
        core.resolve_location_timezone(NEW.organization_id)
      )
      || ' ' || v_action_label || ' 처리되었습니다.';

    IF NOT EXISTS (
      SELECT 1
      FROM core.notifications n
      WHERE n.organization_id = NEW.organization_id
        AND n.type = 'attendance'
        AND n.target_id = NEW.customer_id
        AND n.metadata->>'sessionId' = NEW.id::TEXT
        AND n.metadata->>'action' = v_action
    ) THEN
      INSERT INTO core.notifications (
        organization_id, type, title, message,
        target_type, target_id, status, channel, sent_at, metadata
      ) VALUES (
        NEW.organization_id,
        'attendance',
        v_title,
        v_message,
        'customer',
        NEW.customer_id,
        'sent',
        'app',
        now(),
        jsonb_build_object(
          'sessionId', NEW.id,
          'action', v_action,
          'at', v_at,
          'customerName', v_customer_name,
          'method', v_method,
          'sessionDate', NEW.session_date
        )
      );
    END IF;
  END IF;

  IF NEW.check_out_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.check_out_at IS DISTINCT FROM NEW.check_out_at) THEN
    v_action := 'check_out';
    v_at := NEW.check_out_at;
    v_method := COALESCE(NEW.check_out_method::TEXT, 'manual');

    SELECT l.action_label, l.title_suffix
    INTO v_action_label, v_title_suffix
    FROM core.attendance_action_labels(v_industry, v_action) l;

    v_title := v_customer_name || v_action_label || v_title_suffix;
    v_message := core.business_time_text(
        v_at,
        core.resolve_location_timezone(NEW.organization_id)
      )
      || ' ' || v_action_label || ' 처리되었습니다.';

    IF NOT EXISTS (
      SELECT 1
      FROM core.notifications n
      WHERE n.organization_id = NEW.organization_id
        AND n.type = 'attendance'
        AND n.target_id = NEW.customer_id
        AND n.metadata->>'sessionId' = NEW.id::TEXT
        AND n.metadata->>'action' = v_action
    ) THEN
      INSERT INTO core.notifications (
        organization_id, type, title, message,
        target_type, target_id, status, channel, sent_at, metadata
      ) VALUES (
        NEW.organization_id,
        'attendance',
        v_title,
        v_message,
        'customer',
        NEW.customer_id,
        'sent',
        'app',
        now(),
        jsonb_build_object(
          'sessionId', NEW.id,
          'action', v_action,
          'at', v_at,
          'customerName', v_customer_name,
          'method', v_method,
          'sessionDate', NEW.session_date
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_sessions_notify ON core.attendance_sessions;
CREATE TRIGGER attendance_sessions_notify
  AFTER INSERT OR UPDATE ON core.attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION core.notify_attendance_session_change();
