
import { getSupabaseClient } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';

export const AuthService = {
    async signUp(email: string, password: string, username?: string) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未配置");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: username || 'User'
                }
            }
        });

        if (error) throw error;
        return data;
    },

    async signIn(email: string, password: string) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未配置");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    async signOut() {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession(): Promise<Session | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    async getUser(): Promise<User | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;
        const { data } = await supabase.auth.getUser();
        return data.user;
    }
};
