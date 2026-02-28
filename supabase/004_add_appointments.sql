-- Appointments table
-- Stores scheduled appointments for care recipients.
-- Circle members can create, view, update, and delete appointments.
CREATE TABLE IF NOT EXISTS public.appointments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES auth.users(id),
  assignee_id  UUID        REFERENCES auth.users(id),
  title        TEXT        NOT NULL,
  doctor       TEXT,
  location     TEXT,
  appt_date    TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  status       TEXT        NOT NULL DEFAULT 'upcoming'
                           CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members can manage appointments"
  ON public.appointments FOR ALL
  USING   (public.is_circle_member(recipient_id))
  WITH CHECK (public.is_circle_member(recipient_id));
