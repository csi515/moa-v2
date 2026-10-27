-- Expose piano schema to PostgREST API
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, core, piano';
NOTIFY pgrst, 'reload config';
