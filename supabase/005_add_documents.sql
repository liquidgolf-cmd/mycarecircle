-- Documents table
-- Stores metadata for files uploaded to Supabase Storage.
-- Requires a private Storage bucket named "documents" to be created
-- in the Supabase dashboard before uploading will work.
CREATE TABLE IF NOT EXISTS public.documents (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  uploaded_by  UUID        NOT NULL REFERENCES auth.users(id),
  file_name    TEXT        NOT NULL,
  mime_type    TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  label        TEXT,
  notes        TEXT,
  file_size    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members can manage documents"
  ON public.documents FOR ALL
  USING   (public.is_circle_member(recipient_id))
  WITH CHECK (public.is_circle_member(recipient_id));
