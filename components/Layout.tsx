
import React from 'react';
import { Book, Plus, Settings, Grid, Trash2 } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../utils/translations';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  username?: string;
  language: Language;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, username, language }) => {
  const t = translations[language];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar - Desktop Only */}
      <nav className="hidden md:flex md:w-60 md:h-screen md:sticky md:top-0 p-6 flex-col z-30 flex-shrink-0 border-r border-slate-100 bg-white">
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="mb-12 px-2">
             <div className="flex items-center gap-2.5 mb-1.5">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                  <Book size={18} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-lg text-slate-800 tracking-tight">错题本</span>
             </div>
             <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Archive System</p>
          </div>

          {/* Navigation */}
          <div className="flex-1 space-y-1.5">
             <NavButton 
              active={currentView === 'dashboard'} 
              onClick={() => onChangeView('dashboard')}
              icon={<Grid size={18} />}
              label={t.nav_collection}
            />
            <NavButton 
              active={currentView === 'add'} 
              onClick={() => onChangeView('add')}
              icon={<Plus size={18} />}
              label={t.nav_add_new}
            />
            <NavButton 
              active={currentView === 'trash'} 
              onClick={() => onChangeView('trash')}
              icon={<Trash2 size={18} />}
              label="回收站"
            />
          </div>

          {/* User & Settings */}
          <div className="pt-6 border-t border-slate-50 mt-auto space-y-4">
             {username && (
                 <div className="px-3 py-2">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Learner</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{username}</p>
                 </div>
             )}
             <NavButton 
              active={currentView === 'settings'} 
              onClick={() => onChangeView('settings')}
              icon={<Settings size={18} />}
              label={t.nav_settings}
             />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto w-full ${currentView === 'add' ? 'p-0' : 'p-6 md:p-12 pb-24 md:pb-12'}`}>
        <div className={`${currentView === 'add' ? 'w-full h-full' : 'max-w-6xl mx-auto min-h-full flex flex-col'}`}>
            {children}
        </div>
      </main>

      {/* Mobile Nav - Refined & Minimalist */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-[env(safe-area-inset-bottom,16px)] pt-3 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center">
          <MobileNavButton 
            active={currentView === 'dashboard'} 
            onClick={() => onChangeView('dashboard')} 
            icon={<Grid size={20} />} 
            label="集"
          />
          <MobileNavButton 
            active={currentView === 'trash'} 
            onClick={() => onChangeView('trash')} 
            icon={<Trash2 size={20} />} 
            label="收"
          />
          
          {/* Integrated Plus Button - Less Obtrusive */}
          <button 
            onClick={() => onChangeView('add')} 
            className={`flex flex-col items-center justify-center -mt-8 w-14 h-14 rounded-2xl shadow-xl transition-all active:scale-90 ${currentView === 'add' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}
          >
            <Plus size={28} />
          </button>

          <MobileNavButton 
            active={currentView === 'settings'} 
            onClick={() => onChangeView('settings')} 
            icon={<Settings size={20} />} 
            label="设"
          />
          <div className="w-10"></div> {/* Spacer to balance items if needed, or remove for even spread */}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg w-full transition-all duration-200 text-sm font-semibold
      ${active 
        ? 'bg-blue-50 text-blue-700' 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
  >
    <span className={active ? "text-blue-600" : "text-slate-300"}>{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 p-2 transition-all ${active ? 'text-blue-600' : 'text-slate-300'}`}>
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);
