-- School Show Stage Crew video uploads (direct client → Supabase Storage)
-- Safe to run in Supabase SQL Editor — creates/updates bucket and policies only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stage-crew-videos',
  'stage-crew-videos',
  true,
  104857600,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp',
    'video/x-m4v',
    'video/mpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Students may upload only into school-show/{their user id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Stage crew students upload own videos'
  ) THEN
    CREATE POLICY "Stage crew students upload own videos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'stage-crew-videos'
      AND (storage.foldername(name))[1] = 'school-show'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;
END $$;

-- Public read for leaders (spreadsheet links, admin review)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read stage crew videos'
  ) THEN
    CREATE POLICY "Public read stage crew videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'stage-crew-videos');
  END IF;
END $$;
