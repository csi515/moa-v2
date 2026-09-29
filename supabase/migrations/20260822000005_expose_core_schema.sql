-- Expose core schema to PostgREST API
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, core';
NOTIFY pgrst, 'reload config';
