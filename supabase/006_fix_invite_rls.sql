-- ─────────────────────────────────────────────────────────────────────────────
-- 006_fix_invite_rls.sql
-- Tighten circle_invites RLS policies.
--
-- Two existing policies used USING (true) — no condition at all — allowing
-- any request with the Supabase anon key to read ALL invites (exposing email
-- addresses, recipient IDs, tokens, and roles) and to update ANY invite record.
-- Since all invite operations go through the server using the service_role key,
-- these open policies are unnecessary and dangerous.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "invites_select_token" ON public.circle_invites;
DROP POLICY IF EXISTS "invites_update" ON public.circle_invites;

-- Allow SELECT only on pending, non-expired invites
-- (Token lookup for the invite landing page still works via server/service_role key anyway)
CREATE POLICY "invites_select_pending" ON public.circle_invites
  FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- Allow UPDATE only on pending, non-expired invites
CREATE POLICY "invites_update_pending" ON public.circle_invites
  FOR UPDATE
  USING (status = 'pending' AND expires_at > now());
