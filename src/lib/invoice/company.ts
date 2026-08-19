/**
 * Company branding + contact information used across the invoice template,
 * print system, and footer.
 */

export type CompanyInfo = {
  brand: string;
  tagline: string;
  logoUrl: string | null;
  address: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  supportPhone: string;
  supportHours: string;
  returnPolicy: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://horofbd.com';

export function getCompanyInfo(): CompanyInfo {
  return {
    brand: 'HOROF',
    tagline: 'Premium Handcrafted Signage & Custom Acrylic Masterpieces',
    logoUrl: null,
    address: 'Dhaka',
    city: 'Dhaka, Bangladesh',
    website: 'www.horof.com',
    email: 'support@horof.com',
    phone: '+880 1700-000000',
    supportPhone: '+880 1700-000000',
    supportHours: 'Sat – Thu, 9:00 AM – 9:00 PM',
    returnPolicy:
      'Eligible items can be returned within 7 days of delivery if they arrive damaged, defective, or differ from the order. Custom & personalized items are not returnable unless defective.',
  };
}

export function siteUrl(): string {
  return SITE_URL;
}
