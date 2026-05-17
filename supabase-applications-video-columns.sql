-- Add dedicated video columns on applications_v2 (run once in Supabase SQL Editor).

ALTER TABLE public.applications_v2
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS video_url text;
