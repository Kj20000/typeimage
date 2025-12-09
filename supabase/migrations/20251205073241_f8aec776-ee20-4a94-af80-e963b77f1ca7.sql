-- Remove old vulnerable storage policies that bypass the secure ownership-checked policies
DROP POLICY IF EXISTS "Authenticated users can upload word images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view word images" ON storage.objects;