-- ============================================================
-- ENTERPRISE RBAC: CUSTOMER vs INTERNAL USER SEPARATION
-- Fixes role conflicts, duplicate records, and permission issues
-- ============================================================

-- -------------------------------------------------------------------
-- 1. EXTEND user_role ENUM with internal roles
-- -------------------------------------------------------------------
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse_staff';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------------
-- 2. ADD user_type COLUMN to profiles
--    'customer' = real customers (registered/placed orders)
--    'internal' = Super Admin, Admin, Staff, Warehouse Staff, Managers
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
    ALTER TABLE public.profiles ADD COLUMN user_type text NOT NULL DEFAULT 'customer'
      CHECK (user_type IN ('customer', 'internal'));
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 3. MIGRATE EXISTING DATA
--    - role = 'admin' → user_type = 'internal'
--    - is_warehouse_staff = true → user_type = 'internal', role = 'warehouse_staff'
--    - role = 'customer' AND is_warehouse_staff = false → user_type = 'customer'
-- -------------------------------------------------------------------
UPDATE public.profiles
SET user_type = 'internal'
WHERE role = 'admin'::public.user_role;

UPDATE public.profiles
SET user_type = 'internal', role = 'warehouse_staff'::public.user_role
WHERE is_warehouse_staff = true;

-- Any profile with a user_roles entry (RBAC role) is internal
UPDATE public.profiles p
SET user_type = 'internal'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

-- -------------------------------------------------------------------
-- 4. ADD UNIQUE CONSTRAINTS for phone and email
-- -------------------------------------------------------------------
-- Remove duplicate emails first (keep the most recent)
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.email = b.email
  AND a.created_at < b.created_at
  AND a.email IS NOT NULL;

-- Remove duplicate phones first (keep the most recent)
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.phone = b.phone
  AND a.created_at < b.created_at
  AND a.phone IS NOT NULL;

-- Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;

-- -------------------------------------------------------------------
-- 5. CREATE HELPER FUNCTIONS
-- -------------------------------------------------------------------

-- Check if user is an internal system user (not a customer)
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
  );
$$;

-- Check if user is a real customer
CREATE OR REPLACE FUNCTION public.is_real_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'customer'
      AND p.role = 'customer'::public.user_role
  );
$$;

-- Update is_admin to also check user_type = 'internal'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role)
  );
$$;

-- Update is_customer to only match real customers
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'customer'
      AND p.role = 'customer'::public.user_role
  );
$$;

-- Update is_warehouse_staff to check role properly
CREATE OR REPLACE FUNCTION public.is_warehouse_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND (p.role = 'warehouse_staff'::public.user_role OR p.is_warehouse_staff = true)
  );
$$;

-- -------------------------------------------------------------------
-- 6. FIX PROFILES RLS POLICIES
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;

-- SELECT: users can see their own profile; internal users can see all
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_internal_user()
  );

-- INSERT: users can insert their own profile; internal users can create profiles
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.is_internal_user()
  );

-- UPDATE: users can update their own profile; internal users can update all
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_internal_user()
  );

-- DELETE: internal users only
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 7. FIX USER_ROLES RLS - only internal users can manage roles
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_internal_user()
  );

CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_internal_user());

CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 8. FIX AUDIT LOGS RLS - internal users can view
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 9. FIX LOGIN HISTORY RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS login_history_select_admin ON public.login_history;
CREATE POLICY login_history_select_admin ON public.login_history
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 10. FIX SECURITY EVENTS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS security_events_select_admin ON public.security_events;
CREATE POLICY security_events_select_admin ON public.security_events
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 11. FIX BACKUPS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS backups_select_admin ON public.backups;
DROP POLICY IF EXISTS backups_insert_admin ON public.backups;
DROP POLICY IF EXISTS backups_update_admin ON public.backups;
DROP POLICY IF EXISTS backups_delete_admin ON public.backups;

CREATE POLICY backups_select_admin ON public.backups FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY backups_insert_admin ON public.backups FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY backups_update_admin ON public.backups FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY backups_delete_admin ON public.backups FOR DELETE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 12. FIX USER PERMISSIONS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS user_permissions_select_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_insert_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_update_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_delete_admin ON public.user_permissions;

CREATE POLICY user_permissions_select_admin ON public.user_permissions FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY user_permissions_insert_admin ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY user_permissions_update_admin ON public.user_permissions FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY user_permissions_delete_admin ON public.user_permissions FOR DELETE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 13. FIX USER SESSIONS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS user_sessions_select_admin ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_update_admin ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_delete_admin ON public.user_sessions;

CREATE POLICY user_sessions_select_admin ON public.user_sessions FOR SELECT TO authenticated USING (public.is_internal_user() OR user_id = auth.uid());
CREATE POLICY user_sessions_update_admin ON public.user_sessions FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY user_sessions_delete_admin ON public.user_sessions FOR DELETE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 14. FIX CUSTOMER TIMELINE RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS timeline_select_admin ON public.customer_timeline;
DROP POLICY IF EXISTS timeline_insert_admin ON public.customer_timeline;

CREATE POLICY timeline_select_admin ON public.customer_timeline FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY timeline_insert_admin ON public.customer_timeline FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());

-- -------------------------------------------------------------------
-- 15. FIX CUSTOMER TAGS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS tags_select_admin ON public.customer_tags;
DROP POLICY IF EXISTS tags_insert_admin ON public.customer_tags;
DROP POLICY IF EXISTS tags_delete_admin ON public.customer_tags;

CREATE POLICY tags_select_admin ON public.customer_tags FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY tags_insert_admin ON public.customer_tags FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY tags_delete_admin ON public.customer_tags FOR DELETE TO authenticated USING (public.is_internal_user());

DROP POLICY IF EXISTS tag_assignments_select_admin ON public.customer_tag_assignments;
DROP POLICY IF EXISTS tag_assignments_insert_admin ON public.customer_tag_assignments;
DROP POLICY IF EXISTS tag_assignments_delete_admin ON public.customer_tag_assignments;

CREATE POLICY tag_assignments_select_admin ON public.customer_tag_assignments FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY tag_assignments_insert_admin ON public.customer_tag_assignments FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY tag_assignments_delete_admin ON public.customer_tag_assignments FOR DELETE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 16. FIX CUSTOMER INVOICES RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS invoices_insert_admin ON public.customer_invoices;
DROP POLICY IF EXISTS invoices_update_admin ON public.customer_invoices;

CREATE POLICY invoices_insert_admin ON public.customer_invoices FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY invoices_update_admin ON public.customer_invoices FOR UPDATE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 17. FIX NOTIFICATIONS RLS - internal users can manage
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;

CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user() OR public.is_warehouse_staff());

CREATE POLICY notifications_delete_policy ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 18. FIX ROLES & PERMISSIONS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS roles_insert_admin ON public.roles;
DROP POLICY IF EXISTS roles_update_admin ON public.roles;
DROP POLICY IF EXISTS roles_delete_admin ON public.roles;

CREATE POLICY roles_insert_admin ON public.roles FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY roles_update_admin ON public.roles FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY roles_delete_admin ON public.roles FOR DELETE TO authenticated USING (public.is_internal_user());

DROP POLICY IF EXISTS permissions_insert_admin ON public.permissions;
DROP POLICY IF EXISTS permissions_update_admin ON public.permissions;
DROP POLICY IF EXISTS permissions_delete_admin ON public.permissions;

CREATE POLICY permissions_insert_admin ON public.permissions FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY permissions_update_admin ON public.permissions FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY permissions_delete_admin ON public.permissions FOR DELETE TO authenticated USING (public.is_internal_user());

DROP POLICY IF EXISTS role_permissions_insert_admin ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_update_admin ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_admin ON public.role_permissions;

CREATE POLICY role_permissions_insert_admin ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY role_permissions_update_admin ON public.role_permissions FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY role_permissions_delete_admin ON public.role_permissions FOR DELETE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 19. FIX ACCOUNT LOCKS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS account_locks_select_admin ON public.account_locks;
DROP POLICY IF EXISTS account_locks_insert_admin ON public.account_locks;
DROP POLICY IF EXISTS account_locks_update_admin ON public.account_locks;

CREATE POLICY account_locks_select_admin ON public.account_locks FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY account_locks_insert_admin ON public.account_locks FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY account_locks_update_admin ON public.account_locks FOR UPDATE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 20. FIX RATE LIMITS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS rate_limits_select_admin ON public.rate_limits;
CREATE POLICY rate_limits_select_admin ON public.rate_limits FOR SELECT TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 21. FIX BACKUP SCHEDULES & RESTORE HISTORY RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS backup_schedules_select_admin ON public.backup_schedules;
DROP POLICY IF EXISTS backup_schedules_insert_admin ON public.backup_schedules;
DROP POLICY IF EXISTS backup_schedules_update_admin ON public.backup_schedules;
DROP POLICY IF EXISTS backup_schedules_delete_admin ON public.backup_schedules;

CREATE POLICY backup_schedules_select_admin ON public.backup_schedules FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY backup_schedules_insert_admin ON public.backup_schedules FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY backup_schedules_update_admin ON public.backup_schedules FOR UPDATE TO authenticated USING (public.is_internal_user());
CREATE POLICY backup_schedules_delete_admin ON public.backup_schedules FOR DELETE TO authenticated USING (public.is_internal_user());

DROP POLICY IF EXISTS restore_history_select_admin ON public.restore_history;
DROP POLICY IF EXISTS restore_history_insert_admin ON public.restore_history;

CREATE POLICY restore_history_select_admin ON public.restore_history FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY restore_history_insert_admin ON public.restore_history FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());

-- -------------------------------------------------------------------
-- 22. FIX FRAUD RULES RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS fraud_rules_select_admin ON public.fraud_rules;
DROP POLICY IF EXISTS fraud_rules_insert_admin ON public.fraud_rules;
DROP POLICY IF EXISTS fraud_rules_update_admin ON public.fraud_rules;

CREATE POLICY fraud_rules_select_admin ON public.fraud_rules FOR SELECT TO authenticated USING (public.is_internal_user());
CREATE POLICY fraud_rules_insert_admin ON public.fraud_rules FOR INSERT TO authenticated WITH CHECK (public.is_internal_user());
CREATE POLICY fraud_rules_update_admin ON public.fraud_rules FOR UPDATE TO authenticated USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 23. FIX ORDERS RLS - use is_internal_user for admin access
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS orders_select_clean ON public.orders;
CREATE POLICY orders_select_clean ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id = auth.uid()
    OR public.is_internal_user()
    OR (warehouse_staff_id = auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_warehouse_staff = true
        AND profiles.assigned_warehouse_id = orders.warehouse_id
      )
    )
  );

-- -------------------------------------------------------------------
-- 24. FIX ORDER REQUESTS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS order_requests_select_own_or_admin ON public.order_requests;
CREATE POLICY order_requests_select_own_or_admin ON public.order_requests
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_internal_user()
  );

-- -------------------------------------------------------------------
-- 25. FIX NOTIFICATIONS SELECT RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR user_id = auth.uid()
    OR (
      warehouse_id IS NOT NULL
      AND public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = notifications.warehouse_id
      )
    )
    OR (
      warehouse_id IS NULL
      AND user_id IS NULL
      AND public.is_warehouse_staff()
    )
  );

-- -------------------------------------------------------------------
-- 26. FIX WAREHOUSE ASSIGNMENTS RLS
--    warehouse_assignments is EXCLUSIVELY for order management.
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_assignments_select ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_select ON public.warehouse_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR (
      public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = warehouse_assignments.warehouse_id
      )
    )
  );

DROP POLICY IF EXISTS warehouse_assignments_insert ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_insert ON public.warehouse_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user() OR public.is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_assignments_update ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_update ON public.warehouse_assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_user()
    OR (
      public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = warehouse_assignments.warehouse_id
      )
    )
  );

DROP POLICY IF EXISTS warehouse_assignments_delete ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_delete ON public.warehouse_assignments
  FOR DELETE TO authenticated
  USING (public.is_internal_user());

-- -------------------------------------------------------------------
-- 27. FIX WAREHOUSE ACTIVITY LOGS RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_activity_select ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_select ON public.warehouse_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR (
      public.is_warehouse_staff()
      AND (
        warehouse_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_warehouse_staff = true
            AND p.assigned_warehouse_id = warehouse_activity_logs.warehouse_id
        )
      )
    )
  );

DROP POLICY IF EXISTS warehouse_activity_insert ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_insert ON public.warehouse_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 28. FIX WAREHOUSE PACKING FILES RLS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_packing_select ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_select ON public.warehouse_packing_files
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR (
      public.is_warehouse_staff()
      AND (
        warehouse_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_warehouse_staff = true
            AND p.assigned_warehouse_id = warehouse_packing_files.warehouse_id
        )
      )
    )
  );

DROP POLICY IF EXISTS warehouse_packing_insert ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_insert ON public.warehouse_packing_files
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user() OR public.is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_packing_delete ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_delete ON public.warehouse_packing_files
  FOR DELETE TO authenticated
  USING (public.is_internal_user() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 29. FIX PRODUCTS RLS - use is_internal_user
--    Products use their own default_warehouse_id field for warehouse
--    assignment. warehouse_assignments is EXCLUSIVELY for orders.
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS products_warehouse_staff_select ON public.products;
CREATE POLICY products_warehouse_staff_select ON public.products
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND (
          products.default_warehouse_id = p.assigned_warehouse_id
          OR products.default_warehouse_id IS NULL
        )
    )
  );

DROP POLICY IF EXISTS products_warehouse_staff_update ON public.products;
CREATE POLICY products_warehouse_staff_update ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_user()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND products.default_warehouse_id = p.assigned_warehouse_id
    )
  );

-- -------------------------------------------------------------------
-- 30. FIX ORDERS RLS - multi-warehouse
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS orders_warehouse_staff_select_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_select_multi ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_internal_user()
    OR user_id = auth.uid()
    OR customer_id = auth.uid()
    OR warehouse_staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND (
          orders.warehouse_id = p.assigned_warehouse_id
          OR p.assigned_warehouse_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.warehouse_assignments wa
            WHERE wa.entity_type = 'order'
              AND wa.entity_id = orders.id
              AND wa.warehouse_id = p.assigned_warehouse_id
              AND wa.status <> 'cancelled'
          )
        )
    )
  );

DROP POLICY IF EXISTS orders_warehouse_staff_update_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_update_multi ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_user()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND (
            orders.warehouse_id = p.assigned_warehouse_id
            OR EXISTS (
              SELECT 1 FROM public.warehouse_assignments wa
              WHERE wa.entity_type = 'order'
                AND wa.entity_id = orders.id
                AND wa.warehouse_id = p.assigned_warehouse_id
                AND wa.status <> 'cancelled'
            )
          )
      )
    )
  );

-- -------------------------------------------------------------------
-- 31. FIX get_warehouse_staff function
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_warehouse_staff(wh_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text
)
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.is_warehouse_staff = true
    AND (p.assigned_warehouse_id = wh_id OR p.assigned_warehouse_id IS NULL)
    AND p.user_type = 'internal'
  ORDER BY p.full_name;
$$;

-- -------------------------------------------------------------------
-- 32. FIX get_user_warehouse_profile function
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_warehouse_profile()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  is_warehouse_staff boolean,
  assigned_warehouse_id uuid,
  role text,
  user_type text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.is_warehouse_staff, p.assigned_warehouse_id, p.role::text, p.user_type
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- -------------------------------------------------------------------
-- 33. UPDATE handle_new_user trigger to set user_type
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, user_type)
  VALUES (NEW.id, NEW.email, 'customer'::public.user_role, 'customer')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------
-- 34. CREATE FUNCTION to get internal users only
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_internal_users()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE user_type = 'internal'
  ORDER BY created_at DESC;
$$;

-- -------------------------------------------------------------------
-- 35. CREATE FUNCTION to get customers only
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customers()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE user_type = 'customer'
    AND role = 'customer'::public.user_role
    AND is_warehouse_staff = false
  ORDER BY created_at DESC;
$$;

-- -------------------------------------------------------------------
-- 36. CREATE FUNCTION to count real customers
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_real_customers()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.profiles
  WHERE user_type = 'customer'
    AND role = 'customer'::public.user_role
    AND is_warehouse_staff = false;
$$;

-- -------------------------------------------------------------------
-- 37. CREATE FUNCTION to count internal users
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_internal_users()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.profiles
  WHERE user_type = 'internal';
$$;

-- -------------------------------------------------------------------
-- 38. ADD INDEXES for performance
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_role ON public.profiles(user_type, role);