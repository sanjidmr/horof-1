-- Enterprise Inventory & Stock Management System
-- Adds warehouses, suppliers, purchase orders, stock movements, transfers

-- -------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM (
    'stock_added', 'stock_removed', 'sale', 'return', 'adjustment',
    'damage', 'lost', 'transfer_out', 'transfer_in', 'purchase', 'manual_update', 'reservation'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_status AS ENUM (
    'in_stock', 'low_stock', 'out_of_stock', 'pre_order', 'discontinued'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_order_status AS ENUM (
    'draft', 'pending', 'approved', 'shipped', 'received', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_status AS ENUM (
    'pending', 'in_transit', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------------
-- Warehouses
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  location text,
  manager text,
  phone text,
  email text,
  capacity bigint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Suppliers
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text NOT NULL DEFAULT 'Bangladesh',
  payment_terms text,
  tax_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Product-Supplier relationship
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku text,
  cost_price numeric(14,2),
  lead_time_days int,
  is_preferred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, supplier_id)
);

-- -------------------------------------------------------------------
-- Purchase Orders
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_date timestamptz,
  received_date timestamptz,
  invoice_number text,
  notes text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(14,2) NOT NULL DEFAULT 0,
  total_cost numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  received_quantity int NOT NULL DEFAULT 0,
  unit_cost numeric(14,2) NOT NULL,
  total_cost numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Stock Movements (audit log for all inventory changes)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity_change int NOT NULL,
  stock_before int NOT NULL,
  stock_after int NOT NULL,
  reference_type text,
  reference_id text,
  notes text,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- -------------------------------------------------------------------
-- Stock Transfers (between warehouses)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status transfer_status NOT NULL DEFAULT 'pending',
  notes text,
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_warehouses CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);

-- -------------------------------------------------------------------
-- Inventory Reservations (for orders in progress)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_request_id uuid REFERENCES order_requests(id) ON DELETE CASCADE,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  released_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'consumed'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);

-- -------------------------------------------------------------------
-- Add inventory fields to products table
-- -------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level int NOT NULL DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_stock_level int;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_qty int NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status stock_status NOT NULL DEFAULT 'in_stock';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'piece';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric(14,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expected_restock_date timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reserved_stock int NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS incoming_stock int NOT NULL DEFAULT 0;

-- -------------------------------------------------------------------
-- Add warehouse_id to product_variants
-- -------------------------------------------------------------------
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS cost_price numeric(14,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image text;

-- -------------------------------------------------------------------
-- Function: auto-update stock_status on products
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_product_stock_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_stock int;
  min_level int;
BEGIN
  SELECT COALESCE(NEW.stock, 0), COALESCE(NEW.min_stock_level, 5) INTO total_stock, min_level;

  IF total_stock <= 0 THEN
    NEW.stock_status := 'out_of_stock';
  ELSIF total_stock <= min_level THEN
    NEW.stock_status := 'low_stock';
  ELSE
    NEW.stock_status := 'in_stock';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_products_stock_status
  BEFORE INSERT OR UPDATE OF stock, min_stock_level ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_status();

-- -------------------------------------------------------------------
-- Function: record stock movement automatically
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qty_change int;
  movement_type stock_movement_type;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.stock IS DISTINCT FROM NEW.stock) THEN
    qty_change := NEW.stock - OLD.stock;
    IF qty_change > 0 THEN
      movement_type := 'manual_update';
    ELSE
      movement_type := 'manual_update';
    END IF;

    INSERT INTO public.stock_movements (
      product_id, variant_id, warehouse_id, movement_type,
      quantity_change, stock_before, stock_after,
      reference_type, performed_by
    ) VALUES (
      NEW.id, NULL, NEW.default_warehouse_id, movement_type,
      qty_change, OLD.stock, NEW.stock,
      'product_update', auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_products_stock_movement
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION public.record_stock_movement();

-- -------------------------------------------------------------------
-- Function: process purchase order receipt (auto-add stock)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order(po_id uuid, receiver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po_item record;
  wh_id uuid;
BEGIN
  SELECT warehouse_id INTO wh_id FROM public.purchase_orders WHERE id = po_id;

  FOR po_item IN
    SELECT * FROM public.purchase_order_items
    WHERE purchase_order_id = po_id AND received_quantity < quantity
  LOOP
    UPDATE public.products
    SET stock = stock + (po_item.quantity - po_item.received_quantity),
        incoming_stock = incoming_stock - (po_item.quantity - po_item.received_quantity)
    WHERE id = po_item.product_id;

    INSERT INTO public.stock_movements (
      product_id, variant_id, warehouse_id, movement_type,
      quantity_change, stock_before, stock_after,
      reference_type, reference_id, notes, performed_by
    ) VALUES (
      po_item.product_id, po_item.variant_id, wh_id, 'purchase',
      po_item.quantity - po_item.received_quantity,
      (SELECT stock FROM products WHERE id = po_item.product_id) - (po_item.quantity - po_item.received_quantity),
      (SELECT stock FROM products WHERE id = po_item.product_id),
      'purchase_order', po_id, 'Purchase order received', receiver_id
    );

    UPDATE public.purchase_order_items
    SET received_quantity = quantity
    WHERE id = po_item.id;
  END LOOP;

  UPDATE public.purchase_orders
  SET status = 'received', received_date = now()
  WHERE id = po_id;
END;
$$;

-- -------------------------------------------------------------------
-- Function: complete stock transfer
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_stock_transfer(transfer_id uuid, completer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_record record;
BEGIN
  SELECT * INTO t_record FROM public.stock_transfers WHERE id = transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t_record.status != 'in_transit' THEN RAISE EXCEPTION 'Transfer must be in_transit to complete'; END IF;

  -- Remove from source warehouse (tracked on product level; for multi-warehouse we track via movements)
  INSERT INTO public.stock_movements (
    product_id, variant_id, warehouse_id, movement_type,
    quantity_change, stock_before, stock_after,
    reference_type, reference_id, notes, performed_by
  ) VALUES (
    t_record.product_id, t_record.variant_id, t_record.from_warehouse_id, 'transfer_out',
    -t_record.quantity,
    (SELECT COALESCE(stock, 0) FROM products WHERE id = t_record.product_id),
    (SELECT COALESCE(stock, 0) FROM products WHERE id = t_record.product_id) - t_record.quantity,
    'stock_transfer', transfer_id, 'Transfer out to warehouse', completer_id
  );

  UPDATE public.products SET stock = stock - t_record.quantity WHERE id = t_record.product_id;

  -- Add to destination warehouse
  INSERT INTO public.stock_movements (
    product_id, variant_id, warehouse_id, movement_type,
    quantity_change, stock_before, stock_after,
    reference_type, reference_id, notes, performed_by
  ) VALUES (
    t_record.product_id, t_record.variant_id, t_record.to_warehouse_id, 'transfer_in',
    t_record.quantity,
    (SELECT COALESCE(stock, 0) FROM products WHERE id = t_record.product_id),
    (SELECT COALESCE(stock, 0) FROM products WHERE id = t_record.product_id) + t_record.quantity,
    'stock_transfer', transfer_id, 'Transfer in from warehouse', completer_id
  );

  UPDATE public.products SET stock = stock + t_record.quantity WHERE id = t_record.product_id;

  UPDATE public.stock_transfers
  SET status = 'completed', completed_by = completer_id, completed_at = now()
  WHERE id = transfer_id;
END;
$$;

-- -------------------------------------------------------------------
-- Function: auto-create low stock notification
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_low_stock_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_status = 'low_stock' AND (OLD.stock_status IS NULL OR OLD.stock_status NOT IN ('low_stock', 'out_of_stock')) THEN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
      'Low Stock Alert',
      'Product "' || COALESCE(NEW.name, 'Unknown') || '" (SKU: ' || COALESCE(NEW.sku, 'N/A') || ') is running low. Current stock: ' || NEW.stock || ', Min level: ' || NEW.min_stock_level,
      'stock'
    );
  END IF;

  IF NEW.stock_status = 'out_of_stock' AND (OLD.stock_status IS NULL OR OLD.stock_status != 'out_of_stock') THEN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
      'Out of Stock Alert',
      'Product "' || COALESCE(NEW.name, 'Unknown') || '" (SKU: ' || COALESCE(NEW.sku, 'N/A') || ') is now out of stock.',
      'stock'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_products_low_stock_notify
  AFTER UPDATE OF stock_status ON public.products
  FOR EACH ROW
  WHEN (NEW.stock_status IS DISTINCT FROM OLD.stock_status)
  EXECUTE FUNCTION public.check_low_stock_and_notify();

-- -------------------------------------------------------------------
-- Indexes for inventory queries
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_suppliers_slug ON suppliers(slug);
CREATE INDEX IF NOT EXISTS idx_warehouses_slug ON warehouses(slug);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);

-- -------------------------------------------------------------------
-- RLS Policies
-- -------------------------------------------------------------------
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Warehouses: admin all, public read active
CREATE POLICY warehouses_select ON public.warehouses FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY warehouses_mutate ON public.warehouses FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Suppliers: admin all, public read active
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY suppliers_mutate ON public.suppliers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Product-Suppliers: admin all
CREATE POLICY product_suppliers_select ON public.product_suppliers FOR SELECT
  USING (public.is_admin());
CREATE POLICY product_suppliers_mutate ON public.product_suppliers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Purchase Orders: admin all
CREATE POLICY purchase_orders_select ON public.purchase_orders FOR SELECT
  USING (public.is_admin());
CREATE POLICY purchase_orders_mutate ON public.purchase_orders FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Purchase Order Items: admin all
CREATE POLICY purchase_order_items_select ON public.purchase_order_items FOR SELECT
  USING (public.is_admin());
CREATE POLICY purchase_order_items_mutate ON public.purchase_order_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Stock Movements: admin all
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT
  USING (public.is_admin());
CREATE POLICY stock_movements_mutate ON public.stock_movements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Stock Transfers: admin all
CREATE POLICY stock_transfers_select ON public.stock_transfers FOR SELECT
  USING (public.is_admin());
CREATE POLICY stock_transfers_mutate ON public.stock_transfers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Inventory Reservations: admin all, system insert
CREATE POLICY inventory_reservations_select ON public.inventory_reservations FOR SELECT
  USING (public.is_admin());
CREATE POLICY inventory_reservations_mutate ON public.inventory_reservations FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
