-- ============================================================
-- LEGAL PAGES CMS (Terms & Conditions, Privacy Policy)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL UNIQUE CHECK (page_type IN ('terms', 'privacy_policy')),
  title text NOT NULL,
  subtitle text DEFAULT '',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_info text DEFAULT '',
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  last_updated date DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default data
INSERT INTO public.legal_pages (page_type, title, subtitle, content, meta_title, meta_description)
VALUES
  ('terms', 'Terms & Conditions', 'Please read these terms carefully before using our services.',
    '[
      {"id":"intro","title":"Introduction","content":"<p>Welcome to Horof. By accessing our website and using our services, you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these terms, please do not use our website or services.</p>","order":1},
      {"id":"user-responsibilities","title":"User Responsibilities","content":"<p>You agree to use our website and services only for lawful purposes. You must not misuse our platform, attempt unauthorized access, or disrupt the operation of our services. You are responsible for maintaining the confidentiality of your account credentials.</p>","order":2},
      {"id":"account-terms","title":"Account Terms","content":"<p>When creating an account, you must provide accurate and complete information. You are solely responsible for all activities under your account. Notify us immediately of any unauthorized use. We reserve the right to suspend or terminate accounts that violate these terms.</p>","order":3},
      {"id":"product-information","title":"Product Information","content":"<p>We strive to display accurate product descriptions, images, and pricing. However, we do not guarantee that product information is error-free. Colors and finishes may vary slightly from images due to monitor settings and the handcrafted nature of our products.</p>","order":4},
      {"id":"pricing-payment","title":"Pricing and Payment Terms","content":"<p>All prices are listed in Bangladeshi Taka (BDT) unless otherwise stated. We reserve the right to modify prices at any time. Payment is due at the time of purchase. We accept cash on delivery and other payment methods as displayed during checkout.</p>","order":5},
      {"id":"order-policy","title":"Order Policy","content":"<p>All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order. You will be notified if your order is cancelled. Custom orders may have different terms communicated at the time of order placement.</p>","order":6},
      {"id":"shipping-terms","title":"Shipping Terms","content":"<p>We ship throughout Bangladesh. Delivery times are estimates and may vary based on location and product availability. Shipping costs, if applicable, are displayed at checkout. We are not responsible for delays beyond our reasonable control.</p>","order":7},
      {"id":"return-refund","title":"Return and Refund Terms","content":"<p>Our return policy allows returns within the specified period from delivery. Products must be unused and in original packaging. Custom and personalized items may not be eligible for return. Refunds are processed after inspection.</p>","order":8},
      {"id":"intellectual-property","title":"Intellectual Property","content":"<p>All content on this website, including text, graphics, logos, images, and product designs, is the property of Horof and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our written consent.</p>","order":9},
      {"id":"limitation-liability","title":"Limitation of Liability","content":"<p>Horof shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our total liability is limited to the amount paid for the product or service in question.</p>","order":10},
      {"id":"changes-to-terms","title":"Changes to Terms","content":"<p>We reserve the right to modify these Terms &amp; Conditions at any time. Changes are effective immediately upon posting. Your continued use of our services after changes constitutes acceptance of the updated terms. Please review this page periodically.</p>","order":11},
      {"id":"contact-information","title":"Contact Information","content":"<p>If you have any questions about these Terms &amp; Conditions, please contact us.</p>","order":12}
    ]'::jsonb,
    'Terms & Conditions - Horof',
    'Read the Terms & Conditions for using Horof handcrafted woodwork products and services.'
  ),
  ('privacy_policy', 'Privacy Policy', 'Learn how we collect, use, and protect your information.',
    '[
      {"id":"intro","title":"Introduction","content":"<p>At Horof, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website or use our services.</p>","order":1},
      {"id":"information-we-collect","title":"Information We Collect","content":"<p>We collect information you provide directly, such as your name, email address, phone number, shipping address, and payment details when you place an order or create an account. We also automatically collect certain information about your device and browsing behavior.</p>","order":2},
      {"id":"personal-information-usage","title":"Personal Information Usage","content":"<p>We use your personal information to process orders, communicate with you about your purchases, improve our services, send marketing communications (with your consent), and comply with legal obligations.</p>","order":3},
      {"id":"order-information","title":"Order Information","content":"<p>When you place an order, we collect the information necessary to fulfill it, including your name, shipping address, phone number, and order details. This information is used solely for order processing and delivery coordination.</p>","order":4},
      {"id":"payment-information","title":"Payment Information","content":"<p>We do not store complete payment card information on our servers. Payment transactions are processed securely through third-party payment gateways. For cash on delivery, payment details are limited to what is necessary for collection.</p>","order":5},
      {"id":"cookies-tracking","title":"Cookies and Tracking","content":"<p>We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand where our visitors come from. You can control cookie preferences through your browser settings.</p>","order":6},
      {"id":"third-party-services","title":"Third Party Services","content":"<p>We may share your information with trusted third-party service providers who assist us in operating our website, processing payments, delivering orders, and analyzing our business. These providers are contractually obligated to protect your information.</p>","order":7},
      {"id":"data-security","title":"Data Security","content":"<p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure.</p>","order":8},
      {"id":"user-rights","title":"User Rights","content":"<p>You have the right to access, correct, or delete your personal information. You can update your account information directly or contact us for assistance. You may also request a copy of the data we hold about you.</p>","order":9},
      {"id":"data-retention","title":"Data Retention","content":"<p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. We will securely delete or anonymize your data when it is no longer needed.</p>","order":10},
      {"id":"policy-updates","title":"Policy Updates","content":"<p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically for any changes.</p>","order":11},
      {"id":"contact-information","title":"Contact Information","content":"<p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us using the information below.</p>","order":12}
    ]'::jsonb,
    'Privacy Policy - Horof',
    'Learn how Horof collects, uses, and protects your personal information. Our commitment to your privacy and data security.'
  )
ON CONFLICT (page_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_legal_pages_page_type ON legal_pages(page_type);

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_pages_select ON public.legal_pages
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY legal_pages_mutate ON public.legal_pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS legal_pages;
