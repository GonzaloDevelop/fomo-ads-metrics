-- =============================================
-- Sales Log — Manual sales tracking per ad
-- =============================================
-- Used by the SalesTracker component for messages/leads objectives
-- where Meta doesn't auto-track purchases via Pixel.

CREATE TABLE IF NOT EXISTS public.sales_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    ad_id text NOT NULL,
    ad_name text,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'USD',
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_log_user ON public.sales_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_log_ad ON public.sales_log(ad_id);

ALTER TABLE public.sales_log ENABLE ROW LEVEL SECURITY;

-- Users manage only their own sales
CREATE POLICY "Users manage own sales"
    ON public.sales_log FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
