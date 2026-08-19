/**
 * Enterprise Settings Center — shared types & defaults.
 * This file has NO 'use server' directive so it can be imported from
 * both Server Components, Server Actions, and Client Components.
 */

// ============================================================
// General Settings
// ============================================================

export type GeneralSettings = {
  website_name: string;
  business_address: string;
  phone: string;
  support_email: string;
  company_logo: string;
  admin_logo: string;
  favicon: string;
};

export const DEFAULT_GENERAL: GeneralSettings = {
  website_name: 'Horof',
  business_address: 'Mymensingh, Dhaka',
  phone: '+880 1234 567890',
  support_email: 'studio@horofbd.com',
  company_logo: '/images/horof.svg',
  admin_logo: '/images/horof.svg',
  favicon: '/images/horof.svg',
};

// ============================================================
// Shipping Settings
// ============================================================

export type ShippingSettings = {
  inside_mymensingh_charge: number;
  outside_mymensingh_charge: number;
  office_charge: number;
  free_shipping_enabled: boolean;
  free_shipping_threshold: number;
  estimated_delivery: string;
};

export const DEFAULT_SHIPPING: ShippingSettings = {
  inside_mymensingh_charge: 60,
  outside_mymensingh_charge: 120,
  office_charge: 0,
  free_shipping_enabled: true,
  free_shipping_threshold: 1000,
  estimated_delivery: '2-3 days',
};

// ============================================================
// Notification Settings
// ============================================================

export type NotificationSettings = {
  email_enabled: boolean;
  admin_enabled: boolean;
  customer_enabled: boolean;
  browser_enabled: boolean;
  warehouse_enabled: boolean;
  low_stock_enabled: boolean;
  order_update_enabled: boolean;
  design_request_enabled: boolean;
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email_enabled: true,
  admin_enabled: true,
  customer_enabled: true,
  browser_enabled: true,
  warehouse_enabled: true,
  low_stock_enabled: true,
  order_update_enabled: true,
  design_request_enabled: true,
};

// ============================================================
// Email Settings
// ============================================================

export type EmailSettings = {
  sender_name: string;
  sender_email: string;
  support_email: string;
  smtp_enabled: boolean;
  smtp_provider: 'resend' | 'brevo' | 'sendgrid' | 'custom';
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  password_reset_enabled: boolean;
  order_email_enabled: boolean;
};

export const DEFAULT_EMAIL: EmailSettings = {
  sender_name: 'Horof',
  sender_email: 'noreply@horofbd.com',
  support_email: 'studio@horofbd.com',
  smtp_enabled: false,
  smtp_provider: 'resend',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: true,
  password_reset_enabled: true,
  order_email_enabled: true,
};

// ============================================================
// Social Settings
// ============================================================

export type SocialSettings = {
  facebook: string;
  instagram: string;
  whatsapp: string;
  youtube: string;
};

export const DEFAULT_SOCIAL: SocialSettings = {
  facebook: '',
  instagram: '',
  whatsapp: '',
  youtube: '',
};

// ============================================================
// Aggregated view
// ============================================================

export type AppSettings = {
  general: GeneralSettings;
  shipping: ShippingSettings;
  notifications: NotificationSettings;
  email: EmailSettings;
  social: SocialSettings;
};

export const SETTINGS_KEYS = {
  GENERAL: 'general',
  SHIPPING: 'shipping',
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
  SOCIAL: 'social',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export function isSettingsKey(key: string): key is SettingsKey {
  return Object.values(SETTINGS_KEYS).includes(key as SettingsKey);
}
