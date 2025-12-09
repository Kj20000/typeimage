-- Drop existing storage policies for word-images bucket
DROP POLICY IF EXISTS "Public read access for word images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload word images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete word images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Recreate SELECT policy (public read for learning interface)
CREATE POLICY "Public read access for word images"
ON storage.objects FOR SELECT
USING (bucket_id = 'word-images');

-- Create INSERT policy with ownership check
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'word-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create DELETE policy with ownership check
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'word-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);