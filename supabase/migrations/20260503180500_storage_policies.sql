
-- Ensure the 'documents' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies for the 'documents' bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read from documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their own uploads (or all for simplicity if Admin)
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
