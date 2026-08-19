-- ============================================================
-- CONTACT MESSAGE FILE/IMAGE UPLOAD — END-TO-END FIX
-- Ensures a file uploaded on the /contact page actually persists
-- as a structured attachment on the contact message, so it shows
-- up in the admin Messages panel alongside the text.
--
-- Root causes this addresses (in case any of the earlier
-- support/messaging migrations were skipped):
--   * contact_messages had no `attachments` column.
--   * the `support-files` storage bucket was missing / non-public.
--   * storage RLS blocked public reads (image previews / URLs).
--   * contact_messages RLS select/update/delete only matched
--     `role = 'admin'`; switch to public.is_admin() so all internal
--     roles (admin, super_admin, manager, staff) can manage messages.
--
-- Idempotent: safe to run even if earlier migrations applied.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. CONTACT MESSAGES: structured attachment storage
-- -------------------------------------------------------------------
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contact_messages.attachments IS
  'Structured list of uploaded attachments: [{"name": string, "url": string, "size": number, "mimeType": string}]';

-- -------------------------------------------------------------------
-- 2. STORAGE: ensure bucket exists and stays public
-- -------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-files', 'support-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- support-files: public read for EVERYONE (public URLs and <img>
-- previews must never be blocked by RLS).
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

-- -------------------------------------------------------------------
-- 3. CONTACT MESSAGES RLS: anyone may submit, internal roles manage
-- -------------------------------------------------------------------
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_messages_insert_all" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_all" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_select_admin" ON public.contact_messages;
CREATE POLICY "contact_messages_select_admin" ON public.contact_messages
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_update_admin" ON public.contact_messages;
CREATE POLICY "contact_messages_update_admin" ON public.contact_messages
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_delete_admin" ON public.contact_messages;
CREATE POLICY "contact_messages_delete_admin" ON public.contact_messages
  FOR DELETE USING (public.is_admin());
