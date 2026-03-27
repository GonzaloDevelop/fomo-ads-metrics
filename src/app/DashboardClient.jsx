'use client';

import { useState, useMemo, useTransition, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { connectWithToken, selectAdAccount, disconnectMeta, getMetaData, fetchAccountList } from './_actions/meta';
import { getGoogleAuthUrl, fetchGoogleAccountList, selectGoogleAccount, disconnectGoogle, getGoogleData } from './_actions/google';
import { saveSetting } from './_actions/settings';
import { recomputeResults } from './_lib/metaApi';
import { getAllMetrics, DEFAULT_METRICS, getCurrencySymbol } from './_lib/metrics';
import { getAllGoogleMetrics, GOOGLE_DEFAULT_METRICS, CAMPAIGN_TYPE_LABELS } from './_lib/googleMetrics';
import ConnectForm from './components/ConnectForm';
import GoogleConnectForm from './components/GoogleConnectForm';
import DateFilter from './components/DateFilter';
import KPICards from './components/KPICards';
import AdsTable from './components/AdsTable';
import InsightsChart from './components/InsightsChart';
import SalesTracker from './components/SalesTracker';
import MetricPicker from './components/MetricPicker';
import RegionPieChart from './components/RegionPieChart';
import FunnelChart from './components/FunnelChart';
import CustomMetricModal from './components/CustomMetricModal';
import { signOut } from './_actions/auth';
import {
    BarChart3, Unplug, RefreshCw, Building2, ChevronDown, LogOut, Shield, AlertTriangle, Calculator, Bell, Sun, Moon,
} from 'lucide-react';

const OBJECTIVE_CATEGORIES = {
    OUTCOME_SALES: { label: 'Ventas (Ecommerce)', icon: '🛒' },
    MESSAGES: { label: 'Mensajes (Servicios)', icon: '💬' },
    OUTCOME_LEADS: { label: 'Clientes Potenciales (Leads)', icon: '🎯' },
    LEAD_GENERATION: { label: 'Generacion de Leads', icon: '🎯' },
    CONVERSIONS: { label: 'Conversiones', icon: '🔄' },
    OUTCOME_ENGAGEMENT: { label: 'Interaccion', icon: '👍' },
    OUTCOME_TRAFFIC: { label: 'Trafico', icon: '🔗' },
    LINK_CLICKS: { label: 'Clics en enlaces', icon: '🔗' },
    OUTCOME_AWARENESS: { label: 'Reconocimiento', icon: '📢' },
    REACH: { label: 'Alcance', icon: '📡' },
};

export default function DashboardClient({ connection, googleConnection, initialData, isOwner = false, userName = '', userSettings = {} }) {
    // --- Theme ---
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('fomo-theme') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fomo-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    // --- Platform toggle ---
    const [platform, setPlatform] = useState(() => {
        // Default to whichever platform has a connected account
        if (googleConnection?.connected && googleConnection?.selected_customer_id) return 'google';
        if (connection?.connected && connection?.selected_account_id) return 'meta';
        if (googleConnection?.connected) return 'google';
        return 'meta';
    });

    const [tokenExpired, setTokenExpired] = useState(connection?.tokenExpired || false);
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState(initialData);
    const [datePreset, setDatePreset] = useState('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [objectiveFilter, setObjectiveFilter] = useState('ALL');
    const [hideZeroSpend, setHideZeroSpend] = useState(true);
    const [connInfo, setConnInfo] = useState(connection);
    const [adAccounts, setAdAccounts] = useState([]); // fetched from API, not cookie
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [selectedMetrics, setSelectedMetrics] = useState(userSettings.kpi_metrics || null);
    const [tableMetrics, setTableMetrics] = useState(userSettings.table_metrics || null);
    const [customMetrics, setCustomMetrics] = useState(userSettings.custom_metrics || []);
    const [showCustomModal, setShowCustomModal] = useState(false);

    // --- Google state ---
    const [gConnInfo, setGConnInfo] = useState(googleConnection);
    const [gAdAccounts, setGAdAccounts] = useState([]);
    const [gData, setGData] = useState(null);
    const [showGAccountPicker, setShowGAccountPicker] = useState(false);

    // Platform switch handler
    const handlePlatformSwitch = (p) => {
        setPlatform(p);
        setStatusFilter('ALL');
        setObjectiveFilter('ALL');
        setSelectedMetrics(null);
    };

    // On mount: fetch account list + auto-load data if account selected
    useEffect(() => {
        // Meta
        if (connInfo?.connected) {
            fetchAccountList().then(result => {
                if (result.ok) setAdAccounts(result.accounts);
            }).catch(() => {});

            if (connInfo.selected_account_id) {
                fetchData('30d');
            }
        }
        // Google
        if (gConnInfo?.connected) {
            fetchGoogleAccountList().then(result => {
                if (result.ok) setGAdAccounts(result.accounts);
            }).catch(() => {});

            if (gConnInfo.selected_customer_id) {
                fetchGoogleDataWrapper('30d');
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const saveTimerRef = useRef(null);
    const updateTableMetrics = useCallback((keys) => {
        if (keys.length > MAX_METRICS) return; // limit
        setTableMetrics(keys);
        // Debounce DB save (avoid spamming on rapid clicks)
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveSetting('table_metrics', keys), 500);
    }, []);

    // Derived — platform-aware
    const isMeta = platform === 'meta';
    const activeData = isMeta ? data : gData;
    const isConnected = isMeta ? !!connInfo?.connected : !!gConnInfo?.connected;
    const hasSelectedAccount = isMeta ? !!connInfo?.selected_account_id : !!gConnInfo?.selected_customer_id;
    const selectedAccount = isMeta
        ? (connInfo ? { id: connInfo.selected_account_id, name: connInfo.selected_account_name, currency: connInfo.selected_account_currency } : null)
        : (gConnInfo ? { id: gConnInfo.selected_customer_id, name: gConnInfo.selected_customer_name, currency: gConnInfo.selected_customer_currency } : null);
    const currency = selectedAccount?.currency || 'USD';

    // --- Break-Even settings per account ---
    const roasBeKey = selectedAccount?.id ? `roas_be_${selectedAccount.id}` : null;
    const cprBeKey = selectedAccount?.id ? `cpr_be_${selectedAccount.id}` : null;
    const [roasBE, setRoasBE] = useState(() => {
        if (roasBeKey && userSettings[roasBeKey]) return userSettings[roasBeKey];
        return null;
    });
    const [cprBE, setCprBE] = useState(() => {
        if (cprBeKey && userSettings[cprBeKey]) return userSettings[cprBeKey];
        return null;
    });
    const [showBEInput, setShowBEInput] = useState(false);
    const [roasBEDraft, setRoasBEDraft] = useState(roasBE || '');
    const [cprBEDraft, setCprBEDraft] = useState(cprBE || '');

    const handleSaveBE = () => {
        const roasVal = parseFloat(roasBEDraft);
        const cprVal = parseFloat(cprBEDraft);
        if (isNaN(roasVal) || roasVal <= 0) {
            setRoasBE(null);
            if (roasBeKey) saveSetting(roasBeKey, null);
        } else {
            setRoasBE(roasVal);
            if (roasBeKey) saveSetting(roasBeKey, roasVal);
        }
        if (isNaN(cprVal) || cprVal <= 0) {
            setCprBE(null);
            if (cprBeKey) saveSetting(cprBeKey, null);
        } else {
            setCprBE(cprVal);
            if (cprBeKey) saveSetting(cprBeKey, cprVal);
        }
        setShowBEInput(false);
    };

    const handleClearBE = () => {
        setRoasBE(null);
        setCprBE(null);
        if (roasBeKey) saveSetting(roasBeKey, null);
        if (cprBeKey) saveSetting(cprBeKey, null);
        setRoasBEDraft('');
        setCprBEDraft('');
        setShowBEInput(false);
    };

    // --- Actions ---
    const fetchData = useCallback((preset, cFrom, cTo) => {
        startTransition(async () => {
            const result = await getMetaData(preset, cFrom, cTo);
            if (result.error) {
                if (result.tokenExpired) {
                    setTokenExpired(true);
                    setConnInfo(null);
                    setData(null);
                }
                toast.error(result.error);
            } else {
                setData(result);
            }
        });
    }, []);

    const handleDateChange = (preset, custom) => {
        setDatePreset(preset);
        const fetchFn = isMeta ? fetchData : fetchGoogleDataWrapper;
        if (custom) {
            setCustomFrom(custom.from);
            setCustomTo(custom.to);
            fetchFn(preset, custom.from, custom.to);
        } else {
            fetchFn(preset);
        }
    };

    const handleConnect = async (token, businessId) => {
        const result = await connectWithToken(token, businessId);
        if (result.error) return result;
        setAdAccounts(result.accounts);
        setConnInfo({ connected: true, business_id: businessId || null, selected_account_id: null });
        return result;
    };

    const handleSelectAccount = async (accountId) => {
        const account = adAccounts.find(a => a.id === accountId);
        await selectAdAccount(accountId, account?.name, account?.currency);
        setConnInfo(prev => ({
            ...prev,
            selected_account_id: accountId,
            selected_account_name: account?.name || accountId,
            selected_account_currency: account?.currency || 'USD',
        }));
        setShowAccountPicker(false);
        setData(null);
        setSelectedMetrics(null);
        toast.success(`Cuenta: ${account?.name || accountId}`);
        startTransition(async () => {
            const result = await getMetaData('30d');
            if (result.error) toast.error(result.error);
            else { setData(result); setDatePreset('30d'); }
        });
    };

    const handleDisconnect = async () => {
        await disconnectMeta();
        setConnInfo(null);
        setAdAccounts([]);
        setData(null);
        toast.success('Meta desconectado');
    };

    // --- Google Actions ---
    const fetchGoogleDataWrapper = useCallback((preset, cFrom, cTo) => {
        startTransition(async () => {
            const result = await getGoogleData(preset, cFrom, cTo);
            if (result.error) {
                if (result.tokenExpired) {
                    setGConnInfo(null);
                    setGData(null);
                }
                toast.error(result.error);
            } else {
                setGData(result);
            }
        });
    }, []);

    const handleGoogleSelectAccount = async (customerId) => {
        const account = gAdAccounts.find(a => a.customerId === customerId);
        await selectGoogleAccount(customerId, account?.descriptiveName, account?.currencyCode);
        setGConnInfo(prev => ({
            ...prev,
            selected_customer_id: customerId,
            selected_customer_name: account?.descriptiveName || customerId,
            selected_customer_currency: account?.currencyCode || 'USD',
        }));
        setShowGAccountPicker(false);
        setGData(null);
        setSelectedMetrics(null);
        toast.success(`Cuenta Google: ${account?.descriptiveName || customerId}`);
        startTransition(async () => {
            const result = await getGoogleData('30d');
            if (result.error) toast.error(result.error);
            else { setGData(result); setDatePreset('30d'); }
        });
    };

    const handleGoogleDisconnect = async () => {
        await disconnectGoogle();
        setGConnInfo(null);
        setGAdAccounts([]);
        setGData(null);
        toast.success('Google desconectado');
    };

    // --- All metrics (static + discovered + custom) ---
    const allMetrics = useMemo(() => {
        const items = [...(activeData?.campaigns || []), ...(activeData?.adSets || []), ...(activeData?.ads || [])];
        const base = isMeta ? getAllMetrics(items) : getAllGoogleMetrics(items);
        // Add custom metrics
        for (const cm of customMetrics) {
            base[cm.id] = { label: cm.name, category: 'Personalizadas', type: cm.format, icon: '🧮' };
        }
        return base;
    }, [activeData, customMetrics, isMeta]);

    // --- Objectives/Types available ---
    const objectives = useMemo(() => {
        if (!activeData?.campaigns) return [];
        const field = isMeta ? 'objective' : 'campaign_type';
        return [...new Set(activeData.campaigns.map(c => c[field]).filter(Boolean))].sort();
    }, [activeData?.campaigns, isMeta]);

    // --- Filtered campaigns ---
    const filteredCampaigns = useMemo(() => {
        if (!activeData?.campaigns) return [];
        const field = isMeta ? 'objective' : 'campaign_type';
        return activeData.campaigns.filter(c => {
            if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
            if (objectiveFilter !== 'ALL' && c[field] !== objectiveFilter) return false;
            if (hideZeroSpend && (c.spend || 0) === 0) return false;
            return true;
        });
    }, [activeData?.campaigns, statusFilter, objectiveFilter, hideZeroSpend, isMeta]);

    const effectiveObjective = useMemo(() => {
        if (objectiveFilter !== 'ALL') return objectiveFilter;
        const field = isMeta ? 'objective' : 'campaign_type';
        const objs = new Set(filteredCampaigns.map(c => c[field]).filter(Boolean));
        if (objs.size === 1) return [...objs][0];
        return 'MIXED';
    }, [objectiveFilter, filteredCampaigns, isMeta]);

    // Top ads columns saved per objective
    const topAdsColsTimerRef = useRef(null);
    const handleSaveTopAdsCols = useCallback((cols) => {
        clearTimeout(topAdsColsTimerRef.current);
        topAdsColsTimerRef.current = setTimeout(() => {
            const key = `top_ads_cols_${effectiveObjective || '_DEFAULT'}`;
            saveSetting(key, cols);
        }, 500);
    }, [effectiveObjective]);

    // --- Active metric keys ---
    const activeMetrics = useMemo(() => {
        if (selectedMetrics) return selectedMetrics;
        const defaults = isMeta ? DEFAULT_METRICS : GOOGLE_DEFAULT_METRICS;
        return defaults[effectiveObjective] || defaults._DEFAULT;
    }, [selectedMetrics, effectiveObjective, isMeta]);

    const MAX_METRICS = 12;
    const handleToggleMetric = (key) => {
        setSelectedMetrics(prev => {
            const current = prev || activeMetrics;
            if (current.includes(key)) {
                const next = current.filter(k => k !== key);
                saveSetting('kpi_metrics', next);
                return next;
            }
            if (current.length >= MAX_METRICS) return current; // limit
            const next = [...current, key];
            saveSetting('kpi_metrics', next);
            return next;
        });
    };

    const handleSaveCustomMetric = (cm) => {
        const updated = [...customMetrics, cm];
        setCustomMetrics(updated);
        saveSetting('custom_metrics', updated);
        // Auto-add to KPIs
        setSelectedMetrics(prev => {
            const current = prev || activeMetrics;
            const next = [...current, cm.id];
            saveSetting('kpi_metrics', next);
            return next;
        });
        setShowCustomModal(false);
    };

    const handleDeleteCustomMetric = (cmId) => {
        const updated = customMetrics.filter(cm => cm.id !== cmId);
        setCustomMetrics(updated);
        saveSetting('custom_metrics', updated);
    };

    // --- Filtered adsets/ads ---
    const campaignObjectiveMap = useMemo(() => {
        const map = {};
        for (const c of activeData?.campaigns || []) map[c.id] = isMeta ? c.objective : c.campaign_type;
        return map;
    }, [activeData?.campaigns, isMeta]);

    // Status maps for effective status computation
    const campaignStatusMap = useMemo(() => {
        const map = {};
        for (const c of activeData?.campaigns || []) map[c.id] = c.status;
        return map;
    }, [activeData?.campaigns]);

    const adSetStatusMap = useMemo(() => {
        const map = {};
        for (const a of activeData?.adSets || []) map[a.id] = a.status;
        return map;
    }, [activeData?.adSets]);

    // Effective status: only ACTIVE if the entity AND all parents are ACTIVE
    function effectiveStatus(ownStatus, campaignId, adSetId) {
        if (ownStatus !== 'ACTIVE') return ownStatus;
        if (campaignStatusMap[campaignId] && campaignStatusMap[campaignId] !== 'ACTIVE') return 'PAUSED';
        if (adSetId && adSetStatusMap[adSetId] && adSetStatusMap[adSetId] !== 'ACTIVE') return 'PAUSED';
        return 'ACTIVE';
    }

    const filteredAdSets = useMemo(() => {
        if (!activeData?.adSets) return [];
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        return activeData.adSets
            .filter(a => campaignIds.has(a.campaign_id))
            .map(a => {
                const base = isMeta ? recomputeResults(a, campaignObjectiveMap[a.campaign_id]) : a;
                return { ...base, status: effectiveStatus(a.status, a.campaign_id, null) };
            })
            .filter(a => statusFilter === 'ALL' || a.status === statusFilter);
    }, [activeData?.adSets, filteredCampaigns, statusFilter, campaignObjectiveMap, isMeta, campaignStatusMap]);

    const filteredAds = useMemo(() => {
        if (!activeData?.ads) return [];
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        return activeData.ads
            .filter(a => campaignIds.has(a.campaign_id))
            .map(a => {
                const base = isMeta ? recomputeResults(a, campaignObjectiveMap[a.campaign_id]) : a;
                return { ...base, status: effectiveStatus(a.status, a.campaign_id, a.adset_id) };
            })
            .filter(a => statusFilter === 'ALL' || a.status === statusFilter);
    }, [activeData?.ads, filteredCampaigns, statusFilter, campaignObjectiveMap, isMeta, campaignStatusMap, adSetStatusMap]);

    // --- Aggregate KPIs ---
    const kpiData = useMemo(() => {
        if (!filteredCampaigns.length) return null;

        // All ratio/computed metrics that must NOT be summed
        const SKIP_KEYS = new Set([
            'ctr', 'cpc', 'cpm', 'cpp', 'cost_per_result', 'cost_per_unique_click',
            'cost_per_inline_link_click', 'inline_link_click_ctr', 'frequency', 'roas',
            'ticket_promedio', 'cost_per_unique_inline_link_click', 'unique_inline_link_click_ctr',
            'cost_per_outbound_click', 'outbound_clicks_ctr',
            'cost_per_landing_page_view', 'cost_per_view_content', 'cost_per_add_to_cart', 'cost_per_initiate_checkout',
            'pct_visitas', 'pct_ver_contenido', 'pct_carritos', 'pct_checkout', 'pct_compras', 'pct_compras_landing',
            'pct_mensajes', 'tasa_conversion_leads', 'tasa_conversion_leads_web',
            'hook_rate', 'video_avg_time',
        ]);

        const agg = {};
        for (const c of filteredCampaigns) {
            for (const [key, val] of Object.entries(c)) {
                if (typeof val !== 'number') continue;
                if (SKIP_KEYS.has(key)) continue;
                if (key.startsWith('cost_per_action_type_') || key.startsWith('cost_per_unique_action_type_')) continue;
                if (key.startsWith('cost_per_outbound_click_') || key.startsWith('outbound_clicks_ctr_')) continue;
                if (key.startsWith('video_avg_time_')) continue;
                agg[key] = (agg[key] || 0) + val;
            }
        }

        const s = agg.spend || 0;

        // Standard ratios
        if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
        if (agg.clicks > 0) agg.cpc = s / agg.clicks;
        if (agg.results > 0) agg.cost_per_result = s / agg.results;
        if (agg.revenue > 0 && s > 0) agg.roas = agg.revenue / s;
        if (agg.impressions > 0) agg.cpm = (s / agg.impressions) * 1000;
        if (agg.reach > 0) { agg.frequency = agg.impressions / agg.reach; agg.cpp = (s / agg.reach) * 1000; }
        if (agg.unique_clicks > 0) agg.cost_per_unique_click = s / agg.unique_clicks;
        if (agg.inline_link_clicks > 0) {
            agg.cost_per_inline_link_click = s / agg.inline_link_clicks;
            if (agg.impressions > 0) agg.inline_link_click_ctr = (agg.inline_link_clicks / agg.impressions) * 100;
        }
        if (agg.unique_inline_link_clicks > 0) {
            agg.cost_per_unique_inline_link_click = s / agg.unique_inline_link_clicks;
            if (agg.impressions > 0) agg.unique_inline_link_click_ctr = (agg.unique_inline_link_clicks / agg.impressions) * 100;
        }

        // Outbound clicks
        if (agg.outbound_clicks > 0) {
            agg.cost_per_outbound_click = s / agg.outbound_clicks;
            if (agg.impressions > 0) agg.outbound_clicks_ctr = (agg.outbound_clicks / agg.impressions) * 100;
        }

        // Funnel per-step costs
        if (agg.landing_page_views > 0) agg.cost_per_landing_page_view = s / agg.landing_page_views;
        if (agg.view_content > 0) agg.cost_per_view_content = s / agg.view_content;
        if (agg.add_to_cart > 0) agg.cost_per_add_to_cart = s / agg.add_to_cart;
        if (agg.initiate_checkout > 0) agg.cost_per_initiate_checkout = s / agg.initiate_checkout;

        // Funnel conversion percentages
        if (agg.outbound_clicks > 0) agg.pct_visitas = (agg.landing_page_views / agg.outbound_clicks) * 100;
        if (agg.landing_page_views > 0) agg.pct_ver_contenido = ((agg.view_content || 0) / agg.landing_page_views) * 100;
        if (agg.view_content > 0) agg.pct_carritos = ((agg.add_to_cart || 0) / agg.view_content) * 100;
        if (agg.add_to_cart > 0) agg.pct_checkout = ((agg.initiate_checkout || 0) / agg.add_to_cart) * 100;
        const purchases = agg.actions_purchase || agg['actions_offsite_conversion.fb_pixel_purchase'] || 0;
        if (agg.initiate_checkout > 0) agg.pct_compras = (purchases / agg.initiate_checkout) * 100;
        if (agg.landing_page_views > 0) agg.pct_compras_landing = (purchases / agg.landing_page_views) * 100;

        // Messages/Leads conversion rates
        const messages = agg.actions_messaging_conversation_started_7d || agg['actions_onsite_conversion.messaging_conversation_started_7d'] || 0;
        const leads = agg.actions_lead || agg['actions_onsite_conversion.lead_grouped'] || agg['actions_offsite_conversion.fb_pixel_lead'] || 0;
        if (agg.unique_inline_link_clicks > 0) {
            agg.pct_mensajes = (messages / agg.unique_inline_link_clicks) * 100;
            agg.tasa_conversion_leads = (leads / agg.unique_inline_link_clicks) * 100;
        }
        if (agg.landing_page_views > 0) agg.tasa_conversion_leads_web = (leads / agg.landing_page_views) * 100;

        // Video
        const video3s = agg.actions_video_view || agg.video_p25_video_view || 0;
        if (agg.impressions > 0 && video3s > 0) agg.hook_rate = (video3s / agg.impressions) * 100;

        // Ticket Promedio
        const facturacion = agg.action_values_purchase || agg['action_values_offsite_conversion.fb_pixel_purchase'] || 0;
        const purchaseCount = purchases || agg.results || 0;
        if (purchaseCount > 0 && facturacion > 0) agg.ticket_promedio = facturacion / purchaseCount;

        // Recompute cost_per_action_type
        for (const key of Object.keys(agg)) {
            if (key.startsWith('actions_') && agg[key] > 0) {
                agg[`cost_per_action_type_${key.slice(8)}`] = s / agg[key];
            }
            if (key.startsWith('unique_actions_') && agg[key] > 0) {
                agg[`cost_per_unique_action_type_${key.slice(15)}`] = s / agg[key];
            }
        }

        // Custom user metrics
        for (const cm of customMetrics) {
            const a = agg[cm.metricA] || 0;
            const b = agg[cm.metricB] || 0;
            if (b === 0 && cm.operator === '/') continue;
            switch (cm.operator) {
                case '/': agg[cm.id] = a / b; break;
                case '*': agg[cm.id] = a * b; break;
                case '+': agg[cm.id] = a + b; break;
                case '-': agg[cm.id] = a - b; break;
            }
        }

        return agg;
    }, [filteredCampaigns, customMetrics]);

    // --- Filter insights by campaign IDs (so chart matches objective filter) ---
    const filteredInsights = useMemo(() => {
        if (!activeData?.insights) return [];
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        const byDate = {};
        for (const row of activeData.insights) {
            if (row.campaign_id && !campaignIds.has(row.campaign_id)) continue;
            const d = row.date;
            if (!byDate[d]) byDate[d] = { date: d };
            for (const [key, val] of Object.entries(row)) {
                if (key === 'date' || key === 'campaign_id' || typeof val !== 'number') continue;
                byDate[d][key] = (byDate[d][key] || 0) + val;
            }
        }
        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    }, [activeData?.insights, filteredCampaigns]);

    const filteredPrevInsights = useMemo(() => {
        if (!activeData?.previousInsights) return [];
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        const byDate = {};
        for (const row of activeData.previousInsights) {
            if (row.campaign_id && !campaignIds.has(row.campaign_id)) continue;
            const d = row.date;
            if (!byDate[d]) byDate[d] = { date: d };
            for (const [key, val] of Object.entries(row)) {
                if (key === 'date' || key === 'campaign_id' || typeof val !== 'number') continue;
                byDate[d][key] = (byDate[d][key] || 0) + val;
            }
        }
        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    }, [activeData?.previousInsights, filteredCampaigns]);

    // --- Filter region data by campaign IDs ---
    const filteredRegionData = useMemo(() => {
        if (!activeData?.regionInsights) return [];
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        const byRegion = {};
        for (const row of activeData.regionInsights) {
            if (row.campaign_id && !campaignIds.has(row.campaign_id)) continue;
            const r = row.region;
            if (!byRegion[r]) byRegion[r] = { region: r, spend: 0, impressions: 0, clicks: 0, reach: 0 };
            byRegion[r].spend += row.spend || 0;
            byRegion[r].impressions += row.impressions || 0;
            byRegion[r].clicks += row.clicks || 0;
            byRegion[r].reach += row.reach || 0;
        }
        return Object.values(byRegion).sort((a, b) => b.spend - a.spend);
    }, [activeData?.regionInsights, filteredCampaigns]);

    // ========================
    // PLATFORM TOGGLE (shown in connect and dashboard screens)
    // ========================
    const PlatformToggle = () => (
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
            <button
                onClick={() => handlePlatformSwitch('meta')}
                className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5',
                    platform === 'meta' ? 'bg-[#1877F2] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Meta
            </button>
            <div className="relative">
                <button
                    disabled
                    className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 text-[var(--text-tertiary)] opacity-50 cursor-not-allowed"
                >
                    <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
                    Google
                </button>
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning)] text-[8px] font-bold uppercase tracking-wide leading-none">Pronto</span>
            </div>
        </div>
    );

    // ========================
    // NOT CONNECTED
    // ========================
    if (!isConnected || !hasSelectedAccount) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Token expired warning (Meta) */}
                    {isMeta && tokenExpired && (
                        <div className="mb-4 p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning)]/30 flex items-start gap-3">
                            <AlertTriangle size={20} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Token expirado</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Tu token de Meta expiro. Genera uno nuevo y conectalo.</p>
                            </div>
                        </div>
                    )}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-primary)] text-white mb-4">
                            <BarChart3 size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fomo Ads Metrics</h1>
                        <p className="text-[var(--text-secondary)] mt-2 mb-4">
                            {isMeta
                                ? (isConnected ? `${adAccounts.length} cuentas disponibles — elige una` : 'Conecta tu token de Meta Ads')
                                : (isConnected ? `${gAdAccounts.length} cuentas disponibles — elige una` : 'Conecta tu cuenta de Google Ads')
                            }
                        </p>
                        <div className="flex justify-center mb-6">
                            <PlatformToggle />
                        </div>
                    </div>
                    {isMeta ? (
                        <ConnectForm onConnect={handleConnect} onSelectAccount={handleSelectAccount} />
                    ) : (
                        <GoogleConnectForm
                            onAuthUrl={getGoogleAuthUrl}
                            onSelectAccount={handleGoogleSelectAccount}
                            onFetchAccounts={fetchGoogleAccountList}
                            accounts={gAdAccounts}
                            isConnected={!!gConnInfo?.connected}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ========================
    // ONE-PAGE DASHBOARD
    // ========================
    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border-primary)] px-4 sm:px-6 py-3">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-white">
                            <BarChart3 size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Fomo Ads</h1>
                                <PlatformToggle />
                            </div>
                            <div className="relative">
                                {isMeta ? (
                                    <>
                                        <button
                                            onClick={() => setShowAccountPicker(!showAccountPicker)}
                                            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                                        >
                                            <Building2 size={12} />
                                            {connInfo?.selected_account_name || connInfo?.selected_account_id}
                                            <span className="text-[var(--text-tertiary)]">({currency})</span>
                                            <ChevronDown size={12} />
                                        </button>
                                        {showAccountPicker && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowAccountPicker(false)} />
                                                <div className="absolute top-full left-0 mt-2 w-[360px] max-h-[400px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                                                    <div className="p-2 border-b border-[var(--border-primary)]">
                                                        <p className="text-xs font-medium text-[var(--text-tertiary)] px-2 py-1">Cambiar cuenta Meta</p>
                                                    </div>
                                                    <div className="p-1">
                                                        {adAccounts.map(acc => (
                                                            <button
                                                                key={acc.id}
                                                                onClick={() => handleSelectAccount(acc.id)}
                                                                className={cn(
                                                                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-left',
                                                                    acc.id === connInfo?.selected_account_id ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)]'
                                                                )}
                                                            >
                                                                <Building2 size={14} className="flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">{acc.name}</p>
                                                                    <p className="text-xs text-[var(--text-tertiary)]">{acc.id} — {acc.currency}</p>
                                                                </div>
                                                                {acc.id === connInfo?.selected_account_id && <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowGAccountPicker(!showGAccountPicker)}
                                            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                                        >
                                            <Building2 size={12} />
                                            {gConnInfo?.selected_customer_name || gConnInfo?.selected_customer_id}
                                            <span className="text-[var(--text-tertiary)]">({currency})</span>
                                            <ChevronDown size={12} />
                                        </button>
                                        {showGAccountPicker && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowGAccountPicker(false)} />
                                                <div className="absolute top-full left-0 mt-2 w-[360px] max-h-[400px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                                                    <div className="p-2 border-b border-[var(--border-primary)]">
                                                        <p className="text-xs font-medium text-[var(--text-tertiary)] px-2 py-1">Cambiar cuenta Google</p>
                                                    </div>
                                                    <div className="p-1">
                                                        {gAdAccounts.map(acc => (
                                                            <button
                                                                key={acc.customerId}
                                                                onClick={() => handleGoogleSelectAccount(acc.customerId)}
                                                                className={cn(
                                                                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-left',
                                                                    acc.customerId === gConnInfo?.selected_customer_id ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)]'
                                                                )}
                                                            >
                                                                <Building2 size={14} className="flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">{acc.descriptiveName}</p>
                                                                    <p className="text-xs text-[var(--text-tertiary)]">{acc.customerId} — {acc.currencyCode}</p>
                                                                </div>
                                                                {acc.customerId === gConnInfo?.selected_customer_id && <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] hidden sm:block">{userName}</span>
                        <button
                            onClick={() => isMeta ? fetchData(datePreset, customFrom, customTo) : fetchGoogleDataWrapper(datePreset, customFrom, customTo)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer transition-all"
                        >
                            <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                        <button onClick={isMeta ? handleDisconnect : handleGoogleDisconnect} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] border border-[var(--border-secondary)] cursor-pointer transition-all" title={isMeta ? 'Desconectar Meta' : 'Desconectar Google'}>
                            <Unplug size={14} />
                        </button>
                        <a href="/alerts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] transition-all" title="Alertas">
                            <Bell size={14} />
                        </a>
                        {isOwner && (
                            <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] border border-[var(--accent-primary)]/30 transition-all" title="Admin">
                                <Shield size={14} />
                            </a>
                        )}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer transition-all"
                            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        >
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={() => signOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer transition-all" title="Cerrar sesion">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
                {/* Row 1: Date filter + Status/Objective + Metric picker */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <DateFilter datePreset={datePreset} onDateChange={handleDateChange} loading={isPending} />
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-auto">
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="PAUSED">Pausados</option>
                    </select>
                    <select value={objectiveFilter} onChange={e => { setObjectiveFilter(e.target.value); setSelectedMetrics(null); }} className="w-auto">
                        <option value="ALL">{isMeta ? 'Todos los objetivos' : 'Todos los tipos'}</option>
                        {objectives.map(obj => (
                            <option key={obj} value={obj}>
                                {isMeta
                                    ? `${OBJECTIVE_CATEGORIES[obj]?.icon || ''} ${OBJECTIVE_CATEGORIES[obj]?.label || obj}`
                                    : CAMPAIGN_TYPE_LABELS[obj] || obj
                                }
                            </option>
                        ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                        <input type="checkbox" checked={hideZeroSpend} onChange={e => setHideZeroSpend(e.target.checked)} className="rounded" />
                        Ocultar sin inversion
                    </label>
                    {/* Break-Even Settings */}
                    {(() => {
                        const cprLabel = {
                            OUTCOME_SALES: 'Costo por Compra',
                            CONVERSIONS: 'Costo por Compra',
                            MESSAGES: 'Costo por Mensaje',
                            OUTCOME_LEADS: 'Costo por Lead',
                            LEAD_GENERATION: 'Costo por Lead',
                            OUTCOME_TRAFFIC: 'Costo por Clic',
                            LINK_CLICKS: 'Costo por Clic',
                            OUTCOME_ENGAGEMENT: 'Costo por Interaccion',
                            OUTCOME_AWARENESS: 'CPM maximo',
                            REACH: 'CPM maximo',
                        }[effectiveObjective] || 'Costo por Resultado';
                        const cprShort = {
                            OUTCOME_SALES: 'CPA',
                            CONVERSIONS: 'CPA',
                            MESSAGES: 'CPM',
                            OUTCOME_LEADS: 'CPL',
                            LEAD_GENERATION: 'CPL',
                        }[effectiveObjective] || 'CPR';
                        return (
                    <div className="relative">
                        <button
                            onClick={() => { setShowBEInput(!showBEInput); setRoasBEDraft(roasBE || ''); setCprBEDraft(cprBE || ''); }}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all',
                                (roasBE || cprBE)
                                    ? 'border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                                    : 'border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            )}
                        >
                            {roasBE && cprBE ? `ROAS: ${roasBE}x | ${cprShort}: $${cprBE}` : roasBE ? `ROAS BE: ${roasBE}x` : cprBE ? `${cprShort} BE: $${cprBE}` : 'Break-Even'}
                        </button>
                        {showBEInput && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowBEInput(false)} />
                                <div className="absolute top-full left-0 mt-1 w-[280px] bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50 p-3" style={{ boxShadow: 'var(--shadow-md)' }}>
                                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1">Break-Even de esta cuenta</p>
                                    <p className="text-[10px] text-[var(--text-tertiary)] mb-3">Los anuncios por debajo del BE se marcan en rojo.</p>
                                    <div className="space-y-2 mb-3">
                                        <div>
                                            <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5 block">ROAS Break-Even</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={roasBEDraft}
                                                onChange={e => setRoasBEDraft(e.target.value)}
                                                placeholder="Ej: 2.5"
                                                autoFocus
                                                className="w-full h-8 px-2.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5 block">{cprLabel} BE ({currency})</label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={cprBEDraft}
                                                onChange={e => setCprBEDraft(e.target.value)}
                                                placeholder="Ej: 50000"
                                                className="w-full h-8 px-2.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveBE}
                                            className="flex-1 h-7 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium cursor-pointer transition-opacity hover:opacity-90"
                                        >
                                            Guardar
                                        </button>
                                        {(roasBE || cprBE) && (
                                            <button
                                                onClick={handleClearBE}
                                                className="h-7 px-2 rounded-lg border border-[var(--border-secondary)] text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-hover)]"
                                            >
                                                Borrar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                        );
                    })()}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowCustomModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
                        >
                            <Calculator size={14} />
                            Crear metrica
                        </button>
                        <MetricPicker allMetrics={allMetrics} selectedKeys={activeMetrics} onToggle={handleToggleMetric} />
                    </div>
                </div>

                {/* Loading */}
                {isPending && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                            <RefreshCw size={20} className="animate-spin" />
                            <span className="text-sm">Cargando datos...</span>
                        </div>
                    </div>
                )}

                {!isPending && activeData && (
                    <>
                        {/* KPIs */}
                        <KPICards kpiData={kpiData} selectedMetrics={activeMetrics} allMetrics={allMetrics} currency={currency} />

                        {/* Trend chart — filtered by objective */}
                        <section>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Tendencia</h2>
                            <InsightsChart
                                insights={filteredInsights}
                                previousInsights={filteredPrevInsights}
                                allMetrics={allMetrics}
                                currency={currency}
                                dateRange={activeData.dateRange}
                                prevDateRange={activeData.prevDateRange}
                                objective={effectiveObjective}
                            />
                        </section>

                        {/* Pie chart + Funnel */}
                        {(() => {
                            const showFunnel = effectiveObjective === 'OUTCOME_SALES' || effectiveObjective === 'CONVERSIONS';
                            return (
                                <div className={showFunnel ? 'grid grid-cols-1 lg:grid-cols-2 gap-5' : ''}>
                                    <RegionPieChart regionData={filteredRegionData} currency={currency} />
                                    {showFunnel && <FunnelChart kpiData={kpiData} currency={currency} />}
                                </div>
                            );
                        })()}

                        {/* Unified Ads Manager table */}
                        <AdsTable
                            campaigns={filteredCampaigns}
                            adSets={filteredAdSets}
                            ads={filteredAds}
                            metricKeys={tableMetrics || activeMetrics}
                            allMetrics={allMetrics}
                            currency={currency}
                            onMetricsChange={updateTableMetrics}
                        />

                        {/* Sales tracker */}
                        <section>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Rendimiento de Anuncios</h2>
                            <SalesTracker
                                ads={filteredAds}
                                campaigns={filteredCampaigns}
                                objective={effectiveObjective}
                                currency={currency}
                                datePreset={datePreset}
                                dateRange={activeData?.dateRange}
                                roasBE={roasBE}
                                cprBE={cprBE}
                                savedTopAdsCols={userSettings[`top_ads_cols_${effectiveObjective || '_DEFAULT'}`]}
                                onSaveTopAdsCols={handleSaveTopAdsCols}
                            />
                        </section>
                    </>
                )}

                {/* Empty */}
                {!isPending && !activeData && hasSelectedAccount && (
                    <div className="text-center py-16">
                        <BarChart3 size={48} className="mx-auto text-[var(--text-tertiary)] mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Sin datos</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Clickea "Actualizar" para cargar los datos.</p>
                    </div>
                )}
            </main>

            {/* Custom metric modal */}
            {showCustomModal && (
                <CustomMetricModal
                    allMetrics={allMetrics}
                    onSave={handleSaveCustomMetric}
                    onClose={() => setShowCustomModal(false)}
                />
            )}
        </div>
    );
}
