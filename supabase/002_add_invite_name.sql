-- Add optional name field to circle_invites
-- This lets the inviter record the helper's name before they register,
-- so it can be pre-filled on the signup page.
ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS name TEXT;
