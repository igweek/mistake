
import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS, IS_ENV_CONFIGURED } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { BookOpen, User, ShieldCheck, Database, Key, ArrowRight, Server, AlertTriangle, RefreshCw } from 'lucide-react';
import { translations } from '../utils/translations';
import { StorageService } from '../services/storageService';

interface WelcomeScreenProps {
  onComplete: (settings: AppSettings) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<AppSettings>({ ...DEFAULT_SETTINGS, language: 'zh' });
  const [isLoading, setIsLoading] = useState(false);
  
  // Default to cloud if env vars are present, otherwise local
  const [mode, setMode] = useState<'local' | 'cloud'>(IS_ENV_CONFIGURED.supabaseUrl ? 'cloud' : 'local');
  
  // Manual Override State
  const [showManualInput, setShowManualInput] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SETTINGS.supabaseConfig.url || '');
  const [supabaseKey, setSupabaseKey] = useState(DEFAULT_SETTINGS.supabaseConfig.anonKey || '');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const t = translations.zh;
  const isEnvPreconfigured = !!(IS_ENV_CONFIGURED.supabaseUrl && IS_ENV_CONFIGURED.supabaseKey);

  // If detected, auto-switch to cloud
  useEffect(() => {
      if (isEnvPreconfigured) setMode('cloud');
  }, [isEnvPreconfigured]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocalComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
        alert("请输入学生姓名");
        return;
    }
    setIsLoading(true);
    setTimeout(() => {
        onComplete(formData);
        setIsLoading(false);
    }, 800);
  };

  const handleCloudComplete = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setCloudError(null);
      
      const urlToUse = isEnvPreconfigured ? DEFAULT_SETTINGS.supabaseConfig.url : supabaseUrl;
      const keyToUse = isEnvPreconfigured ? DEFAULT_SETTINGS.supabaseConfig.anonKey : supabaseKey;

      if (!urlToUse || !keyToUse) {
          setCloudError("配置缺失：无法读取 Supabase URL 或 Key");
          return;
      }
      
      let formattedUrl = urlToUse;
      if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

      setIsLoading(true);
      
      // Basic check
      const check = await StorageService.checkConnection(formattedUrl, keyToUse);
      
      if (!check.success && (check.message.includes("Failed to fetch") || check.message.includes("URL"))) {
          setCloudError("连接失败：请检查 URL 是否正确或网络是否通畅。");
          setIsLoading(false);
          return;
      }

      const newSettings = { 
          ...formData, 
          useSupabase: true, 
          supabaseConfig: { url: formattedUrl, anonKey: keyToUse } 
      };

      setTimeout(() => {
        onComplete(newSettings);
        setIsLoading(false);
      }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative animate-soft">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
          <BookOpen size={28} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t.app_title}</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mistake Tracker</span>
        </div>
      </div>

      <Card className="w-full max-w-md p-0 shadow-xl shadow-slate-200/50 border-t-2 border-t-blue-600 overflow-hidden bg-white">
          <div className="flex border-b border-slate-100">
              <button 
                type="button" 
                onClick={() => setMode('local')}
                className={`flex-1 py-4 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${mode === 'local' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                  <User size={14} /> 本地/学生
              </button>
              <button 
                type="button" 
                onClick={() => setMode('cloud')}
                className={`flex-1 py-4 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${mode === 'cloud' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                  <ShieldCheck size={14} /> 管理员/云端
              </button>
          </div>

          <div className="p-8">
              {mode === 'local' ? (
                <form onSubmit={handleLocalComplete} className="space-y-6 animate-in slide-in-from-left duration-300">
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-slate-800">快速开始</h2>
                        <p className="text-xs text-slate-400 mt-1">数据仅存储在当前设备，无需联网</p>
                    </div>
                    
                    <div>
                        <div className="relative">
                            <input
                            type="text"
                            required
                            placeholder="请输入您的姓名"
                            value={formData.username === 'Student' ? '' : formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-1 focus:ring-blue-200 focus:bg-white transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300"
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold" size="lg" isLoading={isLoading}>
                        开始使用
                    </Button>
                </form>
              ) : (
                <div className="animate-in slide-in-from-right duration-300">
                     {isEnvPreconfigured ? (
                         <div className="text-center space-y-6">
                             <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                 <Server size={32} />
                             </div>
                             <div>
                                <h2 className="text-lg font-bold text-slate-800">环境配置就绪</h2>
                                <p className="text-xs text-slate-400 mt-1 px-4">
                                    检测到 Vercel 环境变量。即将连接云端数据库。
                                </p>
                             </div>
                             <Button onClick={() => handleCloudComplete()} className="w-full h-12 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700" size="lg" isLoading={isLoading}>
                                前往登录 <ArrowRight size={16} className="ml-2"/>
                             </Button>
                         </div>
                     ) : (
                        <div className="space-y-6">
                            {!showManualInput ? (
                                <div className="text-center space-y-4">
                                     <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                         <AlertTriangle size={32} />
                                     </div>
                                     <div>
                                        <h2 className="text-lg font-bold text-slate-800">未检测到配置</h2>
                                        <div className="text-xs text-slate-500 mt-2 px-2 text-left bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="mb-2">如果您已在 Vercel 设置环境变量，请检查前缀：</p>
                                            <ul className="list-disc list-inside space-y-1 font-mono text-[10px] text-slate-600">
                                                <li>正确: <span className="text-emerald-600 font-bold">VITE_SUPABASE_URL</span></li>
                                                <li>错误: SUPABASE_URL (浏览器无法读取)</li>
                                            </ul>
                                        </div>
                                     </div>
                                     <Button onClick={() => window.location.reload()} variant="secondary" className="w-full h-10 rounded-xl text-xs font-bold">
                                        <RefreshCw size={14} className="mr-2"/> 已添加 VITE_ 前缀，刷新重试
                                     </Button>
                                     <button onClick={() => setShowManualInput(true)} className="text-[10px] text-blue-500 hover:underline mt-4">
                                        手动输入连接信息 (不推荐)
                                     </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCloudComplete} className="space-y-5 animate-in fade-in">
                                     <div className="text-center mb-2">
                                        <h2 className="text-lg font-bold text-slate-800">手动连接</h2>
                                        <p className="text-[11px] text-slate-400 mt-1">仅用于调试，建议使用环境变量配置</p>
                                     </div>

                                     <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Supabase URL</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={supabaseUrl}
                                                    onChange={(e) => setSupabaseUrl(e.target.value)}
                                                    placeholder="https://xyz.supabase.co"
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-slate-600 focus:ring-1 focus:ring-blue-200 outline-none"
                                                />
                                                <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Anon Key</label>
                                            <div className="relative">
                                                <input 
                                                    type="password"
                                                    required
                                                    value={supabaseKey}
                                                    onChange={(e) => setSupabaseKey(e.target.value)}
                                                    placeholder="your-anon-key"
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-slate-600 focus:ring-1 focus:ring-blue-200 outline-none"
                                                />
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            </div>
                                        </div>
                                     </div>
                                     
                                     {cloudError && <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center">{cloudError}</p>}

                                     <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold" size="lg" isLoading={isLoading}>
                                        保存并连接
                                     </Button>
                                     <button type="button" onClick={() => setShowManualInput(false)} className="w-full text-[10px] text-slate-400">返回</button>
                                </form>
                            )}
                        </div>
                     )}
                </div>
              )}
          </div>
      </Card>
    </div>
  );
};
