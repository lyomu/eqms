-- Runs once on first container start (docker-entrypoint-initdb.d), as the Postgres superuser.
--
-- Compliance intent (CLAUDE.md rules 1 & 2):
--   The application connects at runtime as eqms_app, a LEAST-PRIVILEGE role.
--   The DDL owner (POSTGRES_USER, e.g. eqms_owner) owns all objects and runs Liquibase.
--   Table-level grants for eqms_app are applied by the Liquibase changeset v999-privileges,
--   AFTER the tables exist. Here we only create the login role.
--
-- NOTE: For local docker only. In production, manage these roles via your DBA/IaC,
--       never with a hard-coded password.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eqms_app') THEN
        EXECUTE format(
            'CREATE ROLE eqms_app LOGIN PASSWORD %L',
            COALESCE(current_setting('eqms.app_password', true), 'app_dev_pw')
        );
    END IF;
END
$$;

-- The init entrypoint does not expand ${EQMS_APP_PASSWORD} inside SQL, so set it from
-- the environment via ALTER ROLE using a psql meta-variable populated by the entrypoint.
-- Fallback default 'app_dev_pw' is used when the variable is absent.
\set app_pw `echo "${EQMS_APP_PASSWORD:-app_dev_pw}"`
ALTER ROLE eqms_app LOGIN PASSWORD :'app_pw';
