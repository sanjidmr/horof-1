/**
 * Settings Center — zod validation schemas.
 * Shared between Server Actions (authoritative) and the UI.
 */
import { z } from 'zod';

const urlSchema = z
  .union([z.literal(''), z.string().url('Must be a valid URL')])
  .refine((v) => v === '' || !v.includes('yournumber'), {
    message: 'Replace the placeholder link with a real URL',
  });

export const generalSettingsSchema = z.object({
  website_name: z.string().trim().min(1, 'Website name is required').max(80, 'Max 80 characters'),
  business_address: z.string().trim().max(255, 'Max 255 characters'),
  phone: z.string().trim().max(40, 'Max 40 characters'),
  support_email: z.string().trim().email('Must be a valid email').max(120, 'Max 120 characters'),
  company_logo: z.string().trim().max(1000),
  admin_logo: z.string().trim().max(1000),
  favicon: z.string().trim().max(1000),
});

export const shippingSettingsSchema = z.object({
  inside_mymensingh_charge: z.number().min(0, 'Cannot be negative').max(100000),
  outside_mymensingh_charge: z.number().min(0, 'Cannot be negative').max(100000),
  office_charge: z.number().min(0, 'Cannot be negative').max(100000),
  free_shipping_enabled: z.boolean(),
  free_shipping_threshold: z.number().min(0, 'Cannot be negative').max(10000000),
  estimated_delivery: z.string().trim().min(1, 'Estimated delivery is required').max(100),
});

export const notificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  admin_enabled: z.boolean(),
  customer_enabled: z.boolean(),
  browser_enabled: z.boolean(),
  warehouse_enabled: z.boolean(),
  low_stock_enabled: z.boolean(),
  order_update_enabled: z.boolean(),
  design_request_enabled: z.boolean(),
});

export const emailSettingsSchema = z.object({
  sender_name: z.string().trim().min(1, 'Sender name is required').max(80),
  sender_email: z.string().trim().email('Must be a valid email').max(120),
  support_email: z.string().trim().email('Must be a valid email').max(120),
  smtp_enabled: z.boolean(),
  smtp_provider: z.enum(['resend', 'brevo', 'sendgrid', 'custom']),
  smtp_host: z.string().trim().max(200),
  smtp_port: z.number().int().min(1).max(65535),
  smtp_user: z.string().trim().max(200),
  smtp_pass: z.string().max(300),
  smtp_secure: z.boolean(),
  password_reset_enabled: z.boolean(),
  order_email_enabled: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.smtp_enabled && data.smtp_provider === 'custom') {
    if (!data.smtp_host) ctx.addIssue({ code: 'custom', path: ['smtp_host'], message: 'SMTP host is required when custom SMTP is enabled' });
    if (!data.smtp_user) ctx.addIssue({ code: 'custom', path: ['smtp_user'], message: 'SMTP username is required when custom SMTP is enabled' });
    if (!data.smtp_pass) ctx.addIssue({ code: 'custom', path: ['smtp_pass'], message: 'SMTP password is required when custom SMTP is enabled' });
  }
});

export const socialSettingsSchema = z.object({
  facebook: urlSchema,
  instagram: urlSchema,
  whatsapp: urlSchema,
  youtube: urlSchema,
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type ShippingSettingsInput = z.infer<typeof shippingSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>;
export type SocialSettingsInput = z.infer<typeof socialSettingsSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
