-- =============================================
-- Meta Ads Metrics — Database Schema
-- =============================================
-- Uses Supabase Auth for users.
-- Roles: owner (approve/reject), approved (use dashboard), pending (waiting approval).
-- Meta tokens encrypted at application level before storage.

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'pending' CHECK (role IN ('owner', 'approved', 'pending', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Meta connections (one per user — token stored encrypted)
CREATE TABLE IF NOT EXISTS public.meta_connections (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    encrypted_token text NOT NULL,              -- AES-256-GCM encrypted Meta access token
    business_id text,                           -- optional Business Manager ID
    selected_account_id text,                   -- currently selected ad account (act_xxx)
    selected_account_name text,
    selected_account_currency text DEFAULT 'USD',
    token_connected_at timestamptz NOT NULL DEFAULT now(),
    token_expires_at timestamptz,               -- NULL = permanent (System User Token)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id)                             -- one connection per user
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_meta_connections_user ON public.meta_connections(user_id);

-- 4. Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Owner can read all profiles (for approval)
CREATE POLICY "Owner reads all profiles"
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Owner can update any profile (approve/reject)
CREATE POLICY "Owner updates profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Users can insert their own profile (on signup)
CREATE POLICY "Users insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile (name only)
CREATE POLICY "Users update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Meta connections: users manage only their own
CREATE POLICY "Users manage own connection"
    ON public.meta_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        -- Reemplaza TU_EMAIL_DE_OWNER@ejemplo.com con tu email antes de ejecutar
        CASE
            WHEN NEW.email = 'TU_EMAIL_DE_OWNER@ejemplo.com' THEN 'owner'
            ELSE 'pending'
        END
    );
    RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER meta_connections_updated
    BEFORE UPDATE ON public.meta_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
