-- ============================================================
-- DESIGN APPROVAL SYSTEM
-- ============================================================
-- Tables: design_requests, design_request_files, design_request_comments, design_request_status_history
-- Bucket: design-files
-- ============================================================

-- 1. DESIGN REQUESTS (main table)
CREATE TABLE IF NOT EXISTS public.design_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  product_name TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','design_in_progress','design_ready',
                       'waiting_approval','approved','revision_requested','rejected','completed')),
  admin_notes TEXT,
  estimated_quantity INTEGER,
  estimated_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DESIGN REQUEST FILES (customer uploads, admin design files, revision files)
CREATE TABLE IF NOT EXISTS public.design_request_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_type TEXT NOT NULL DEFAULT 'customer_upload'
    CHECK (file_type IN ('customer_upload','design_file','revision_file')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DESIGN REQUEST COMMENTS
CREATE TABLE IF NOT EXISTS public.design_request_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. DESIGN REQUEST STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.design_request_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_request_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_request_status_history ENABLE ROW LEVEL SECURITY;

-- DESIGN REQUESTS
CREATE POLICY "design_requests_select_own" ON public.design_requests
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "design_requests_select_admin" ON public.design_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "design_requests_insert_own" ON public.design_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

CREATE POLICY "design_requests_update_admin" ON public.design_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DESIGN REQUEST FILES
CREATE POLICY "dr_files_select_own" ON public.design_request_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.design_requests WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL))
  );

CREATE POLICY "dr_files_select_admin" ON public.design_request_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dr_files_insert_admin" ON public.design_request_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dr_files_delete_admin" ON public.design_request_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DESIGN REQUEST COMMENTS
CREATE POLICY "dr_comments_select_own" ON public.design_request_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.design_requests WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL))
  );

CREATE POLICY "dr_comments_select_admin" ON public.design_request_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dr_comments_insert_own" ON public.design_request_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "dr_comments_insert_admin" ON public.design_request_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DESIGN REQUEST STATUS HISTORY
CREATE POLICY "dr_history_select_own" ON public.design_request_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.design_requests WHERE id = request_id AND (customer_id = auth.uid() OR customer_id IS NULL))
  );

CREATE POLICY "dr_history_select_admin" ON public.design_request_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dr_history_insert_admin" ON public.design_request_status_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('design-files', 'design-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read (files are referenced by URL, UUID-based names add obscurity)
CREATE POLICY "design_files_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'design-files');

-- Allow anon inserts for public form submission
CREATE POLICY "design_files_anon_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'design-files');

-- Allow admin full access
CREATE POLICY "design_files_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'design-files'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_design_requests_customer_id ON public.design_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_status ON public.design_requests(status);
CREATE INDEX IF NOT EXISTS idx_design_requests_created_at ON public.design_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_request_files_request_id ON public.design_request_files(request_id);
CREATE INDEX IF NOT EXISTS idx_design_request_comments_request_id ON public.design_request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_design_request_status_history_request_id ON public.design_request_status_history(request_id);
