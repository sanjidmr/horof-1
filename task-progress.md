# Order Return System Audit & Fix — Task Progress

## Issues Found

### Critical Bugs
1. **Customer Orders Page (`src/app/customer/orders/page.tsx`)**: ReturnRequestModal has `<select>` and `<textarea>` both bound to the same `reason` state — selecting a reason overwrites the textarea and vice versa. Customer cannot type their own explanation. ✅ FIXED
2. **All action calls use `Number(orderId)` on UUID strings** → produces `NaN`. Affects: customer orders page, orders page, track-order page, admin returns page. ✅ FIXED
3. **`requestOrderReturnAction(orderId: number, ...)`**: Function signature expects `number` but receives UUID strings. ✅ FIXED
4. **`handleReturnAction`**: Admin note not saved to metadata; no email to customer; no revalidation of admin paths. ✅ FIXED
5. **`requestOrderReturnAction`**: No admin notification sent when return is requested; no revalidation of admin paths. ✅ FIXED
6. **Admin Returns Page**: `Number(orderId)` bug; doesn't display `return_notes` or `return_admin_note`. ✅ FIXED
7. **Admin Order Detail View**: Admin note uses `<input>` instead of `<textarea>`; doesn't display return notes. ✅ FIXED
8. **`order-helpers.ts`**: Default metadata missing `return_notes` and `return_admin_note` fields. ✅ FIXED
9. **`getReturnRequestDetail`**: Queries `products(name, image, ...)` but `image` column doesn't exist on products table. ✅ FIXED

### Missing Functionality
10. No admin notification when customer requests a return. ✅ FIXED
11. No email notification to customer when return is approved/rejected. ✅ FIXED
12. Inconsistent return modal UX across pages (some have reason selector, some don't). ✅ FIXED

## Fix Plan
- [x] 1. Update `order-helpers.ts` — add `return_notes` and `return_admin_note` to default metadata
- [x] 2. Update `orders.ts` actions — fix function signatures (UUID), save admin notes, add notifications, fix revalidation
- [x] 3. Fix customer orders page — separate select/textarea states, fix Number() bug, add reason selector + details textarea
- [x] 4. Fix orders page — add reason selector + details textarea, fix Number() bug
- [x] 5. Fix track-order page — add reason selector + details textarea, fix Number() bug
- [x] 6. Fix admin returns page — fix Number() bug, display return notes and admin notes
- [x] 7. Fix admin order detail view — change input to textarea, display return notes
- [x] 8. Add database migration for return notes
- [x] 9. Verify all changes compile and are consistent

## Files Modified
1. `src/lib/utils/order-helpers.ts` — Added `return_notes` and `return_admin_note` to default metadata
2. `src/lib/actions/orders.ts` — Fixed UUID signatures, saved admin notes, added notifications, fixed revalidation, fixed `product_images` query
3. `src/app/customer/orders/page.tsx` — Separate reason/details states, `String()` fix
4. `src/app/orders/page.tsx` — Separate reason/details states, `String()` fix
5. `src/app/track-order/page.tsx` — Added reason selector + details textarea, `String()` fix
6. `src/app/admin/returns/page.tsx` — Added `return_notes`/`return_admin_note` to type, display in detail modal
7. `src/components/admin/orders/OrderDetailView.tsx` — Changed `<input>` to `<textarea>`, display return notes
8. `supabase/migrations/20260814000000_return_notes_columns.sql` — New migration for return notes columns