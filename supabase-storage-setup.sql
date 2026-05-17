-- Application video uploads (School Show Stage Crew, etc.)
-- Run in Supabase SQL Editor after deploying the app changes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-videos',
  'application-videos',
  true,
  209715200,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read so leaders can open CSV links directly.
CREATE POLICY "Public read application videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'application-videos');
