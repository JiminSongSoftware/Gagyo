-- ============================================================================
-- Images Storage Bucket and RLS Policies
-- ============================================================================
-- This migration creates the Supabase Storage bucket for images and configures
-- RLS policies for tenant-scoped access.
--
-- Storage Structure: images/{tenant_id}/{message_id}/{filename}
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create Images Storage Bucket
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  false,  -- Private bucket, access controlled by RLS
  5242880,  -- 5 MiB limit (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- ----------------------------------------------------------------------------
-- Storage RLS Policies
-- ----------------------------------------------------------------------------

-- Policy: Users can view images from accessible conversations
-- Users can only view images in folders belonging to tenants where they have active membership
CREATE POLICY "Users can view images from accessible conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
  )
);

-- Policy: Users can upload images to their tenant folder
-- Users can only upload to folders belonging to tenants where they have active membership
CREATE POLICY "Users can upload images to their tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
  )
);

-- Policy: Users can update their own uploaded images
-- Users can only update images they own (based on owner field)
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'images'
  AND owner = auth.uid()
);

-- Policy: Users can delete their own uploaded images
-- Users can only delete images they own and that belong to their tenant
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
  )
  AND owner = auth.uid()
);

-- ----------------------------------------------------------------------------
-- Add index for image attachment queries
-- ----------------------------------------------------------------------------

-- Index for efficient gallery queries filtering by file_type
CREATE INDEX IF NOT EXISTS idx_attachments_tenant_file_type
ON attachments(tenant_id, file_type, created_at DESC)
WHERE file_type LIKE 'image/%';

-- ============================================================================
-- End of Migration
-- ============================================================================
