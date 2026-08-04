# Order Return System Audit & Fix — Task Progress

## Issues Found

### Critical Bugs
1. **Customer Orders Page (`src/app/customer/orders/page.tsx`)**: ReturnRequestModal has `<select>` and `<textarea>` both bound to the same `reason` state — selecting a reason overwrites the textarea and vice versa. Customer cannot type their own explanation.
2. **All action calls use `Number(orderId)` on UUID strings** → produces `NaN`. Affects: customer orders page, orders page, track-order page, admin returns page.
3. **`requestOrderReturnAction(orderId: number, ...)`**: Function signature expects `number` but receives UUID strings.
4. **`handleReturnAction`**: Admin note not saved to metadata; no email to customer; no revalidation of admin paths.
5. **`requestOrderReturnAction`**: No admin notification sent when return is requested; no revalidation of admin paths.
6. **Admin Returns Page**: `Number(orderId)` bug; doesn't display `return_notes` or `return_admin_note`.
7. **Admin Order Detail View**: Admin note uses `<input>` instead of `<textarea>`; doesn't display return notes.
8. **`order-helpers.ts`**: Default metadata missing `return_notes` and `return_admin_note` fields.
9. **`getReturnRequestDetail`**: Queries `products(name, image, ...)` but `image` column doesn't exist on products table.

### Missing Functionality
10. No admin notification when customer requests a return.
11. No email notification to customer when return is approved/rejected.
12. Inconsistent return modal UX across pages (some have reason selector, some don't).

## Fix Plan
- [ ] 1. Update `order-helpers.ts` — add `return_notes` and `return_admin_note` to default metadata
- [ ] 2. Update `orders.ts` actions — fix function signatures (UUID), save admin notes, add notifications, fix revalidation
- [ ] 3. Fix customer orders page — separate select/textarea states, fix Number() bug, add reason selector + details textarea
- [ ] 4. Fix orders page — add reason selector + details textarea, fix Number() bug
- [ ] 5. Fix track-order page — add reason selector + details textarea, fix Number() bug
- [ ] 6. Fix admin returns page — fix Number() bug, display return notes and admin notes
- [ ] 7. Fix admin order detail view — change input to textarea, display return notes
- [ ] 8. Add database migration for return notes
- [ ] 9. Verify all changes compile and are consistent
