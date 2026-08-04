-- ============================================================
-- SUPPORT TICKET + MESSAGING: PRODUCTION STABILITY FIXES
-- Root-cause fixes aligned with the enterprise RBAC split
-- (profiles.user_type 'customer'|'internal'; admin powers for
--  roles admin / super_admin / manager via public.is_admin()).
--
-- 1. Rewrite every support/messaging RLS policy that hard-coded
--    role = 'admin' to use public.is_admin() so super_admin and
--    manager keep support access exactly like the admin UI guard.
-- 2. Enforce sender_role integrity on inserts (no spoofing).
-- 3. Guard customer UPDATEs against tampering with admin-only
--    fields, while allowing the documented customer flows and the
--    internal bookkeeping triggers.
-- 4. Keep chat unread/read flags in sync from a single DB trigger
--    (covers both the server-action path and direct inserts).
-- 5. Add missing support-files / chat-files storage buckets +
--    policies (uploads currently fail because the buckets never
--    existed in migrations).
-- ============================================================

-- -------------------------------------------------------------------
-- 1. CONTACT MESSAGES RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS contact_messages_select_admin ON public.contact_messages;
CREATE POLICY contact_messages_select_admin ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS contact_messages_update_admin ON public.contact_messages;
CREATE POLICY contact_messages_update_admin ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS contact_messages_delete_admin ON public.contact_messages;
CREATE POLICY contact_messages_delete_admin ON public.contact_messages
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -------------------------------------------------------------------
-- 2. CHAT CONVERSATIONS RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS chat_conversations_select_customer ON public.chat_conversations;
CREATE POLICY chat_conversations_select_customer ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chat_conversations_insert_customer ON public.chat_conversations;
CREATE POLICY chat_conversations_insert_customer ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chat_conversations_update ON public.chat_conversations;
CREATE POLICY chat_conversations_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = customer_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chat_conversations_delete_admin ON public.chat_conversations;
CREATE POLICY chat_conversations_delete_admin ON public.chat_conversations
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -------------------------------------------------------------------
-- 3. CHAT MESSAGES RLS -> is_admin() + sender_role enforcement
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = CASE WHEN public.is_admin() THEN 'admin'::text ELSE 'customer'::text END
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS chat_messages_update ON public.chat_messages;
CREATE POLICY chat_messages_update ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid() OR public.is_admin())
    )
  );

-- -------------------------------------------------------------------
-- 4. CHAT PARTICIPANTS / NOTES / TAGS RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS chat_participants_select ON public.chat_participants;
CREATE POLICY chat_participants_select ON public.chat_participants
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chat_participants_insert_admin ON public.chat_participants;
CREATE POLICY chat_participants_insert_admin ON public.chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chat_notes_select_admin ON public.chat_notes;
CREATE POLICY chat_notes_select_admin ON public.chat_notes
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS chat_notes_insert_admin ON public.chat_notes;
CREATE POLICY chat_notes_insert_admin ON public.chat_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chat_notes_delete_admin ON public.chat_notes;
CREATE POLICY chat_notes_delete_admin ON public.chat_notes
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS chat_tags_insert_admin ON public.chat_tags;
CREATE POLICY chat_tags_insert_admin ON public.chat_tags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chat_tags_delete_admin ON public.chat_tags;
CREATE POLICY chat_tags_delete_admin ON public.chat_tags
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS chat_conversation_tags_select ON public.chat_conversation_tags;
CREATE POLICY chat_conversation_tags_select ON public.chat_conversation_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
      AND (cc.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS chat_conversation_tags_insert_admin ON public.chat_conversation_tags;
CREATE POLICY chat_conversation_tags_insert_admin ON public.chat_conversation_tags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chat_conversation_tags_delete_admin ON public.chat_conversation_tags;
CREATE POLICY chat_conversation_tags_delete_admin ON public.chat_conversation_tags
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -------------------------------------------------------------------
-- 5. TICKET CATEGORIES RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS ticket_categories_insert_admin ON public.ticket_categories;
CREATE POLICY ticket_categories_insert_admin ON public.ticket_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS ticket_categories_update_admin ON public.ticket_categories;
CREATE POLICY ticket_categories_update_admin ON public.ticket_categories
  FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS ticket_categories_delete_admin ON public.ticket_categories;
CREATE POLICY ticket_categories_delete_admin ON public.ticket_categories
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -------------------------------------------------------------------
-- 6. SUPPORT TICKETS RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS support_tickets_select_customer ON public.support_tickets;
CREATE POLICY support_tickets_select_customer ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS support_tickets_insert_customer ON public.support_tickets;
CREATE POLICY support_tickets_insert_customer ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS support_tickets_update ON public.support_tickets;
CREATE POLICY support_tickets_update ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS support_tickets_delete_admin ON public.support_tickets;
CREATE POLICY support_tickets_delete_admin ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -------------------------------------------------------------------
-- 7. TICKET REPLIES RLS -> is_admin() + sender_role enforcement
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS ticket_replies_select ON public.ticket_replies;
CREATE POLICY ticket_replies_select ON public.ticket_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid() OR public.is_admin())
    )
    AND (is_internal_note = false OR public.is_admin())
  );

DROP POLICY IF EXISTS ticket_replies_insert ON public.ticket_replies;
CREATE POLICY ticket_replies_insert ON public.ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = CASE WHEN public.is_admin() THEN 'admin'::text ELSE 'customer'::text END
    AND (is_internal_note = false OR public.is_admin())
    AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid() OR public.is_admin())
    )
  );

-- -------------------------------------------------------------------
-- 8. TICKET NOTES / ATTACHMENTS / RATINGS RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS ticket_notes_select_admin ON public.ticket_notes;
CREATE POLICY ticket_notes_select_admin ON public.ticket_notes
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS ticket_notes_insert_admin ON public.ticket_notes;
CREATE POLICY ticket_notes_insert_admin ON public.ticket_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS ticket_notes_delete_admin ON public.ticket_notes;
CREATE POLICY ticket_notes_delete_admin ON public.ticket_notes
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS ticket_attachments_select ON public.ticket_attachments;
CREATE POLICY ticket_attachments_select ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND (st.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS ticket_attachments_insert ON public.ticket_attachments;
CREATE POLICY ticket_attachments_insert ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ticket_ratings_select ON public.ticket_ratings;
CREATE POLICY ticket_ratings_select ON public.ticket_ratings
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_admin()
  );

-- Customers may only rate their own ticket (ownership check).
DROP POLICY IF EXISTS ticket_ratings_insert_customer ON public.ticket_ratings;
CREATE POLICY ticket_ratings_insert_customer ON public.ticket_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.customer_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------
-- 9. SUPPORT AGENTS RLS -> is_admin()
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS support_agents_insert_admin ON public.support_agents;
CREATE POLICY support_agents_insert_admin ON public.support_agents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS support_agents_update_self ON public.support_agents;
CREATE POLICY support_agents_update_self ON public.support_agents
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
  );

-- -------------------------------------------------------------------
-- 10. CUSTOMER UPDATE GUARDS (column-level integrity)
--     Customers may only touch their own rows AND only the columns
--     used by the documented customer flows / bookkeeping triggers.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_ticket_customer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() <> OLD.customer_id THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_admin_id IS DISTINCT FROM OLD.assigned_admin_id
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.category_id IS DISTINCT FROM OLD.category_id
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
     OR NEW.sla_deadline IS DISTINCT FROM OLD.sla_deadline THEN
    RAISE EXCEPTION 'Customers may not modify restricted ticket fields';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_customer_guard ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_customer_guard
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ticket_customer_update();

CREATE OR REPLACE FUNCTION public.guard_conversation_customer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() <> OLD.customer_id THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_admin_id IS DISTINCT FROM OLD.assigned_admin_id
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Customers may not modify restricted conversation fields';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_chat_conversations_customer_guard ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversations_customer_guard
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_conversation_customer_update();

-- -------------------------------------------------------------------
-- 11. CHAT UNREAD / READ FLAGS + last_message_at (single source of truth)
--     SECURITY DEFINER so it runs as the owner regardless of which
--     code path inserted the message (server action OR direct insert).
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      is_read_by_admin = CASE WHEN NEW.sender_role = 'customer' THEN false ELSE is_read_by_admin END,
      is_read_by_customer = CASE WHEN NEW.sender_role = 'admin' THEN false ELSE is_read_by_customer END,
      unread_count = CASE WHEN NEW.sender_role = 'customer' THEN unread_count + 1 ELSE unread_count END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_update_conversation ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_update_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Ticket last_reply bookkeeping must also run as owner (a customer
-- inserting a reply would otherwise trip the customer guard above).
CREATE OR REPLACE FUNCTION public.update_ticket_last_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_reply_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_ticket_replies_update_ticket ON public.ticket_replies;
CREATE TRIGGER trg_ticket_replies_update_ticket
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_last_reply();

-- -------------------------------------------------------------------
-- 12. TICKET NUMBER GENERATION (qualify sequence + search_path)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_num := nextval('public.ticket_number_seq');
  NEW.ticket_number := 'TKT-' || date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END
$$;

-- -------------------------------------------------------------------
-- 13. STORAGE BUCKETS FOR SUPPORT / CHAT / CONTACT ATTACHMENTS
--     These buckets were referenced by the upload actions but never
--     created in migrations, so every attachment upload failed.
-- -------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-files', 'support-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- support-files: public read, authenticated upload, admin manage
DROP POLICY IF EXISTS "support_files_public_read" ON storage.objects;
CREATE POLICY "support_files_public_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-files');

DROP POLICY IF EXISTS "support_files_auth_upload" ON storage.objects;
CREATE POLICY "support_files_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-files');

DROP POLICY IF EXISTS "support_files_admin_update" ON storage.objects;
CREATE POLICY "support_files_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'support-files' AND public.is_admin());

DROP POLICY IF EXISTS "support_files_admin_delete" ON storage.objects;
CREATE POLICY "support_files_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-files' AND public.is_admin());

-- chat-files: public read, authenticated upload, admin manage
DROP POLICY IF EXISTS "chat_files_public_read" ON storage.objects;
CREATE POLICY "chat_files_public_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat_files_auth_upload" ON storage.objects;
CREATE POLICY "chat_files_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat_files_admin_update" ON storage.objects;
CREATE POLICY "chat_files_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_admin());

DROP POLICY IF EXISTS "chat_files_admin_delete" ON storage.objects;
CREATE POLICY "chat_files_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_admin());
