import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-slate-500">Last updated: May 14, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, place an order, or contact us. This may include your name, email address, phone number, shipping address, and payment information.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">2. How We Use Your Information</h2>
            <p>We use your information to process your orders, communicate with you about your purchases, and improve our services. We may also send you marketing communications if you have opted in to receive them.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">3. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">4. Third-Party Services</h2>
            <p>We may share your information with third-party service providers who perform services on our behalf, such as payment processing and shipping. These providers are obligated to protect your information.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal information. You can manage your account settings directly or contact our support team for assistance.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
