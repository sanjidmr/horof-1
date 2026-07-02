-- Create notifications table for admin panel alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'customer', 'stock', 'product')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin can view notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admin can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Admin can update notifications" ON public.notifications
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Admin can delete notifications" ON public.notifications
  FOR DELETE USING (true);
