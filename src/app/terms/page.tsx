import React from 'react';

export default function TermsPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold text-slate-900">Terms of Service</h1>
          <p className="text-slate-500">Last updated: May 14, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>By accessing and using the Horof website and services, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">2. Use of Services</h2>
            <p>You may use our services for lawful purposes only. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">3. Product Information</h2>
            <p>We strive to provide accurate product descriptions and pricing. However, we do not warrant that product information is error-free. We reserve the right to correct any errors and to change or update information at any time.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">4. Intellectual Property</h2>
            <p>All content on our website, including text, graphics, logos, and images, is the property of Horof and is protected by intellectual property laws. You may not use our content without prior written permission.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">5. Limitation of Liability</h2>
            <p>Horof shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services or products.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
