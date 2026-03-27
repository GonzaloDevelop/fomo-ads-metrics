-- Alerts: per-user, per-account metric thresholds
CREATE TABLE IF NOT EXISTS public.alerts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id text NOT NULL,               -- act_xxx
    account_name text,
    metric_key text NOT NULL,               -- e.g. 'cost_per_result', 'ctr', 'spend'
    metric_label text,                      -- display name
    operator text NOT NULL CHECK (operator IN ('>', '<', '>=', '<=')),
    threshold numeric(14,2) NOT NULL,
    alert_email text NOT NULL,              -- email to send alert to
    is_active boolean NOT NULL DEFAULT true,
    last_triggered_at timestamptz,          -- avoid spam: don't re-trigger same day
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.alerts(is_active) WHERE is_active = true;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts"
    ON public.alerts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER alerts_updated
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
