-- ============================================================
-- CONTACT MESSAGE ATTACHMENTS: END-TO-END FIX
-- Root causes addressed:
--   * contact_messages had no structured attachment storage, so
--     files were glued into the message body as plain text and the
--     Admin Panel could only show the filename / URL.
--   * Storage buckets were public but their SELECT policies were
--     limited to `authenticated`, which is unnecessarily restrictive
--     for public URLs / image previews.
-- 
-- This migration:
--   1. Adds an `attachments` JSONB column to contact_messages so the
--      upload pipeline can persist { name, url, size, mimeType }.
--   2. Hardens storage RLS: public read for support-files and
--      chat-files buckets (public URLs always resolve, image previews
--      work for admins and customers alike).
--   3. Ensures buckets stay public and admin update/delete remain.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. CONTACT MESSAGES: structured attachment storage
-- -------------------------------------------------------------------
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contact_messages.attachments IS
  'Structured list of uploaded attachments: [{"name": string, "url": string, "size": number, "mimeType": string}]';

-- -------------------------------------------------------------------
-- 2. STORAGE: enforce public buckets + public read policies
-- -------------------------------------------------------------------
UPDATE storage.buckets
SET public = true
WHERE id IN ('support-files', 'chat-files');

-- support-files: public read for EVERYONE (manual refresh of public
-- bucket URLs and <img> previews must never be blocked by RLS).
DROP POLICY IF EXISTS "support_files_public_read" ON storage.objects;
CREATE POLICY "support_files_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-files');

-- support-files: any authenticated user may upload (customer flow).
DROP POLICY IF EXISTS "support_files_auth_upload" ON storage.objects;
CREATE POLICY "support_files_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-files');

-- support-files: admins may update object metadata.
DROP POLICY IF EXISTS "support_files_admin_update" ON storage.objects;
CREATE POLICY "support_files_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'support-files' AND public.is_admin());

-- support-files: admins may delete objects.
DROP POLICY IF EXISTS "support_files_admin_delete" ON storage.objects;
CREATE POLICY "support_files_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-files' AND public.is_admin());

-- support-files: admins may list objects.
DROP POLICY IF EXISTS "support_files_admin_list" ON storage.objects;
CREATE POLICY "support_files_admin_list"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-files' AND public.is_admin());

-- chat-files: public read for EVERYONE.
DROP POLICY IF EXISTS "chat_files_public_read" ON storage.objects;
CREATE POLICY "chat_files_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-files');

-- chat-files: any authenticated user may upload.
DROP POLICY IF EXISTS "chat_files_auth_upload" ON storage.objects;
CREATE POLICY "chat_files_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files');

-- chat-files: admins may update object metadata.
DROP POLICY IF EXISTS "chat_files_admin_update" ON storage.objects;
CREATE POLICY "chat_files_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_admin());

-- chat-files: admins may delete objects.
DROP POLICY IF EXISTS "chat_files_admin_delete" ON storage.objects;
CREATE POLICY "chat_files_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_admin());

-- chat-files: admins may list objects.
DROP POLICY IF EXISTS "chat_files_admin_list" ON storage.objects;
CREATE POLICY "chat_files_admin_list"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_admin());