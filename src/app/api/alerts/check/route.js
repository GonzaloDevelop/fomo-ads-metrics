/**
 * API endpoint for n8n: checks all active alerts against today's Meta data.
 *
 * GET /api/alerts/check?secret=YOUR_CRON_SECRET
 *
 * Returns: { triggered: [{ alert, currentValue, metric }] }
 * n8n uses this to send emails via Resend.
 */

import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../../../_lib/encryption';
import { fetchMetaCampaigns } from '../../../_lib/metaApi';
import { todayLocal } from '../../../_lib/dateUtils';
import { NextResponse } from 'next/server';

export async function GET(request) {
    // Auth: simple secret key (set in Vercel env + n8n)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Get all active alerts
    const { data: alerts } = await supabase
        .from('alerts')
        .select('*, user_profiles!inner(email)')
        .eq('is_active', true);

    if (!alerts?.length) {
        return NextResponse.json({ triggered: [], message: 'No active alerts' });
    }

    // 2. Group alerts by user_id to avoid duplicate API calls
    const byUser = {};
    for (const alert of alerts) {
        if (!byUser[alert.user_id]) byUser[alert.user_id] = [];
        byUser[alert.user_id].push(alert);
    }

    const triggered = [];
    const today = todayLocal();

    for (const [userId, userAlerts] of Object.entries(byUser)) {
        // Get user's Meta token
        const { data: conn } = await supabase
            .from('meta_connections')
            .select('encrypted_token')
            .eq('user_id', userId)
            .single();

        if (!conn) continue;

        const token = decrypt(conn.encrypted_token);
        if (!token) continue;

        // Group by account
        const byAccount = {};
        for (const alert of userAlerts) {
            if (!byAccount[alert.account_id]) byAccount[alert.account_id] = [];
            byAccount[alert.account_id].push(alert);
        }

        for (const [accountId, accountAlerts] of Object.entries(byAccount)) {
            try {
                // Fetch today's campaigns for this account
                const dateRange = { since: today, until: today };
                const campaigns = await fetchMetaCampaigns(token, accountId, dateRange);

                // Aggregate metrics across all campaigns
                const agg = {};
                for (const c of campaigns) {
                    for (const [key, val] of Object.entries(c)) {
                        if (typeof val === 'number') agg[key] = (agg[key] || 0) + val;
                    }
                }
                // Computed metrics
                if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
                if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
                if (agg.results > 0) agg.cost_per_result = agg.spend / agg.results;
                if (agg.revenue > 0 && agg.spend > 0) agg.roas = agg.revenue / agg.spend;
                if (agg.impressions > 0) agg.cpm = (agg.spend / agg.impressions) * 1000;

                // Check each alert
                for (const alert of accountAlerts) {
                    // Skip if already triggered today
                    if (alert.last_triggered_at) {
                        const lastDate = new Date(alert.last_triggered_at).toISOString().split('T')[0];
                        if (lastDate === today) continue;
                    }

                    const currentValue = agg[alert.metric_key];
                    if (currentValue == null) continue;

                    let isTriggered = false;
                    switch (alert.operator) {
                        case '>': isTriggered = currentValue > alert.threshold; break;
                        case '<': isTriggered = currentValue < alert.threshold; break;
                        case '>=': isTriggered = currentValue >= alert.threshold; break;
                        case '<=': isTriggered = currentValue <= alert.threshold; break;
                    }

                    if (isTriggered) {
                        triggered.push({
                            alert_id: alert.id,
                            user_email: alert.alert_email,
                            account_name: alert.account_name,
                            account_id: alert.account_id,
                            metric_label: alert.metric_label,
                            metric_key: alert.metric_key,
                            operator: alert.operator,
                            threshold: alert.threshold,
                            current_value: Math.round(currentValue * 100) / 100,
                            date: today,
                        });

                        // Mark as triggered today
                        await supabase
                            .from('alerts')
                            .update({ last_triggered_at: new Date().toISOString() })
                            .eq('id', alert.id);
                    }
                }
            } catch (e) {
                console.error(`[alerts] Error checking account ${accountId}:`, e.message);
            }
        }
    }

    return NextResponse.json({
        triggered,
        checked: alerts.length,
        date: today,
    });
}
