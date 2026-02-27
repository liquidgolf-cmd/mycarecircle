-- ============================================================
-- CareCircle MVP — Initial Schema
-- Fully idempotent. Safe to re-run on a fresh or partial DB.
-- Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================


-- ============================================================
-- SECTION 1: CLEAN SLATE
-- Drop everything in reverse-dependency order so re-runs
-- always start fresh. CASCADE handles any dangling references.
-- ============================================================

-- Note: triggers on public.* tables are dropped automatically via CASCADE below.
-- The auth.users trigger must be dropped explicitly (we don't own that table).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.daily_status    CASCADE;
DROP TABLE IF EXISTS public.medications     CASCADE;
DROP TABLE IF EXISTS public.log_entries     CASCADE;
DROP TABLE IF EXISTS public.circle_invites  CASCADE;
DROP TABLE IF EXISTS public.care_circles    CASCADE;
DROP TABLE IF EXISTS public.care_recipients CASCADE;
DROP TABLE IF EXISTS public.profiles        CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user()              CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()               CASCADE;
DROP FUNCTION IF EXISTS public.is_circle_member(UUID)         CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID)            CASCADE;


-- ============================================================
-- SECTION 2: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SECTION 3: TABLES
-- Created in foreign-key dependency order.
-- care_circles must exist before the helper functions below.
-- ============================================================

-- 1. profiles
CREATE TABLE public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          TEXT        NOT NULL DEFAULT '',
  avatar_url         TEXT,
  phone              TEXT,
  notification_prefs JSONB       NOT NULL DEFAULT '{"email_new_entry":true,"email_status_red":true,"email_digest":true}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. care_recipients
CREATE TABLE public.care_recipients (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         TEXT        NOT NULL DEFAULT '',
  date_of_birth     DATE,
  city              TEXT,
  state             TEXT,
  primary_physician TEXT,
  allergies         TEXT[]      NOT NULL DEFAULT '{}',
  conditions        TEXT[]      NOT NULL DEFAULT '{}',
  emergency_contact JSONB,
  created_by        UUID        NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. care_circles  ← helper functions query this table; must come first
CREATE TABLE public.care_circles (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL CHECK (role IN ('admin','contributor','viewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recipient_id)
);

-- 4. circle_invites
CREATE TABLE public.circle_invites (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  invited_by   UUID        NOT NULL REFERENCES auth.users(id),
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'contributor' CHECK (role IN ('admin','contributor','viewer')),
  token        UUID        NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. log_entries
CREATE TABLE public.log_entries (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES auth.users(id),
  category     TEXT        NOT NULL CHECK (category IN ('health','medication','mood','appointment','general')),
  body         TEXT        NOT NULL CHECK (char_length(body) <= 2000),
  severity     TEXT        NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal','concerning','urgent')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. medications
CREATE TABLE public.medications (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id       UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL CHECK (char_length(name) <= 100),
  dosage             TEXT,
  frequency          TEXT,
  prescribing_doctor TEXT,
  pharmacy           TEXT,
  notes              TEXT        CHECK (char_length(notes) <= 500),
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  added_by           UUID        NOT NULL REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. daily_status
CREATE TABLE public.daily_status (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES auth.users(id),
  status       TEXT        NOT NULL CHECK (status IN ('green','yellow','red')),
  note         TEXT        CHECK (char_length(note) <= 500),
  status_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipient_id, status_date)
);


-- ============================================================
-- SECTION 4: FUNCTIONS
-- care_circles now exists so these compile without error.
-- ============================================================

-- Returns true if the current user is a member of the given recipient's circle
CREATE OR REPLACE FUNCTION public.is_circle_member(p_recipient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_circles
    WHERE recipient_id = p_recipient_id
      AND user_id = auth.uid()
  );
$$;

-- Returns the current user's role in the given recipient's circle, or NULL
CREATE OR REPLACE FUNCTION public.get_user_role(p_recipient_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT role FROM public.care_circles
  WHERE recipient_id = p_recipient_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Keeps updated_at current on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auto-creates a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_circles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_status    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 6: RLS POLICIES
-- ============================================================

-- profiles --
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- care_recipients --
CREATE POLICY "recipients_select" ON public.care_recipients
  FOR SELECT USING (public.is_circle_member(id));

CREATE POLICY "recipients_insert" ON public.care_recipients
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "recipients_update" ON public.care_recipients
  FOR UPDATE USING (public.get_user_role(id) = 'admin');

CREATE POLICY "recipients_delete" ON public.care_recipients
  FOR DELETE USING (public.get_user_role(id) = 'admin');

-- care_circles --
CREATE POLICY "circles_select_own" ON public.care_circles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "circles_select_peers" ON public.care_circles
  FOR SELECT USING (public.is_circle_member(recipient_id));

CREATE POLICY "circles_insert_self" ON public.care_circles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "circles_insert_admin" ON public.care_circles
  FOR INSERT WITH CHECK (public.get_user_role(recipient_id) = 'admin');

CREATE POLICY "circles_delete_admin" ON public.care_circles
  FOR DELETE USING (public.get_user_role(recipient_id) = 'admin');

-- circle_invites --
CREATE POLICY "invites_insert_admin" ON public.circle_invites
  FOR INSERT WITH CHECK (public.get_user_role(recipient_id) = 'admin');

CREATE POLICY "invites_select_admin" ON public.circle_invites
  FOR SELECT USING (public.get_user_role(recipient_id) = 'admin');

CREATE POLICY "invites_select_token" ON public.circle_invites
  FOR SELECT USING (true);

CREATE POLICY "invites_update" ON public.circle_invites
  FOR UPDATE USING (true);

-- log_entries --
CREATE POLICY "log_select" ON public.log_entries
  FOR SELECT USING (public.is_circle_member(recipient_id));

CREATE POLICY "log_insert" ON public.log_entries
  FOR INSERT WITH CHECK (
    public.get_user_role(recipient_id) IN ('admin','contributor')
    AND auth.uid() = author_id
  );

CREATE POLICY "log_update" ON public.log_entries
  FOR UPDATE USING (
    auth.uid() = author_id
    OR public.get_user_role(recipient_id) = 'admin'
  );

CREATE POLICY "log_delete" ON public.log_entries
  FOR DELETE USING (
    auth.uid() = author_id
    OR public.get_user_role(recipient_id) = 'admin'
  );

-- medications --
CREATE POLICY "meds_select" ON public.medications
  FOR SELECT USING (public.is_circle_member(recipient_id));

CREATE POLICY "meds_insert" ON public.medications
  FOR INSERT WITH CHECK (public.get_user_role(recipient_id) IN ('admin','contributor'));

CREATE POLICY "meds_update" ON public.medications
  FOR UPDATE USING (public.get_user_role(recipient_id) IN ('admin','contributor'));

CREATE POLICY "meds_delete" ON public.medications
  FOR DELETE USING (public.get_user_role(recipient_id) = 'admin');

-- daily_status --
CREATE POLICY "status_select" ON public.daily_status
  FOR SELECT USING (public.is_circle_member(recipient_id));

CREATE POLICY "status_insert" ON public.daily_status
  FOR INSERT WITH CHECK (public.get_user_role(recipient_id) IN ('admin','contributor'));

CREATE POLICY "status_update" ON public.daily_status
  FOR UPDATE USING (public.get_user_role(recipient_id) IN ('admin','contributor'));


-- ============================================================
-- SECTION 7: TRIGGERS
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_log_entries_updated_at
  BEFORE UPDATE ON public.log_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_daily_status_updated_at
  BEFORE UPDATE ON public.daily_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- Done. Confirm with:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ============================================================
