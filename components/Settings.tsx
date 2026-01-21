
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Save, CheckCircle, User, LogOut, Database, RefreshCw, ChevronDown, ShieldCheck, Activity, Zap, CloudLightning, Key, Link, ExternalLink, Mail, Lock } from 'lucide-react';
import { AppSettings, AIModel, DEFAULT_SETTINGS, IS_ENV_CONFIGURED } from '../types';
import { fetchOpenRouterModels } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onLogout: () => void;
}

const DEFAULT_GEMINI_MODELS: AIModel[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash', description: '最新预览版 (极速)', is_multimodal: true },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', description: '最新预览版 (强推理)', is_multimodal: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '2.0 系列 (均衡)', is_multimodal: true },
    { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Exp', description: '2.0 系列 (实验)', is_multimodal: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '1.5 经典版 (高智商)', is_multimodal: true },
];

const maskKey = (key?: string) => {
    if (!key || key.length < 8) return '未知/过短';
    return `${key.substring(0, 6)}......${key.substring(key.length - 4)}`;
};

const StatusItem: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    active: boolean; 
    detail?: string;
    apiKeyPreview?: string;
    isError?: boolean;
}> = ({ icon, label, active, detail, apiKeyPreview, isError }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${active ? 'bg-emerald-50/50 border-emerald-100' : (isError ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100 opacity-60')}`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${active ? 'bg-emerald-100 text-emerald-600' : (isError ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-400')}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className={`text-xs font-bold ${active ? 'text-slate-700' : (isError ? 'text-red-500' : 'text-slate-400')}`}>{label}</span>
                <div className="flex flex-col">
                     {detail && <span className="text-[10px] font-mono text-slate-400 mt-0.5">{detail}</span>}
                     {active && apiKeyPreview && (
                         <span className="text-[9px] font-mono text-emerald-600/70 mt-0.5" title="当前加载的 Key (已脱敏)">
                             Key: {maskKey(apiKeyPreview)}
                         </span>
                     )}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-emerald-600' : (isError ? 'text-red-400' : 'text-slate-400')}`}>
                {active ? 'Active' : (isError ? 'Error' : 'Disabled')}
            </span>
            <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : (isError ? 'bg-red-500' : 'bg-slate-300')}`}></div>
        </div>
    </div>
);

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, onLogout }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('加载中...');
  
  useEffect(() => {
    AuthService.getUser().then(u => {
        if (u?.email) setCurrentUserEmail(u.email);
    });
  }, []);

  const [availableModels, setAvailableModels] = useState<AIModel[]>(() => {
      if (settings.customModels && settings.customModels.length > 0) {
          const custom = settings.customModels.filter(m => !m.id.startsWith('gemini'));
          return [...DEFAULT_GEMINI_MODELS, ...custom];
      }
      return DEFAULT_GEMINI_MODELS;
  });

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSupabaseChange = (field: 'url' | 'anonKey', value: string) => {
      if (IS_ENV_CONFIGURED.supabaseUrl) return; // Read-only
      setFormData(prev => ({
          ...prev,
          supabaseConfig: {
              ...prev.supabaseConfig,
              [field]: value
          }
      }));
  };

  const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      try {
          const res = await StorageService.checkConnection(formData.supabaseConfig.url, formData.supabaseConfig.anonKey);
          setTestResult(res);
      } catch (e) {
          setTestResult({ success: false, message: "测试过程发生异常" });
      } finally {
          setIsTesting(false);
      }
  };

  const handleFetchModels = async () => {
      const apiKey = formData.openRouterApiKey; 
      if (!apiKey) {
          alert("未检测到 OpenRouter API Key，无法刷新模型列表。");
          return;
      }
      setIsFetchingModels(true);
      try {
          const models = await fetchOpenRouterModels(apiKey, formData.openRouterBaseUrl);
          const newModels = [...DEFAULT_GEMINI_MODELS, ...models];
          setAvailableModels(newModels);
          setFormData(prev => ({ ...prev, customModels: models }));
          alert(`成功刷新 ${models.length} 个模型`);
      } catch (e: any) {
          alert("刷新失败: " + e.message);
      } finally {
          setIsFetchingModels(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalSettings = { ...formData };
    
    // Auto-complete https
    if (finalSettings.supabaseConfig.url && !finalSettings.supabaseConfig.url.startsWith('http')) {
        finalSettings.supabaseConfig.url = `https://${finalSettings.supabaseConfig.url}`;
    }

    if (finalSettings.useSupabase && (!finalSettings.supabaseConfig.url || !finalSettings.supabaseConfig.anonKey)) {
         alert("无法开启云同步：请完整填写 Supabase URL 和 Key。");
         finalSettings.useSupabase = false;
    }

    const customModelsToSave = availableModels.filter(m => !DEFAULT_GEMINI_MODELS.some(dm => dm.id === m.id));
    finalSettings.customModels = customModelsToSave;
    
    onSaveSettings(finalSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <>
        <div className="max-w-3xl mx-auto pb-32 animate-soft">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">系统设置</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Preferences & Config</p>
                </div>
                <button onClick={onLogout} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 hover:border-slate-300 transition-all">
                    <LogOut size={14} /> 退出登录
                </button>
            </div>
            
            <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* --- 账户信息 --- */}
                <Card className="p-8 border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><User size={24} /></div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">账户信息</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Account Profile</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">登录邮箱</label>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                    <Mail size={14} /> {currentUserEmail}
                                </span>
                                <ShieldCheck size={14} className="text-emerald-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">显示名称</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={formData.username}
                                    onChange={(e) => handleChange('username', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs font-mono font-medium text-slate-600 focus:bg-white focus:ring-1 focus:ring-emerald-200 outline-none"
                                />
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- 存储模式指示器 --- */}
                <Card className="p-6 border-slate-100 overflow-hidden relative">
                    <div className="flex items-center gap-4 mb-4 z-10 relative">
                        <div className={`p-3 rounded-2xl ${formData.useSupabase ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {formData.useSupabase ? <CloudLightning size={24} /> : <Database size={24} />}
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">当前存储: {formData.useSupabase ? "Supabase 云数据库" : "本地存储 (Local)"}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {formData.useSupabase ? "数据实时同步到 Supabase PostgreSQL" : "数据仅保存在当前浏览器中"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-600 flex-1">
                                开启 Supabase 同步
                            </label>
                            <div 
                            onClick={() => {
                                if (IS_ENV_CONFIGURED.supabaseUrl) {
                                    alert("系统检测到环境变量强制启用了云同步，无法关闭。");
                                    return;
                                }
                                setFormData(p => ({ ...p, useSupabase: !p.useSupabase }))
                            }}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.useSupabase ? 'bg-emerald-500' : 'bg-slate-300'} ${IS_ENV_CONFIGURED.supabaseUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.useSupabase ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                    </div>
                </Card>

                {/* --- Supabase 配置 --- */}
                <Card className="p-6 border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><Database size={24} /></div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Supabase 连接配置</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Database & Storage</p>
                            </div>
                        </div>
                        {IS_ENV_CONFIGURED.supabaseUrl && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                <Lock size={10} /> Managed by Env
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Project URL</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={formData.supabaseConfig.url}
                                    onChange={(e) => handleSupabaseChange('url', e.target.value)}
                                    readOnly={!!IS_ENV_CONFIGURED.supabaseUrl}
                                    placeholder="https://xyz.supabase.co"
                                    className={`w-full border rounded-xl py-3 pl-11 pr-4 text-xs font-mono font-medium outline-none focus:ring-1 transition-all ${IS_ENV_CONFIGURED.supabaseUrl ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white focus:ring-emerald-200'}`}
                                />
                                <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anon Public Key</label>
                                {!IS_ENV_CONFIGURED.supabaseUrl && (
                                    <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 flex items-center gap-1 hover:underline">
                                        <ExternalLink size={10} /> 去 Supabase 查找 (Project Settings -&gt; API)
                                    </a>
                                )}
                            </div>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={formData.supabaseConfig.anonKey}
                                    onChange={(e) => handleSupabaseChange('anonKey', e.target.value)}
                                    readOnly={!!IS_ENV_CONFIGURED.supabaseUrl}
                                    placeholder="eyJh..."
                                    className={`w-full border rounded-xl py-3 pl-11 pr-4 text-xs font-mono font-medium outline-none focus:ring-1 transition-all ${IS_ENV_CONFIGURED.supabaseUrl ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white focus:ring-emerald-200'}`}
                                />
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <button 
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting || !formData.supabaseConfig.url}
                                className="w-full py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isTesting ? <RefreshCw className="animate-spin" size={14} /> : <Activity size={14} />}
                                测试连接 (Test Connection)
                            </button>
                            
                            {testResult && (
                                <div className={`p-3 rounded-xl text-[10px] font-bold border ${testResult.success ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                    {testResult.success ? <CheckCircle size={14} className="inline mr-2"/> : <Activity size={14} className="inline mr-2"/>}
                                    {testResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* --- AI Key 配置 --- */}
                <Card className="p-8 border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-amber-50 p-3 rounded-2xl text-amber-500"><Zap size={24} /></div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">AI 密钥配置</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gemini & OpenRouter</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Gemini API Key</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={formData.geminiApiKey}
                                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs font-mono font-medium text-slate-600 focus:bg-white focus:ring-1 focus:ring-amber-200 outline-none"
                                />
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">OpenRouter Key (Optional)</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={formData.openRouterApiKey}
                                    onChange={(e) => handleChange('openRouterApiKey', e.target.value)}
                                    placeholder="sk-or-..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs font-mono font-medium text-slate-600 focus:bg-white focus:ring-1 focus:ring-amber-200 outline-none"
                                />
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatusItem 
                        active={!!formData.supabaseConfig.url && formData.useSupabase} 
                        isError={formData.useSupabase && !formData.supabaseConfig.url}
                        icon={<Database size={18} />} 
                        label="Supabase DB" 
                        detail={formData.supabaseConfig.url ? "已配置" : "未配置"}
                    />
                     <StatusItem 
                        active={!!formData.geminiApiKey} 
                        icon={<Zap size={18} />} 
                        label="Gemini AI" 
                        detail={!!formData.geminiApiKey ? "已配置" : "未配置"}
                        apiKeyPreview={formData.geminiApiKey}
                    />
                </div>

                <Card className="p-8 border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Activity size={24} /></div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">运行时偏好</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Runtime Preferences</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    当前 AI 模型
                                </label>
                                {formData.openRouterApiKey && (
                                    <button 
                                        type="button" 
                                        onClick={handleFetchModels}
                                        disabled={isFetchingModels}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-300 flex items-center gap-1 transition-colors"
                                    >
                                        <RefreshCw size={12} className={isFetchingModels ? 'animate-spin' : ''} /> 刷新列表
                                    </button>
                                )}
                            </div>
                            
                            <div className="relative">
                                <select
                                    value={formData.aiModel}
                                    onChange={(e) => handleChange('aiModel', e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl text-sm py-3.5 pl-4 pr-10 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer shadow-sm"
                                >
                                    <optgroup label="Google Gemini (推荐)">
                                        {DEFAULT_GEMINI_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                    {availableModels.length > DEFAULT_GEMINI_MODELS.length && (
                                        <optgroup label="OpenRouter / Custom">
                                            {availableModels.filter(m => !DEFAULT_GEMINI_MODELS.find(dm => dm.id === m.id)).map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>
                </Card>
            </form>
        </div>

        <div className="fixed bottom-24 md:bottom-10 right-6 md:right-10 z-50 flex items-center gap-4">
            <Button 
                type="submit" 
                form="settings-form"
                size="lg" 
                className="shadow-2xl shadow-emerald-500/30 h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-none transition-transform hover:scale-105 active:scale-95 font-bold tracking-wide"
            >
                {isSaved ? <><CheckCircle size={18} className="mr-2" />已更新</> : <><Save size={18} className="mr-2" />应用更改</>}
            </Button>
        </div>
    </>
  );
};
