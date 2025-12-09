-- Create storage bucket for word images
INSERT INTO storage.buckets (id, name, public)
VALUES ('word-images', 'word-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload word images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'word-images');

-- Allow public read access to word images
CREATE POLICY "Public can view word images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'word-images');

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their uploaded images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'word-images');