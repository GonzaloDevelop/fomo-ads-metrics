-- Add alerts permission flag to user_profiles
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS can_use_alerts boolean NOT NULL DEFAULT false;

-- Owner always has access (update existing owner)
UPDATE public.user_profiles SET can_use_alerts = true WHERE role = 'owner';
