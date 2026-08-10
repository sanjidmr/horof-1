CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_url TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_order ON public.customer_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_number ON public.customer_invoices(invoice_number);

ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own" ON public.customer_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "invoices_insert_admin" ON public.customer_invoices
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "invoices_update_admin" ON public.customer_invoices
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customer Messages (enhanced)
ALTER TABLE IF EXISTS public.customer_messages
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.customer_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.customer_message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.customer_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_attachments_message ON public.customer_message_attachments(message_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_updates BOOLEAN DEFAULT true,
  payment_updates BOOLEAN DEFAULT true,
  shipment_updates BOOLEAN DEFAULT true,
  refund_updates BOOLEAN DEFAULT true,
  promotions BOOLEAN DEFAULT true,
  support_replies BOOLEAN DEFAULT true,
  admin_messages BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select_own" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "notif_prefs_insert_own" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update_own" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Extend notifications table with more fields
ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('order', 'payment', 'shipment', 'refund', 'promotion', 'support', 'message', 'general')),
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Extend addresses with more fields
ALTER TABLE IF EXISTS public.addresses
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Bangladesh',
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS is_billing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shipping BOOLEAN DEFAULT true;

-- Customer timeline events
CREATE TABLE IF NOT EXISTS public.customer_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'account_created', 'order_placed', 'order_cancelled', 'order_returned',
    'payment_received', 'refund_processed', 'ticket_opened', 'ticket_closed',
    'review_submitted', 'password_changed', 'profile_updated', 'address_added',
    'address_updated', 'login', 'logout', 'support_contacted', 'coupon_used',
    'account_suspended', 'account_reactivated', 'note_added'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer ON public.customer_timeline(customer_id, created_at DESC);

ALTER TABLE public.customer_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_select_admin" ON public.customer_timeline
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "timeline_insert_admin" ON public.customer_timeline
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customer tags
CREATE TABLE IF NOT EXISTS public.customer_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#1a4731',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, tag_id)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_admin" ON public.customer_tags FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tags_insert_admin" ON public.customer_tags FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tags_delete_admin" ON public.customer_tags FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "tag_assignments_select_admin" ON public.customer_tag_assignments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tag_assignments_insert_admin" ON public.customer_tag_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tag_assignments_delete_admin" ON public.customer_tag_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.customer_messages;
