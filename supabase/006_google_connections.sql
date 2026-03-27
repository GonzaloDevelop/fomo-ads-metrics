-- =============================================
-- Google Ads Connections
-- =============================================
-- Stores encrypted OAuth refresh tokens for Google Ads API access.
-- One connection per user (like meta_connections).

CREATE TABLE IF NOT EXISTS public.google_connections (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    encrypted_refresh_token text NOT NULL,        -- AES-256-GCM encrypted Google OAuth refresh token
    selected_customer_id text,                    -- currently selected Google Ads customer ID (e.g. '1234567890')
    selected_customer_name text,
    selected_customer_currency text DEFAULT 'USD',
    login_customer_id text,                       -- MCC ID if accessed via manager account
    google_email text,                            -- Google account email used for OAuth
    token_connected_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_connections_user ON public.google_connections(user_id);

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google connection"
    ON public.google_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER google_connections_updated
    BEFORE UPDATE ON public.google_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
