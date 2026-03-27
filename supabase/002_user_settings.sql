-- Add settings JSONB to user_profiles for per-user preferences
-- Stores: table_metrics, kpi_metrics, chart_metric_a, chart_metric_b, chart_mode, etc.
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
