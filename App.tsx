
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AddMistakeForm } from './components/AddMistakeForm';
import { Settings } from './components/Settings';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Login } from './components/Login';
import { Mistake, ViewState, AppSettings, DEFAULT_SETTINGS, Subject, IS_ENV_CONFIGURED } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { Loader2, Trash2, AlertTriangle, CloudOff, HardDrive } from 'lucide-react';
import { analyzeMistakeWithGemini } from './services/geminiService';
import { translations } from './utils/translations';
import { getSupabaseClient } from './services/supabaseClient';

const STORAGE_KEY_SETTINGS = 'mistake-notebook-settings';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const sanitizeAndMergeSettings = (jsonString: string | null): AppSettings => {
    let parsed: any = {};
    if (jsonString) {
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }

    // Merge logic: Default -> Parsed from Storage -> Env overrides
    const merged: AppSettings = { 
        ...DEFAULT_SETTINGS, 
        ...parsed,
        supabaseConfig: { ...DEFAULT_SETTINGS.supabaseConfig, ...parsed.supabaseConfig },
    };

    // Env Var Enforcement/Fill
    if (IS_ENV_CONFIGURED.username) merged.username = DEFAULT_SETTINGS.username;
    
    // IMPORTANT: If Env vars for Supabase are present, FORCE enable Supabase.
    // This overrides any "Switch to Local" preference the user might have saved previously,
    // because deploying with Env vars implies intent to use the Cloud DB.
    if (IS_ENV_CONFIGURED.supabaseUrl && IS_ENV_CONFIGURED.supabaseKey) {
        merged.useSupabase = true;
        merged.supabaseConfig.url = DEFAULT_SETTINGS.supabaseConfig.url;
        merged.supabaseConfig.anonKey = DEFAULT_SETTINGS.supabaseConfig.anonKey;
    }
    
    return merged;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [dashboardView, setDashboardView] = useState<'all' | 'semesters' | 'subjects' | 'review'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [trash, setTrash] = useState<Mistake[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackgroundUploading, setIsBackgroundUploading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [editingMistake, setEditingMistake] = useState<Mistake | undefined>(undefined);
  
  // App State
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize Settings Local
  useEffect(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const merged = sanitizeAndMergeSettings(storedSettings);
    setSettings(merged);
    
    // If we have Supabase configured via Env or Storage, we can consider welcome "complete" for the purpose of showing Login
    // But if we are in local mode and no settings, we need welcome.
    if (storedSettings || merged.useSupabase) {
        setHasCompletedWelcome(true);
    }
    setIsSettingsLoaded(true);
  }, []);

  // Initialize Auth
  useEffect(() => {
      const initAuth = async () => {
          try {
            const currentSession = await AuthService.getSession();
            setSession(currentSession);
          } catch (e) {
              console.error("Auth check failed", e);
          } finally {
              setAuthLoading(false);
          }
      };

      initAuth();

      const supabase = getSupabaseClient();
      if (supabase) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
              setSession(session);
          });
          return () => subscription.unsubscribe();
      }
  }, []);

  // Sync Logic: Cloud Settings + Mistakes
  useEffect(() => {
    const syncAll = async () => {
        if (!isSettingsLoaded) return;
        
        // 1. If logged in, Try to pull settings from Cloud first (overriding local defaults)
        if (session && settings?.useSupabase) {
            setIsSyncing(true);
            try {
                const cloudSettings = await StorageService.loadSettingsFromCloud(session.user.id);
                if (cloudSettings) {
                    // Merge cloud settings into current settings
                    // IMPORTANT: Keep the connection info (Supabase Config) from local/env, but take preferences (API Key) from cloud
                    setSettings(prev => {
                        if (!prev) return null;
                        const newSettings = { 
                            ...prev, 
                            ...cloudSettings,
                            // Ensure we don't accidentally wipe connection details if cloud JSON didn't have them
                            supabaseConfig: prev.supabaseConfig,
                            useSupabase: true
                        };
                        // Persist merged settings to local storage as cache
                        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
                        return newSettings;
                    });
                }
            } catch (e) {
                console.warn("Failed to sync settings from cloud", e);
            }
        }

        // 2. Fetch Mistakes Data
        if (!session && settings?.useSupabase) return; // Wait for login
        
        setIsSyncing(true);
        setSyncError(null);
        try {
            const data = await StorageService.loadMistakes();
            const trashData = await StorageService.loadTrash();
            setMistakes(data || []);
            setTrash(trashData || []);
        } catch (e: any) {
            console.error("Sync Error:", e);
            setSyncError(e.message || "无法连接到数据源");
        } finally {
            setIsSyncing(false);
        }
    };

    syncAll();
  }, [session, isSettingsLoaded, settings?.useSupabase]);

  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    mistakes.forEach(m => {
        if (m.tags) m.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [mistakes]);

  const handleLogout = async () => {
      await AuthService.signOut();
      setSession(null);
  };

  const handleLoginSuccess = async () => {
      const s = await AuthService.getSession();
      setSession(s);
      // The useEffect [session] will trigger the data refresh
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));

    // Also push to Cloud if logged in
    if (session && newSettings.useSupabase) {
        setIsBackgroundUploading(true);
        try {
            await StorageService.saveSettingsToCloud(session.user.id, newSettings);
        } catch (e) {
            console.error("Failed to save settings to cloud", e);
        } finally {
            setIsBackgroundUploading(false);
        }
    }
  };

  const handleSwitchToLocal = () => {
      if (!settings) return;
      // If Env vars are present, warn user that they are overriding
      if (IS_ENV_CONFIGURED.supabaseUrl) {
          if (!confirm("检测到环境变量配置了云端数据库。切换到本地模式将暂时忽略这些配置。确定吗？")) return;
      }
      
      const newSettings = { ...settings, useSupabase: false };
      handleSaveSettings(newSettings);
      setSyncError(null);
      alert("已切换到本地存储模式。");
  };

  // ... (CRUD handlers same as before)
  const handleSaveMistake = async (newMistakeData: Omit<Mistake, 'id' | 'createdAt'>, id?: string) => {
    if (id) {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const original = mistakes.find(m => m.id === id);
            if (original) {
                const updatedMistake = { ...original, ...newMistakeData };
                setMistakes(prev => prev.map(m => m.id === id ? updatedMistake : m));
                setView('dashboard');
                setEditingMistake(undefined);
                await StorageService.updateMistake(updatedMistake);
            }
        } catch (e: any) {
            alert("保存失败: " + e.message);
            setSyncError(e.message);
        } finally {
            setIsSyncing(false);
        }
        return;
    }

    const tempId = generateId();
    const tempMistake: Mistake = {
        ...newMistakeData,
        id: tempId,
        createdAt: Date.now(),
    };

    setMistakes(prev => [tempMistake, ...prev]);
    setDashboardView('all');
    setView('dashboard');
    setEditingMistake(undefined);

    setIsBackgroundUploading(true);
    setSyncError(null);

    try {
        const finalMistake = await StorageService.addMistake(tempMistake);
        setMistakes(prev => prev.map(m => m.id === tempId ? finalMistake : m));
    } catch (e: any) {
        console.error("Background upload failed:", e);
        setSyncError("后台同步失败，您的错题仅保存在本地内存中，请检查网络。");
    } finally {
        setIsBackgroundUploading(false);
    }
  };

  const handleDeleteMistake = async (id: string) => {
    const target = mistakes.find(m => m.id === id);
    if (!target) return;
    setMistakes(prev => prev.filter(m => m.id !== id));
    setTrash(prev => [{...target, deletedAt: Date.now()}, ...prev]);
    setIsBackgroundUploading(true);
    try {
        await StorageService.moveToTrash(target);
    } catch (e: any) {
        alert("删除同步失败: " + e.message);
    } finally {
        setIsBackgroundUploading(false);
    }
  };

  const handleRestoreMistake = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); e.preventDefault();
    const target = trash.find(m => m.id === id);
    if (!target) return;
    setTrash(prev => prev.filter(m => m.id !== id));
    setMistakes(prev => [{...target, deletedAt: undefined}, ...prev]);
    setIsBackgroundUploading(true);
    try {
        await StorageService.restoreFromTrash(target);
    } catch (e: any) {
        alert("恢复失败: " + e.message);
    } finally {
        setIsBackgroundUploading(false);
    }
  };

  const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); e.preventDefault();
    if (window.confirm("彻底删除后无法恢复，确定吗？")) {
        setTrash(prev => prev.filter(m => m.id !== id));
        setIsBackgroundUploading(true);
        try {
            await StorageService.deletePermanently(id);
        } catch (e: any) {
            alert("操作失败: " + e.message);
        } finally {
            setIsBackgroundUploading(false);
        }
    }
  };

  const handleEmptyTrash = async () => {
      if (window.confirm("确定要清空回收站吗？")) {
          setTrash([]);
          setIsBackgroundUploading(true);
          try {
              await StorageService.emptyTrash();
          } catch (e: any) {
              alert("操作失败: " + e.message);
          } finally {
              setIsBackgroundUploading(false);
          }
      }
  };

  const handleUpdateMistake = async (updatedMistake: Mistake) => {
    setMistakes(prev => prev.map(m => m.id === updatedMistake.id ? updatedMistake : m));
    setIsBackgroundUploading(true);
    try {
        await StorageService.updateMistake(updatedMistake);
    } catch (e: any) {
        alert("更新失败: " + e.message);
    } finally {
        setIsBackgroundUploading(false);
    }
  };

  const handleEditMistake = (mistake: Mistake) => {
      setEditingMistake(mistake);
      setView('add');
  };

  const handleAnalyzeMistake = async (mistake: Mistake) => {
      if (!settings) return;
      const apiKey = settings.geminiApiKey;
      if (!apiKey) throw new Error("请在设置中配置 Gemini API Key 后再进行分析。");
      return analyzeMistakeWithGemini(
          mistake, 
          settings.aiModel, 
          settings.language, 
          { 
              geminiApiKey: apiKey, 
              openRouterApiKey: settings.openRouterApiKey,
              openRouterBaseUrl: settings.openRouterBaseUrl
          }
      );
  };

  // --- Rendering Logic ---

  // Compute the "visual" view state to pass to Layout
  // This helps Mobile nav distinguish between "Mistakes" (Recent) and "Archive" (Semesters)
  const computedLayoutView = useMemo(() => {
    if (view === 'dashboard') {
        if (dashboardView === 'all') return 'dashboard';
        return 'archive';
    }
    return view;
  }, [view, dashboardView]);

  const handleViewChange = (newView: ViewState) => {
      if (newView === 'archive') {
          setView('dashboard');
          setDashboardView('semesters');
          // Optional: Reset selections if navigating to top level archive
          setSelectedSemester(null); 
      } else if (newView === 'dashboard') {
          setView('dashboard');
          setDashboardView('all');
      } else {
          setView(newView);
      }
  };

  if (!isSettingsLoaded || authLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
      );
  }

  const isSupabaseEnabled = settings?.useSupabase;

  if (isSupabaseEnabled && !session) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!isSupabaseEnabled && !hasCompletedWelcome) {
      return (
        <WelcomeScreen 
            onComplete={(s) => { 
                setSettings(s); 
                handleSaveSettings(s);
                setHasCompletedWelcome(true);
            }} 
        />
      );
  }

  if (!settings) return null;

  const currentLanguage = settings.language || 'zh';

  return (
    <Layout currentView={computedLayoutView} onChangeView={handleViewChange} username={settings.username} language={currentLanguage}>
      <div className="relative h-full flex flex-col">
        {/* Loading Indicator for Sync/Upload */}
        {(isSyncing || isBackgroundUploading) && (
           <div className="absolute top-0 right-0 m-4 z-50 animate-in fade-in pointer-events-none">
              <span className="bg-white/90 backdrop-blur text-[10px] px-3 py-1.5 rounded-full border border-blue-100 shadow-sm flex items-center gap-2 text-blue-600 font-bold">
                <Loader2 className="animate-spin" size={10} /> 
                {isSyncing ? "同步配置与数据中..." : "后台上传中..."}
              </span>
           </div>
        )}

        {syncError && settings.useSupabase && (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wider animate-in slide-in-from-top z-[60]">
                <div className="flex items-center gap-2">
                    <CloudOff size={14} className="shrink-0" />
                    <span className="truncate max-w-xl">{syncError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => window.location.reload()} className="bg-white px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                        刷新重试
                    </button>
                    <button onClick={handleSwitchToLocal} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1.5">
                        <HardDrive size={12} />
                        切换到本地模式
                    </button>
                </div>
            </div>
        )}
        
        {view === 'dashboard' && (
          <Dashboard 
            mistakes={mistakes} 
            onAddNew={() => { setEditingMistake(undefined); setView('add'); }}
            onEdit={handleEditMistake}
            onDelete={handleDeleteMistake}
            onUpdateMistake={handleUpdateMistake}
            language={currentLanguage}
            viewState={dashboardView}
            setViewState={setDashboardView}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            onCustomAnalyze={handleAnalyzeMistake}
          />
        )}

        {view === 'trash' && (
           <div className="flex-1 flex flex-col min-h-0 animate-soft">
              {/* Trash UI */}
              <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">回收站</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {settings.useSupabase ? '云端 (Supabase)' : '本地'}回收站（共 {trash.length} 个）
                    </p>
                </div>
                {trash.length > 0 && (
                    <button 
                        onClick={handleEmptyTrash}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs font-bold border border-red-100"
                    >
                        <AlertTriangle size={14} />
                        清空回收站
                    </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32 overflow-y-auto pr-1">
                {trash.map((mistake) => (
                  <div key={mistake.id} className="flex flex-col bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden opacity-80 transition-all duration-300">
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {mistake.imageUrl && <img src={mistake.imageUrl} className="w-full h-full object-cover" alt="Trash" />}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-1 mb-4">
                        {mistake.tags?.map(tag => (
                          <span key={tag} className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button type="button" onClick={(e) => handleRestoreMistake(e, mistake.id)} className="flex-1 py-2 text-[11px] font-bold text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all">恢复</button>
                        <button type="button" onClick={(e) => handlePermanentDelete(e, mistake.id)} className="flex-1 py-2 text-[11px] font-bold text-red-400 bg-white border border-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all">彻底删除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {view === 'add' && (
          <AddMistakeForm 
            initialData={editingMistake}
            onSave={handleSaveMistake} 
            onCancel={() => { setEditingMistake(undefined); setView('dashboard'); }}
            existingTags={existingTags}
          />
        )}
        {view === 'settings' && (
          <Settings settings={settings} onSaveSettings={handleSaveSettings} onLogout={handleLogout} />
        )}
      </div>
    </Layout>
  );
};

export default App;
