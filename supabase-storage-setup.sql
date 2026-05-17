-- Application video uploads (School Show Stage Crew, etc.)
-- Safe to run in Supabase SQL Editor — creates/updates the bucket only; does not delete data.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-videos',
  'application-videos',
  true,
  209715200,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp',
    'video/x-m4v',
    'video/mpeg',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read so leaders can open spreadsheet video links directly.
-- Skipped automatically if this policy already exists (no DROP / no data loss).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read application videos'
  ) THEN
    CREATE POLICY "Public read application videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'application-videos');
  END IF;
END $$;
