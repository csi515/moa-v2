-- Phase 0: Core schema foundation
-- Multi-tenant SaaS core tables in dedicated `core` schema
-- Legacy public.* tables remain untouched for backward compatibility
-- Target project: Moa (xlsfnfolrrhxsxazmhjb)

CREATE SCHEMA IF NOT EXISTS core;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE core.member_role AS ENUM ('owner', 'admin', 'manager', 'staff');
CREATE TYPE core.schedule_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE core.payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded', 'cancelled');
CREATE TYPE core.payment_method AS ENUM ('cash', 'card', 'transfer', 'online', 'other');
CREATE TYPE core.notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
CREATE TYPE core.notification_channel AS ENUM ('app', 'email', 'sms', 'kakao');

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA core TO authenticated, anon;
