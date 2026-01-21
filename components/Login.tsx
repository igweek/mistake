
import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Lock, BookOpen, Eye, EyeOff, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthService } from '../services/authService';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        await AuthService.signIn(email, password);
        onLoginSuccess();
    } catch (e: any) {
        let msg = e.message;
        if (msg === "Invalid login credentials") msg = "账号或密码错误";
        setError(msg || "认证失败，请检查凭证");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-soft">
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
          <BookOpen size={28} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">错题本 AI</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Admin Console</span>
        </div>
      </div>

      <Card className="w-full max-w-md p-8 md:p-10 shadow-xl shadow-slate-200/50 border-t-2 border-t-blue-600 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-full mb-4">
                  <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                  管理员登录
              </h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                  请验证您的身份以管理错题数据
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="管理员邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:ring-1 focus:ring-blue-200 transition-all"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="密码"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className={`w-full bg-slate-50 border ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-100'} rounded-xl py-3.5 pl-11 pr-10 text-sm focus:ring-1 focus:ring-blue-200 focus:bg-white transition-all outline-none font-semibold text-slate-700 placeholder:text-slate-300`}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>}
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-blue-100" size="lg" isLoading={isLoading}>
              安全登录 <ArrowRight size={16} className="ml-2"/>
            </Button>
          </form>
      </Card>
    </div>
  );
};
