-- Revoke client EXECUTE on unused/dangerous public SECURITY DEFINER RPCs
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.get_booking_slots(uuid, date, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_booking_slots(uuid, date, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_slots(uuid, date, bigint) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.is_booking_customer(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_booking_customer(bigint, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_booking_customer(bigint, uuid) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.is_booking_owner(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_booking_owner(bigint, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_booking_owner(bigint, uuid) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.create_booking_change_request(bigint, date, time without time zone, time without time zone, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_booking_change_request(bigint, date, time without time zone, time without time zone, bigint, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_change_request(bigint, date, time without time zone, time without time zone, bigint, text) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.respond_booking_change_request(bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_booking_change_request(bigint, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_booking_change_request(bigint, text, text) TO postgres, service_role;

REVOKE ALL ON FUNCTION core.find_user_id_by_identity_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.find_user_id_by_identity_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION core.find_user_id_by_identity_email(text) TO authenticated, postgres, service_role;
