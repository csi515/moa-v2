create or replace function core.get_nts_business_service_key()
returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'nts_business_service_key'
  limit 1;
$$;

revoke all on function core.get_nts_business_service_key() from public, anon, authenticated;
grant execute on function core.get_nts_business_service_key() to service_role;
