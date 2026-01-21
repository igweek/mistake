
import { Mistake, AppSettings, DEFAULT_SETTINGS, IS_ENV_CONFIGURED } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY_MISTAKES = 'mistake-notebook-data';
const LOCAL_STORAGE_KEY_TRASH = 'mistake-notebook-trash';
const SETTINGS_KEY = 'mistake-notebook-settings';

// Helper: Get Settings
const getSettings = (): AppSettings => {
    try {
        const s = localStorage.getItem(SETTINGS_KEY);
        const parsed = s ? JSON.parse(s) : {};
        const merged: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
        
        // Priority to Env Vars if they exist and user hasn't explicitly disabled
        if (IS_ENV_CONFIGURED.supabaseUrl) merged.supabaseConfig.url = DEFAULT_SETTINGS.supabaseConfig.url;
        if (IS_ENV_CONFIGURED.supabaseKey) merged.supabaseConfig.anonKey = DEFAULT_SETTINGS.supabaseConfig.anonKey;
        
        // Auto-enable if env vars exist
        if (IS_ENV_CONFIGURED.supabaseUrl && IS_ENV_CONFIGURED.supabaseKey && parsed.useSupabase !== false) {
            merged.useSupabase = true;
        }

        return merged;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

// Helper: Base64 to Blob
const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
};

// Helper: Upload to Supabase Storage
const uploadImageToSupabase = async (mistakeId: string, base64Image: string): Promise<string> => {
    // If empty or already a URL, return as is
    if (!base64Image || !base64Image.startsWith('data:')) return base64Image || '';

    const supabase = getSupabaseClient();
    if (!supabase) {
        console.warn("Supabase not configured, falling back to base64");
        return base64Image;
    }

    try {
        const blob = await base64ToBlob(base64Image);
        const mimeType = base64Image.split(';')[0].split(':')[1];
        const ext = mimeType.split('/')[1] || 'webp';
        const fileName = `${mistakeId}.${ext}`;

        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('mistake-images')
            .upload(fileName, blob, {
                contentType: mimeType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data } = supabase.storage
            .from('mistake-images')
            .getPublicUrl(fileName);

        // Add timestamp to avoid caching issues on immediate updates
        return `${data.publicUrl}?t=${Date.now()}`;
    } catch (e: any) {
        console.error("Supabase Storage Upload Failed:", e);
        return base64Image;
    }
};

// Helper: Local Storage wrappers
const getLocalMistakes = (): Mistake[] => {
    try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_MISTAKES) || '[]'); } catch { return []; }
};
const saveLocalMistakes = (data: Mistake[]) => localStorage.setItem(LOCAL_STORAGE_KEY_MISTAKES, JSON.stringify(data));
const getLocalTrash = (): Mistake[] => {
    try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_TRASH) || '[]'); } catch { return []; }
};
const saveLocalTrash = (data: Mistake[]) => localStorage.setItem(LOCAL_STORAGE_KEY_TRASH, JSON.stringify(data));

export const StorageService = {
  
  async checkConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
      if (!url || !key) return { success: false, message: "URL 或 Key 为空" };
      try {
          const tempClient = createClient(url, key);
          const { count, error } = await tempClient.from('mistakes').select('*', { count: 'exact', head: true });
          
          if (error) {
              if (error.code === '42P01') return { success: false, message: "表不存在: 请在 Supabase 创建 'mistakes' 表。" };
          }
          return { success: true, message: `连接成功` };
      } catch (e: any) {
          return { success: false, message: `连接失败: ${e.message}` };
      }
  },

  // --- NEW: Sync Settings from Cloud ---
  async loadSettingsFromCloud(userId: string): Promise<Partial<AppSettings> | null> {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      try {
          const { data, error } = await supabase
              .from('user_settings')
              .select('settings')
              .eq('user_id', userId)
              .single();
          
          if (error) {
              // Ignore "row not found" errors, just means first time login or table not created yet
              if (error.code !== 'PGRST116') {
                  console.warn("Error fetching user settings:", error.message);
              }
              return null;
          }
          
          return data?.settings as Partial<AppSettings>;
      } catch (e) {
          console.error("Failed to load settings from cloud", e);
          return null;
      }
  },

  // --- NEW: Sync Settings to Cloud ---
  async saveSettingsToCloud(userId: string, settings: AppSettings): Promise<void> {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
          // We don't want to save sensitive Supabase Config INTO Supabase (circular dependency/security)
          // But we DO want to save Gemini Key, Language, Models, etc.
          const settingsToSave = { ...settings };
          // Optional: clear supabaseConfig from the DB payload if you want to keep connection details local only
          // settingsToSave.supabaseConfig = { url: '', anonKey: '' }; 

          const { error } = await supabase
              .from('user_settings')
              .upsert({
                  user_id: userId,
                  settings: settingsToSave,
                  updated_at: new Date().toISOString()
              });

          if (error) {
               console.error("Error saving settings to cloud:", error.message);
               // If table missing, warn user?
               if (error.code === '42P01') {
                   console.warn("Table 'user_settings' does not exist. Please create it in Supabase.");
               }
          }
      } catch (e) {
          console.error("Failed to save settings to cloud", e);
      }
  },

  async loadMistakes(): Promise<Mistake[]> {
    const settings = getSettings();
    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");
        
        const { data, error } = await supabase
            .from('mistakes')
            .select('*')
            .is('deletedAt', null)
            .order('createdAt', { ascending: false });
            
        if (error) throw error;
        return (data || []) as Mistake[];
    } else {
        return getLocalMistakes();
    }
  },

  async loadTrash(): Promise<Mistake[]> {
    const settings = getSettings();
    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { data, error } = await supabase
            .from('mistakes')
            .select('*')
            .not('deletedAt', 'is', null)
            .order('deletedAt', { ascending: false });
            
        if (error) throw error;
        return (data || []) as Mistake[];
    } else {
        return getLocalTrash();
    }
  },

  async addMistake(mistake: Mistake): Promise<Mistake> {
    const settings = getSettings();
    
    let finalImageUrl = mistake.imageUrl;
    if (settings.useSupabase) {
        finalImageUrl = await uploadImageToSupabase(mistake.id, mistake.imageUrl || '');
    }

    const finalMistake = { ...mistake, imageUrl: finalImageUrl || null };

    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase.from('mistakes').insert([{
            ...finalMistake
        }]);
        if (error) throw error;
    } else {
        const current = getLocalMistakes();
        saveLocalMistakes([finalMistake, ...current]);
    }
    
    return finalMistake;
  },

  async updateMistake(mistake: Mistake): Promise<Mistake> {
    const settings = getSettings();

    let finalImageUrl = mistake.imageUrl;
    if (settings.useSupabase && mistake.imageUrl?.startsWith('data:')) {
        finalImageUrl = await uploadImageToSupabase(mistake.id, mistake.imageUrl);
    }
    
    const finalMistake = { ...mistake, imageUrl: finalImageUrl || null };

    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase
            .from('mistakes')
            .update(finalMistake)
            .eq('id', mistake.id);
            
        if (error) throw error;
    } else {
        const current = getLocalMistakes();
        const index = current.findIndex(m => m.id === mistake.id);
        if (index !== -1) {
            current[index] = finalMistake;
            saveLocalMistakes(current);
        }
    }
    return finalMistake;
  },

  async moveToTrash(mistake: Mistake) {
    const settings = getSettings();
    const deletedAt = Date.now();

    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase
            .from('mistakes')
            .update({ deletedAt })
            .eq('id', mistake.id);
            
        if (error) throw error;
    } else {
        const current = getLocalMistakes();
        const newMain = current.filter(m => m.id !== mistake.id);
        saveLocalMistakes(newMain);

        const trash = getLocalTrash();
        saveLocalTrash([{ ...mistake, deletedAt }, ...trash]);
    }
  },

  async restoreFromTrash(mistake: Mistake) {
    const settings = getSettings();
    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase
            .from('mistakes')
            .update({ deletedAt: null })
            .eq('id', mistake.id);
            
        if (error) throw error;
    } else {
        const trash = getLocalTrash();
        const newTrash = trash.filter(m => m.id !== mistake.id);
        saveLocalTrash(newTrash);

        const current = getLocalMistakes();
        saveLocalMistakes([{ ...mistake, deletedAt: undefined }, ...current]);
    }
  },

  async deletePermanently(id: string) {
    const settings = getSettings();
    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase.from('mistakes').delete().eq('id', id);
        if (error) throw error;
    } else {
        const trash = getLocalTrash();
        const newTrash = trash.filter(m => m.id !== id);
        saveLocalTrash(newTrash);
    }
  },

  async emptyTrash() {
    const settings = getSettings();
    if (settings.useSupabase) {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase 未初始化");

        const { error } = await supabase
            .from('mistakes')
            .delete()
            .not('deletedAt', 'is', null);
            
        if (error) throw error;
    } else {
        saveLocalTrash([]);
    }
  }
};
