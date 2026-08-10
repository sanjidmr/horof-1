-- SQL migration to add return_notes and return_admin_note columns to orders table
-- These columns store the customer's detailed return explanation and the admin's
-- approval/rejection note respectively.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS return_notes text,
  ADD COLUMN IF NOT EXISTS return_admin_note text;