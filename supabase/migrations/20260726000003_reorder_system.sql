-- ============================================================
-- ONE-CLICK REORDER SYSTEM
-- ============================================================
-- Adds reorder tracking columns to orders + order_requests
-- ============================================================

ALTER TABLE public.order_requests
ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reordered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reordered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_requests_original_order_id ON public.order_requests(original_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_original_order_id ON public.orders(original_order_id);
