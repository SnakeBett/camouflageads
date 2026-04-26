-- Hardening: auth ban support, storage ownership checks and safer analytics writes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users can upload to camouflage-results" ON storage.objects;

CREATE POLICY "Users can upload own files to camouflage-results"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'camouflage-results'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can insert page events" ON public.page_events;

CREATE POLICY "Authenticated users can insert page events"
  ON public.page_events FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (user_id IS NULL OR user_id = auth.uid())
  );

