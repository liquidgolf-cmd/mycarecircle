-- Add suggested_helpers to store helper names mentioned during onboarding.
-- These names appear as invite suggestions on the Circle page so the admin
-- can quickly invite the people Willow learned about during setup.
ALTER TABLE public.care_recipients
  ADD COLUMN IF NOT EXISTS suggested_helpers TEXT[] NOT NULL DEFAULT '{}';
