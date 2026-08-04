-- ============================================================
-- DESIGN REQUEST SYSTEM OVERHAUL
-- ============================================================
-- Fixes:
-- 1. Add priority to design_requests
-- 2. Add user_id, action_url, is_deleted, design_request_id to notifications
-- 3. Create design_request_messages (chat/ticket system)
-- 4. Create design_request_message_files (message attachments)
-- 5. Fix RLS policies for design_request_files (allow customer inserts)
-- 6. Add realtime publication for design request tables
-- 7. Fix storage policies
-- ============================================================

-- ============================================================
-- 1. ADD PRIORITY TO DESIGN REQUESTS
-- ============================================================
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- ============================================================
-- 2. ENHANCE NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS design_request_id UUID REFERENCES public.design_requests(id) ON DELETE CASCADE;

-- Update notification type check to include design types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('order', 'customer', 'stock', 'product', 'security', 'backup', 'design'));

-- Create index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_design_request ON public.notifications(design_request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_deleted ON public.notifications(is_deleted);

-- ============================================================
-- 3. DESIGN REQUEST MESSAGES (CHAT/TICKET SYSTEM)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.design_request_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DESIGN REQUEST MESSAGE FILES (ATTACHMENTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.design_request_message_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.design_request_messages(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_type TEXT NOT NULL DEFAULT 'attachment'
    CHECK (file_type IN ('customer_upload', 'design_file', 'revision_file', 'attachment')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. FIX RLS POLICIES
-- ============================================================

-- DESIGN REQUEST FILES - Allow customer inserts (fixes broken upload pipeline)
DROP POLICY IF EXISTS "dr_files_insert_admin" ON public.design_request_files;
DROP POLICY IF EXISTS "dr_files_insert_own" ON public.design_request_files;

CREATE POLICY "dr_files_insert_own" ON public.design_request_files
  FOR INSERT WITH CHECK (
    -- Customer can insert files for their own request
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND customer_id = auth.uid()
    )
    OR
    -- Admin can insert files
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Allow anon/guest submissions (customer_id is null on request)
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND customer_id IS NULL
    )
  );

-- DESIGN REQUEST MESSAGES RLS
ALTER TABLE public.design_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_request_message_files ENABLE ROW LEVEL SECURITY;

-- Messages: select own request or admin
CREATE POLICY "dr_messages_select_own" ON public.design_request_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Messages: insert own or admin
CREATE POLICY "dr_messages_insert_own" ON public.design_request_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Messages: update read status
CREATE POLICY "dr_messages_update_own" ON public.design_request_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Message files: select own or admin
CREATE POLICY "dr_message_files_select_own" ON public.design_request_message_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Message files: insert own or admin
CREATE POLICY "dr_message_files_insert_own" ON public.design_request_message_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. FIX STORAGE POLICIES
-- ============================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "design_files_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "design_files_admin_all" ON storage.objects;

-- Allow authenticated users to upload to design-files bucket
CREATE POLICY "design_files_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'design-files'
    AND auth.role() = 'authenticated'
  );

-- Allow anon inserts for public form submission (guest users)
CREATE POLICY "design_files_anon_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'design-files'
    AND auth.role() = 'anon'
  );

-- Allow admin full access
CREATE POLICY "design_files_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'design-files'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow users to update/delete their own uploads
CREATE POLICY "design_files_own_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'design-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "design_files_own_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'design-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 7. REALTIME PUBLICATION
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.design_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_request_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_request_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_request_message_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_request_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_request_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 8. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_design_request_messages_request ON public.design_request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_design_request_messages_created ON public.design_request_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_design_request_message_files_message ON public.design_request_message_files(message_id);
CREATE INDEX IF NOT EXISTS idx_design_request_message_files_request ON public.design_request_message_files(request_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_priority ON public.design_requests(priority);

-- ============================================================
-- 9. TRIGGERS
-- ============================================================

-- Auto-update updated_at on design_requests
CREATE OR REPLACE FUNCTION public.update_design_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_design_requests_updated_at ON public.design_requests;
CREATE TRIGGER trg_design_requests_updated_at
  BEFORE UPDATE ON public.design_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_design_request_timestamp();

-- Update design_requests.updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_design_request_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.design_requests
  SET updated_at = now()
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_design_request_messages_update_request ON public.design_request_messages;
CREATE TRIGGER trg_design_request_messages_update_request
  AFTER INSERT ON public.design_request_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_design_request_on_message();