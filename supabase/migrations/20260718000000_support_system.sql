-- Support System: Live Chat + Ticket System + Contact Messages migration
-- 2026-07-18

-- ============================================================
-- PART 1: Migrate contact_messages (orphaned table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "contact_messages_select_admin" ON public.contact_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY IF NOT EXISTS "contact_messages_insert_all" ON public.contact_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "contact_messages_update_admin" ON public.contact_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY IF NOT EXISTS "contact_messages_delete_admin" ON public.contact_messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PART 2: Live Chat System
-- ============================================================

-- Chat conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'resolved', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  is_read_by_admin BOOLEAN DEFAULT false,
  is_read_by_customer BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat participants (for future multi-participant support)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, profile_id)
);

-- Internal admin notes on conversations (hidden from customers)
CREATE TABLE IF NOT EXISTS public.chat_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat tags
CREATE TABLE IF NOT EXISTS public.chat_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat conversation tags (many-to-many)
CREATE TABLE IF NOT EXISTS public.chat_conversation_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.chat_tags(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, tag_id)
);

-- ============================================================
-- PART 3: Support Ticket System
-- ============================================================

-- Ticket categories
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  source TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'email', 'chat', 'phone', 'api')),
  is_read_by_admin BOOLEAN DEFAULT false,
  is_read_by_customer BOOLEAN DEFAULT true,
  last_reply_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket replies
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Internal admin notes on tickets (hidden from customers)  
CREATE TABLE IF NOT EXISTS public.ticket_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket attachments
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.ticket_replies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket satisfaction ratings (CSAT)
CREATE TABLE IF NOT EXISTS public.ticket_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_id, customer_id)
);

-- Support agents settings
CREATE TABLE IF NOT EXISTS public.support_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN DEFAULT false,
  max_concurrent_chats INTEGER DEFAULT 5,
  is_available BOOLEAN DEFAULT true,
  auto_assign BOOLEAN DEFAULT true,
  signature TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 4: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer ON public.chat_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned ON public.chat_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_notes_conversation ON public.chat_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON public.chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_profile ON public.chat_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_tags_conv ON public.chat_conversation_tags(conversation_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON public.ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created ON public.ticket_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_ratings_ticket ON public.ticket_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_online ON public.support_agents(is_online);

-- ============================================================
-- PART 5: RLS Policies
-- ============================================================

-- Chat conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_conversations_select_customer" ON public.chat_conversations
  FOR SELECT USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_conversations_insert_customer" ON public.chat_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_conversations_update" ON public.chat_conversations
  FOR UPDATE USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_conversations_delete_admin" ON public.chat_conversations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Chat participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_participants_select" ON public.chat_participants
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_participants_insert_admin" ON public.chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat notes (admin only)
ALTER TABLE public.chat_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_notes_select_admin" ON public.chat_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_notes_insert_admin" ON public.chat_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_notes_delete_admin" ON public.chat_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat tags
ALTER TABLE public.chat_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_tags_select" ON public.chat_tags
  FOR SELECT USING (true);
CREATE POLICY "chat_tags_insert_admin" ON public.chat_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_tags_delete_admin" ON public.chat_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat conversation tags
ALTER TABLE public.chat_conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_conversation_tags_select" ON public.chat_conversation_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
CREATE POLICY "chat_conversation_tags_insert_admin" ON public.chat_conversation_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "chat_conversation_tags_delete_admin" ON public.chat_conversation_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ticket categories
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_categories_select" ON public.ticket_categories
  FOR SELECT USING (true);
CREATE POLICY "ticket_categories_insert_admin" ON public.ticket_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ticket_categories_update_admin" ON public.ticket_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ticket_categories_delete_admin" ON public.ticket_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Support tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select_customer" ON public.support_tickets
  FOR SELECT USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "support_tickets_insert_customer" ON public.support_tickets
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "support_tickets_delete_admin" ON public.support_tickets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ticket replies
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_replies_select" ON public.ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
    AND (is_internal_note = false
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );
CREATE POLICY "ticket_replies_insert" ON public.ticket_replies
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Ticket notes (admin only)
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_notes_select_admin" ON public.ticket_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ticket_notes_insert_admin" ON public.ticket_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ticket_notes_delete_admin" ON public.ticket_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ticket attachments
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.customer_id = auth.uid()
    )
  );

-- Ticket ratings
ALTER TABLE public.ticket_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_ratings_select" ON public.ticket_ratings
  FOR SELECT USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "ticket_ratings_insert_customer" ON public.ticket_ratings
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
  );

-- Support agents
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_agents_select" ON public.support_agents
  FOR SELECT USING (true);
CREATE POLICY "support_agents_insert_admin" ON public.support_agents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "support_agents_update_self" ON public.support_agents
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PART 6: Realtime Publications
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agents;

-- ============================================================
-- PART 7: Functions & Triggers
-- ============================================================

-- Auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_num := nextval('ticket_number_seq');
  NEW.ticket_number := 'TKT-' || date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

CREATE TRIGGER trg_tickets_generate_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION public.update_chat_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_conversation_timestamp();

-- Auto-update updated_at on tickets
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_conversation_timestamp();

-- Update last_message_at on conversation when new message inserted
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_messages_update_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Update last_reply_at on ticket when new reply inserted
CREATE OR REPLACE FUNCTION public.update_ticket_last_reply()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_reply_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_replies_update_ticket
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_last_reply();

-- Set resolved_at when ticket status changes to resolved
CREATE OR REPLACE FUNCTION public.set_ticket_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    NEW.closed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_set_resolved_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.set_ticket_resolved_at();

-- ============================================================
-- PART 8: Seed default ticket categories
-- ============================================================

INSERT INTO public.ticket_categories (name, description, color, sort_order) VALUES
  ('Order Issue', 'Problems with orders, payments, or shipping', '#ef4444', 1),
  ('Product Inquiry', 'Questions about products, materials, or specifications', '#3b82f6', 2),
  ('Return & Refund', 'Return requests and refund inquiries', '#f59e0b', 3),
  ('Account Support', 'Account-related issues and password reset', '#8b5cf6', 4),
  ('Custom Order', 'Custom design and bulk order requests', '#10b981', 5),
  ('Shipping & Delivery', 'Shipping status, delays, and tracking', '#ec4899', 6),
  ('Technical Support', 'Website issues, bugs, or technical problems', '#06b6d4', 7),
  ('Feedback & Suggestions', 'General feedback and improvement suggestions', '#64748b', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PART 9: Seed default chat tags
-- ============================================================

INSERT INTO public.chat_tags (name, color) VALUES
  ('order', '#ef4444'),
  ('shipping', '#f59e0b'),
  ('urgent', '#dc2626'),
  ('custom', '#10b981'),
  ('billing', '#8b5cf6'),
  ('product', '#3b82f6'),
  ('return', '#ec4899'),
  ('feedback', '#64748b')
ON CONFLICT (name) DO NOTHING;
