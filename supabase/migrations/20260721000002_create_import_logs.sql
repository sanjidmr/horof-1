-- ============================================================
-- BULK PRODUCT IMPORT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  successful_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_handling text NOT NULL DEFAULT 'skip' CHECK (duplicate_handling IN ('skip', 'update')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  duration_ms integer NOT NULL DEFAULT 0,
  imported_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_logs_select ON public.import_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY import_logs_mutate ON public.import_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS import_logs;
