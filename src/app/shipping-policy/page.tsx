import React from 'react';

export default function ShippingPolicyPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold text-slate-900">Shipping Policy</h1>
          <p className="text-slate-500">Last updated: May 14, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">1. Processing Time</h2>
            <p>All orders are processed within 1-3 business days. Orders are not shipped or delivered on weekends or holidays. If there will be a significant delay in shipment of your order, we will contact you via email or telephone.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">2. Shipping Rates & Delivery Estimates</h2>
            <p>Shipping charges for your order will be calculated and displayed at checkout. Delivery estimates vary based on your location:
              <ul className="list-disc pl-6 mt-2">
                <li><strong>Inside Dhaka:</strong> 2-3 business days</li>
                <li><strong>Outside Dhaka:</strong> 3-7 business days</li>
              </ul>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">3. Shipment Confirmation & Order Tracking</h2>
            <p>You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). You can also track your order status directly from your account dashboard.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">4. Customs, Duties and Taxes</h2>
            <p>Horof is not responsible for any customs and taxes applied to your order. All fees imposed during or after shipping are the responsibility of the customer (tariffs, taxes, etc.).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">5. Damages</h2>
            <p>Horof is not liable for any products damaged or lost during shipping. If you received your order damaged, please contact the shipment carrier to file a claim. Please save all packaging materials and damaged goods before filing a claim.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
