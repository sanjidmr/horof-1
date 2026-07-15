-- Enterprise Email Campaign & Popup Campaign System
-- Adds email campaigns, templates, subscribers, popups, and analytics

-- -------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM (
    'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_type AS ENUM (
    'broadcast', 'welcome', 'order_confirmation', 'shipping_update',
    'birthday', 'abandoned_cart', 'product_recommendation', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.popup_type AS ENUM (
    'newsletter_signup', 'discount_offer', 'coupon_popup', 'exit_intent',
    'welcome_popup', 'announcement', 'flash_sale', 'product_promotion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.popup_trigger AS ENUM (
    'on_load', 'after_seconds', 'scroll_percentage', 'exit_intent', 'on_page'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.popup_frequency AS ENUM (
    'once', 'daily', 'weekly', 'every_visit'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------------
-- Subscribers (newsletter + marketing)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  source text DEFAULT 'newsletter',
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  unsubscribe_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add newsletter fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- -------------------------------------------------------------------
-- Email Templates (reusable)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  preheader text,
  html_body text NOT NULL,
  plain_text text,
  category text DEFAULT 'general',
  thumbnail_url text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Email Campaigns
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  preheader text,
  sender_name text,
  sender_email text,
  reply_to text,
  campaign_type campaign_type NOT NULL DEFAULT 'broadcast',
  status campaign_status NOT NULL DEFAULT 'draft',
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  html_body text NOT NULL,
  plain_text text,
  -- Dynamic variables JSON: which vars are available
  dynamic_variables jsonb NOT NULL DEFAULT '{}',
  -- Product showcase blocks
  product_ids uuid[] DEFAULT '{}',
  -- Audience
  audience jsonb NOT NULL DEFAULT '{}',
  segment_type text DEFAULT 'all',
  segment_filter jsonb DEFAULT '{}',
  -- Scheduling
  scheduled_at timestamptz,
  sent_at timestamptz,
  -- Analytics
  recipient_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  open_count int NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,
  bounce_count int NOT NULL DEFAULT 0,
  complaint_count int NOT NULL DEFAULT 0,
  unsubscribe_count int NOT NULL DEFAULT 0,
  -- Automation
  automation_trigger text,
  automation_delay_minutes int,
  -- Provider config
  provider text DEFAULT 'resend',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Email Logs (individual sends)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES subscribers(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  opened_at timestamptz,
  clicked_at timestamptz,
  click_url text,
  bounce_reason text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Popup Campaigns
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.popup_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  description text,
  popup_type popup_type NOT NULL DEFAULT 'newsletter_signup',
  trigger_type popup_trigger NOT NULL DEFAULT 'on_load',
  trigger_value int DEFAULT 0,
  frequency popup_frequency NOT NULL DEFAULT 'once',
  -- Content
  image_url text,
  background_color text DEFAULT '#ffffff',
  text_color text DEFAULT '#1a4731',
  button_text text DEFAULT 'Subscribe',
  button_color text DEFAULT '#1a4731',
  button_text_color text DEFAULT '#ffffff',
  coupon_code text,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  discount_percent numeric(5,2),
  discount_amount numeric(14,2),
  -- Display rules
  display_pages text[] DEFAULT '{}',
  display_devices text[] DEFAULT '{}',
  show_to_new_visitors boolean NOT NULL DEFAULT true,
  show_to_returning_visitors boolean NOT NULL DEFAULT true,
  show_to_logged_in boolean NOT NULL DEFAULT true,
  show_to_guests boolean NOT NULL DEFAULT true,
  restricted_countries text[] DEFAULT '{}',
  date_start timestamptz,
  date_end timestamptz,
  -- A/B testing
  ab_test_enabled boolean NOT NULL DEFAULT false,
  ab_variant_a jsonb,
  ab_variant_b jsonb,
  ab_winner text,
  -- Analytics
  views int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  closes int NOT NULL DEFAULT 0,
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_active ON popup_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_type ON popup_campaigns(popup_type);

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_campaigns ENABLE ROW LEVEL SECURITY;

-- Subscribers: admin all, public insert (for newsletter signup)
CREATE POLICY subscribers_select ON public.subscribers FOR SELECT
  USING (public.is_admin());
CREATE POLICY subscribers_insert ON public.subscribers FOR INSERT
  WITH CHECK (true);
CREATE POLICY subscribers_update ON public.subscribers FOR UPDATE
  USING (public.is_admin() OR email = auth.email())
  WITH CHECK (public.is_admin() OR email = auth.email());
CREATE POLICY subscribers_delete ON public.subscribers FOR DELETE
  USING (public.is_admin());

-- Email Templates: admin all, public read
CREATE POLICY email_templates_select ON public.email_templates FOR SELECT
  USING (public.is_admin());
CREATE POLICY email_templates_mutate ON public.email_templates FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Email Campaigns: admin all, public read active
CREATE POLICY email_campaigns_select ON public.email_campaigns FOR SELECT
  USING (public.is_admin());
CREATE POLICY email_campaigns_mutate ON public.email_campaigns FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Email Logs: admin all
CREATE POLICY email_logs_select ON public.email_logs FOR SELECT
  USING (public.is_admin());
CREATE POLICY email_logs_insert ON public.email_logs FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY email_logs_update ON public.email_logs FOR UPDATE
  USING (public.is_admin());

-- Popup Campaigns: admin all, public read active
CREATE POLICY popup_campaigns_select ON public.popup_campaigns FOR SELECT
  USING (public.is_admin() OR (is_active = true));
CREATE POLICY popup_campaigns_mutate ON public.popup_campaigns FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Functions for incrementing popup analytics
CREATE OR REPLACE FUNCTION public.increment_popup_views(popup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.popup_campaigns SET views = views + 1 WHERE id = popup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_popup_conversions(popup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.popup_campaigns SET conversions = conversions + 1 WHERE id = popup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_popup_closes(popup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.popup_campaigns SET closes = closes + 1 WHERE id = popup_id;
END;
$$;
