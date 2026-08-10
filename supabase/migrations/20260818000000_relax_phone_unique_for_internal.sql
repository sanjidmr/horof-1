-- ============================================================
-- RELAX PHONE UNIQUENESS FOR INTERNAL USERS
--
-- PROBLEM:
--   idx_profiles_phone_unique made phone globally unique across
--   ALL profiles (customers AND staff). When creating warehouse
--   staff whose phone happens to match a customer's stored phone,
--   the profile upsert failed with:
--     duplicate key value violates unique constraint
--     "idx_profiles_phone_unique"
--   Staff log in by email, not phone - their phone is only used
--   as the seed for the initial login password, so a staff phone
--   colliding with a customer's phone is harmless.
--
-- FIX:
--   Enforce phone uniqueness for CUSTOMERS only (phone is used
--   for checkout / order lookup identity). Internal users may
--   share phone numbers freely.
-- ============================================================

DROP INDEX IF EXISTS idx_profiles_phone_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND user_type = 'customer';
