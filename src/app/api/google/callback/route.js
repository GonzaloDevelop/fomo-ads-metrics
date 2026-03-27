/**
 * Google OAuth2 callback handler.
 * Exchanges auth code for tokens and stores encrypted refresh token in Supabase.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { encrypt } from '../../../_lib/encryption';
import { exchangeCodeForTokens, fetchAccessibleCustomers } from '../../../_lib/googleAdsApi';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // User denied consent
    if (error) {
        return NextResponse.redirect(new URL('/?google_error=consent_denied', request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/?google_error=no_code', request.url));
    }

    try {
        // Exchange code for tokens
        const { access_token, refresh_token, email } = await exchangeCodeForTokens(code);

        if (!refresh_token) {
            return NextResponse.redirect(new URL('/?google_error=no_refresh_token', request.url));
        }

        // Get authenticated Supabase user
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {}
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
        }

        // Encrypt refresh token
        const encryptedRefreshToken = encrypt(refresh_token);

        // Try to find MCC (manager accounts) for login-customer-id
        let loginCustomerId = null;
        try {
            const accounts = await fetchAccessibleCustomers(access_token);
            const mcc = accounts.find(a => a.manager);
            if (mcc) loginCustomerId = mcc.customerId;
        } catch {}

        // Upsert Google connection
        const { error: dbError } = await supabase
            .from('google_connections')
            .upsert({
                user_id: user.id,
                encrypted_refresh_token: encryptedRefreshToken,
                google_email: email,
                login_customer_id: loginCustomerId,
                selected_customer_id: null,
                selected_customer_name: null,
                selected_customer_currency: null,
                token_connected_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (dbError) {
            console.error('[Google OAuth] DB error:', dbError.message);
            return NextResponse.redirect(new URL('/?google_error=db_error', request.url));
        }

        // Redirect back to dashboard with success flag
        return NextResponse.redirect(new URL('/?google_connected=1', request.url));

    } catch (err) {
        console.error('[Google OAuth] Error:', err.message);
        return NextResponse.redirect(new URL(`/?google_error=${encodeURIComponent(err.message)}`, request.url));
    }
}
