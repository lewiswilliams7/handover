-- Public bucket + RLS: uploads were failing with 400 when policies were missing.
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "brand_logos_insert_own" ON storage.objects;
CREATE POLICY "brand_logos_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "brand_logos_update_own" ON storage.objects;
CREATE POLICY "brand_logos_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'brand-logos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "brand_logos_delete_own" ON storage.objects;
CREATE POLICY "brand_logos_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND split_part(name, '/', 1) = auth.uid()::text
);
