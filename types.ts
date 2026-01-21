
export enum Subject {
  MATH = 'Mathematics',
  ENGLISH = 'English',
  CHINESE = 'Chinese',
  SCIENCE = 'Science',
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  OTHER = 'Other'
}

export type Language = 'en' | 'zh';

export interface Mistake {
  id: string;
  subject: Subject;
  semester: string;
  questionText?: string;
  imageUrl?: string;
  aiAnalysis?: string;
  tags?: string[];
  createdAt: number;
  deletedAt?: number;
  user_id?: string;
}

export type ViewState = 'dashboard' | 'add' | 'settings' | 'trash';

export interface SupabaseSettings {
  url: string;
  anonKey: string;
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  is_multimodal?: boolean;
}

export interface AppSettings {
  username: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  openRouterBaseUrl?: string;
  aiModel: string;
  customModels?: AIModel[];
  language: Language;
  useSupabase: boolean;
  supabaseConfig: SupabaseSettings;
  lastSyncTime?: number;
}

const getEnvVar = (base: string): string => {
    // Vite strictly bundles VITE_ prefix. Vercel adds them during build if prefixed correctly.
    // @ts-ignore
    const env = import.meta.env;
    if (env) {
        return env[`VITE_${base}`] || env[`NEXT_PUBLIC_${base}`] || env[base] || '';
    }
    return '';
};

export const IS_ENV_CONFIGURED = {
    username: !!getEnvVar('ADMIN_USERNAME'),
    supabaseUrl: !!getEnvVar('SUPABASE_URL'),
    supabaseKey: !!getEnvVar('SUPABASE_KEY'),
};

export const DEFAULT_SETTINGS: AppSettings = {
  username: getEnvVar('ADMIN_USERNAME') || '学生',
  language: 'zh',
  aiModel: 'gemini-3-flash-preview', 
  geminiApiKey: getEnvVar('GEMINI_API_KEY') || getEnvVar('API_KEY'),
  openRouterApiKey: getEnvVar('OPENROUTER_API_KEY'),
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  useSupabase: !!getEnvVar('SUPABASE_URL'),
  supabaseConfig: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_KEY')
  }
};
