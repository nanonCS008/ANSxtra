-- ANSxtra: remove unused Supabase Storage buckets
-- The app no longer uploads files. School Show videos are YouTube / Google Drive links
-- stored in applications_v2.responses (video_submission).
--
-- Run in Supabase Dashboard → SQL Editor.
-- Step 1: review buckets and object counts, then run Step 2 only for buckets you want gone.

-- ---------------------------------------------------------------------------
-- Step 1 — Review (safe to run; does not delete anything)
-- ---------------------------------------------------------------------------
SELECT id, name, public, file_size_limit, created_at
FROM storage.buckets
ORDER BY created_at;

SELECT bucket_id, COUNT(*) AS object_count
FROM storage.objects
GROUP BY bucket_id
ORDER BY bucket_id;

-- ---------------------------------------------------------------------------
-- Step 2 — Remove buckets created for the old video-upload feature
-- Add any other bucket IDs from Step 1 that are not used elsewhere.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  bucket_ids text[] := ARRAY[
    'stage-crew-videos'  -- old Stage Crew direct upload (removed from app)
    -- 'your-other-bucket-id',  -- uncomment after confirming in Step 1
  ];
  b text;
BEGIN
  FOREACH b IN ARRAY bucket_ids
  LOOP
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = b) THEN
      DELETE FROM storage.objects WHERE bucket_id = b;
      DELETE FROM storage.buckets WHERE id = b;
      RAISE NOTICE 'Removed bucket: %', b;
    ELSE
      RAISE NOTICE 'Bucket not found (skipped): %', b;
    END IF;
  END LOOP;
END $$;

-- Policies from the old stage-crew-videos setup (harmless if already gone)
DROP POLICY IF EXISTS "Stage crew students upload own videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read stage crew videos" ON storage.objects;

-- ---------------------------------------------------------------------------
-- Step 3 — Confirm buckets left (should be empty or only buckets you still need)
-- ---------------------------------------------------------------------------
SELECT id, name, public FROM storage.buckets ORDER BY id;
