
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, IS_ENV_CONFIGURED } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    // 1. Try Environment Variables first (Best for Vercel)
    let url = DEFAULT_SETTINGS.supabaseConfig.url;
    let key = DEFAULT_SETTINGS.supabaseConfig.anonKey;

    // 2. Fallback to Local Storage if Env not present
    if (!url || !key) {
        try {
            const stored = localStorage.getItem('mistake-notebook-settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.supabaseConfig?.url && parsed.supabaseConfig?.anonKey) {
                    url = parsed.supabaseConfig.url;
                    key = parsed.supabaseConfig.anonKey;
                }
            }
        } catch (e) {
            console.warn("Error reading settings for Supabase config");
        }
    }

    if (url && key) {
        supabaseInstance = createClient(url, key);
        return supabaseInstance;
    }

    return null;
};
