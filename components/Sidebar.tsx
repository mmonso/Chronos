
import React from 'react';
import { LayoutDashboardIcon, CalendarIcon, SunIcon, MoonIcon, LayersIcon, UsersIcon, PieChartIcon, ActivityIcon } from './Icons';
import { ViewMode, Theme } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  currentTheme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentTheme, onChangeTheme }) => {
  return (
    <div className="w-24 h-screen flex flex-col py-8 items-center shrink-0 z-50 
                    bg-[var(--bg-glass)] backdrop-blur-xl border-r border-[var(--border-color)] shadow-[4px_0_24px_var(--shadow-color)] transition-colors duration-500">
      
      {/* Brand Icon Only */}
      <div className="mb-12 animate-enter">
        <div className="w-12 h-12 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center font-bold text-2xl shadow-lg ring-2 ring-[var(--border-color)]">
            C
        </div>
      </div>

      <nav className="space-y-5 animate-enter delay-100 w-full px-3 flex flex-col items-center">
        <button
          onClick={() => onChangeView('dashboard')}
          title="Dashboard"
          className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-200 group active:scale-95 border ${
            currentView === 'dashboard' 
              ? 'bg-[var(--bg-glass-strong)] text-[var(--accent-color)] shadow-sm ring-1 ring-[var(--border-color)] border-[var(--border-color)]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--accent-color)] border-transparent hover:border-[var(--border-color)]'
          }`}
        >
          <LayoutDashboardIcon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110`} />
        </button>

        <button
          onClick={() => onChangeView('calendar')}
          title="Calendário"
          className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-200 group active:scale-95 border ${
            currentView === 'calendar' 
              ? 'bg-[var(--bg-glass-strong)] text-[var(--accent-color)] shadow-sm ring-1 ring-[var(--border-color)] border-[var(--border-color)]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--accent-color)] border-transparent hover:border-[var(--border-color)]'
          }`}
        >
          <CalendarIcon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110`} />
        </button>

        <button
          onClick={() => onChangeView('patients')}
          title="Pacientes"
          className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-200 group active:scale-95 border ${
            currentView === 'patients' 
              ? 'bg-[var(--bg-glass-strong)] text-[var(--accent-color)] shadow-sm ring-1 ring-[var(--border-color)] border-[var(--border-color)]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--accent-color)] border-transparent hover:border-[var(--border-color)]'
          }`}
        >
          <UsersIcon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110`} />
        </button>

        <button
          onClick={() => onChangeView('finance')}
          title="Financeiro"
          className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-200 group active:scale-95 border ${
            currentView === 'finance' 
              ? 'bg-[var(--bg-glass-strong)] text-[var(--accent-color)] shadow-sm ring-1 ring-[var(--border-color)] border-[var(--border-color)]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--accent-color)] border-transparent hover:border-[var(--border-color)]'
          }`}
        >
          <PieChartIcon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110`} />
        </button>

        <div className="w-10 h-[1px] bg-[var(--border-color)] my-2 opacity-50"></div>

        <button
          onClick={() => onChangeView('health')}
          title="Pessoal / Saúde"
          className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-200 group active:scale-95 border ${
            currentView === 'health' 
              ? 'bg-[var(--bg-glass-strong)] text-[var(--accent-color)] shadow-sm ring-1 ring-[var(--border-color)] border-[var(--border-color)]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--accent-color)] border-transparent hover:border-[var(--border-color)]'
          }`}
        >
          <ActivityIcon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110`} />
        </button>
      </nav>

      {/* Theme Switcher Compact */}
      <div className="mt-auto space-y-4 animate-enter delay-200 flex flex-col items-center">
        <div className="flex flex-col gap-2 p-1.5 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border-color)]">
          <button 
            onClick={() => onChangeTheme('light')}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentTheme === 'light' ? 'bg-[var(--bg-element)] text-amber-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            title="Claro"
          >
            <SunIcon className="w-5 h-5" />
          </button>
          <button 
             onClick={() => onChangeTheme('sand')}
             className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentTheme === 'sand' ? 'bg-[var(--bg-element)] text-orange-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
             title="Areia"
          >
            <LayersIcon className="w-5 h-5" />
          </button>
          <button 
             onClick={() => onChangeTheme('dark')}
             className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentTheme === 'dark' ? 'bg-[var(--bg-element)] text-indigo-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
             title="Escuro"
          >
            <MoonIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
