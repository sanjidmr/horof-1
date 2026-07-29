# Product Loading System - Complete Audit & Fix Plan

## Critical Issues Found

### 1. `image`/`images` columns DON'T EXIST on products table (PRIMARY ROOT CAUSE)
- **save-product.ts** tries to INSERT/UPDATE `image` and `images` columns that don't exist in the DB
- The DB uses a separate `product_images` table
- This causes Supabase to reject the INSERT/UPDATE, meaning products can't be saved properly

### 2. `compare_price` column doesn't exist
- **save-product.ts** sets `compare_price: toNum(d.offer_price)` but the column is `offer_price`

### 3. `is_best_selling`, `is_new_arrival`, `is_product_of_the_day` columns don't exist
- **save-product.ts** tries to set these boolean fields
- The DB uses a `section` enum column instead

### 4. `perfect_for` type mismatch
- DB column is `text[] NOT NULL DEFAULT '{}'` (array)
- Code passes a comma-separated string or null

### 5. `order_requests.product_id` type mismatch
- Migration uses `BIGINT REFERENCES products(id)` but products uses `uuid`
- This would cause a foreign key constraint error

### 6. Missing TypeScript types for ~15+ columns
- `total_added`, `product_details`, `order_config`, `stock_status`, `cost_price`, `reserved_stock`, `incoming_stock`, `min_stock_level`, `max_stock_level`, `reorder_qty`, `barcode`, `unit`, `expected_restock_date`, `default_warehouse_id`, `subcategory_id`, `perfect_for_tags`

### 7. `stock_movements` insert uses wrong column names in `warehouseUpdateStock`
- Uses `type`, `quantity`, `reference` instead of `movement_type`, `quantity_change`, `reference_type`

### 8. `image` column referenced in warehouse queries
- **inventory.ts line 857**: selects `image` from products but column doesn't exist

### 9. `is_warehouse_staff`, `assigned_warehouse_id` missing from profiles type