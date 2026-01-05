
import React, { useState, useMemo } from 'react';
import { CalendarEvent, Patient, FinanceTransaction, Payment, HealthRecord, ViewMode } from '../types';
import { formatDate, formatTime, isSameDay } from '../utils/dateUtils';
import { SparklesIcon, CalendarIcon, LoaderIcon, MapPinIcon, UsersIcon, BanknoteIcon, ActivityIcon, TrendingUpIcon, WalletIcon } from './Icons';
import { parseEventFromText } from '../services/geminiService';

interface DashboardProps {
  events: CalendarEvent[];
  patients: Patient[];
  financeTransactions: FinanceTransaction[];
  payments: Payment[];
  healthRecords: HealthRecord[];
  weightGoal?: number | null;
  onAddEvent: (event: CalendarEvent) => void;
  onNavigateToCalendar: () => void;
  onChangeView: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    events, 
    patients, 
    financeTransactions, 
    payments, 
    healthRecords, 
    weightGoal,
    onAddEvent, 
    onNavigateToCalendar,
    onChangeView
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const today = new Date();
  
  // --- METRICS CALCULATION ---
  
  // 1. Calendar
  const todayEvents = useMemo(() => 
    events
      .filter(e => isSameDay(new Date(e.start), today))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
  [events, today]);

  // 2. Patients
  const activePatientsCount = useMemo(() => patients.filter(p => p.status === 'active').length, [patients]);
  
  // 3. Finance (Current Month)
  const financeMetrics = useMemo(() => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Income from Patients (Payments)
      const monthlyIncomePatients = payments
        .filter(p => {
             const d = new Date(p.date);
             return p.status === 'paid' && d >= startOfMonth && d <= endOfMonth;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

      // Manual Transactions
      const monthlyTransactions = financeTransactions.filter(t => {
          const d = new Date(t.date);
          return d >= startOfMonth && d <= endOfMonth;
      });

      const monthlyIncomeManual = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

      const totalIncome = monthlyIncomePatients + monthlyIncomeManual;
      
      return { income: totalIncome, expense: monthlyExpenses, balance: totalIncome - monthlyExpenses };
  }, [financeTransactions, payments]);

  // 4. Health (Latest Weight)
  const healthMetrics = useMemo(() => {
      const weights = healthRecords
        .filter(r => r.type === 'weight')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
      
      const latest = weights.length > 0 ? weights[0].value : null;
      const previous = weights.length > 1 ? weights[1].value : null;
      
      return { latest, previous };
  }, [healthRecords]);


  // --- HANDLERS ---
  
  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    try {
      const eventData = await parseEventFromText(prompt, new Date().toISOString(), events);
      if (eventData) {
        if (eventData.conflict) {
             const confirmed = window.confirm(eventData.conflictMessage || "Conflito de horário detectado. Deseja agendar mesmo assim?");
             if (!confirmed) {
                 setIsProcessing(false);
                 return;
             }
        }
        onAddEvent({ ...eventData, id: crypto.randomUUID() });
        setPrompt('');
      }
    } catch (error) {
      alert('Erro ao processar com IA. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-500 ring-blue-200',
    green: 'bg-emerald-500 ring-emerald-200',
    red: 'bg-rose-500 ring-rose-200',
    yellow: 'bg-amber-500 ring-amber-200',
    purple: 'bg-violet-500 ring-violet-200',
    gray: 'bg-slate-500 ring-slate-200',
    pink: 'bg-pink-500 ring-pink-200',
    indigo: 'bg-indigo-500 ring-indigo-200',
    cyan: 'bg-cyan-500 ring-cyan-200',
    orange: 'bg-orange-500 ring-orange-200',
    teal: 'bg-teal-500 ring-teal-200',
    lime: 'bg-lime-500 ring-lime-200',
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-10 space-y-10 font-sans text-[var(--text-primary)]">
      
      {/* HEADER SECTION: Greeting & AI */}
      <div className="flex flex-col gap-6 animate-enter">
           <div>
                <h1 className="text-4xl lg:text-5xl font-serif text-[var(--text-primary)] mb-2">
                    {getGreeting()}, <span className="italic text-[var(--text-secondary)]">Doutor(a)</span>.
                </h1>
                <p className="text-[var(--text-secondary)]">Seu painel clínico e pessoal.</p>
           </div>
           
           {/* AI Input - Now Integrated into Header */}
           <div className="relative group w-full max-w-3xl">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                    {isProcessing ? (
                        <LoaderIcon className="w-5 h-5 text-[var(--accent-color)] animate-spin" />
                    ) : (
                        <SparklesIcon className="w-5 h-5 text-[var(--accent-color)]" />
                    )}
                </div>
                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur transition duration-500 ${isProcessing ? 'opacity-30 animate-pulse' : 'group-hover:opacity-20'}`}></div>
                <form onSubmit={handleSmartSubmit} className="relative flex">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Diga à IA para agendar... (ex: Terapia com Ana amanhã 14h)"
                        className="w-full pl-12 pr-32 py-4 bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-2xl shadow-sm border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-bg)] outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                        disabled={isProcessing}
                    />
                    <button 
                        type="submit" 
                        disabled={!prompt || isProcessing}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        Agendar
                    </button>
                </form>
           </div>
      </div>

      <div className="space-y-2 animate-enter delay-100">
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest pl-2">Clínica & Negócios</h2>
        
        {/* CLINICAL METRICS GRID (3 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Today's Events */}
            <div 
                onClick={() => onChangeView('calendar')}
                className="p-6 bg-[var(--bg-glass)] rounded-[2rem] border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--accent-color)] transition-all cursor-pointer group flex flex-col justify-between h-40"
            >
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    {todayEvents.length > 0 && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">HOJE</span>}
                </div>
                <div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{todayEvents.length}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium">Agendamentos</div>
                </div>
            </div>

            {/* 2. Active Patients */}
            <div 
                onClick={() => onChangeView('patients')}
                className="p-6 bg-[var(--bg-glass)] rounded-[2rem] border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--accent-color)] transition-all cursor-pointer group flex flex-col justify-between h-40"
            >
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{activePatientsCount}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium">Pacientes ativos</div>
                </div>
            </div>

            {/* 3. Month Balance */}
            <div 
                onClick={() => onChangeView('finance')}
                className="p-6 bg-[var(--bg-glass)] rounded-[2rem] border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--accent-color)] transition-all cursor-pointer group flex flex-col justify-between h-40"
            >
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <WalletIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">MÊS</span>
                </div>
                <div>
                    <div className={`text-2xl font-bold truncate ${financeMetrics.balance >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}>
                        R$ {financeMetrics.balance.toFixed(0)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium">Caixa Líquido</div>
                </div>
            </div>
        </div>
      </div>

      {/* CLINICAL AGENDA SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-enter delay-200">
          
          {/* LEFT: TODAY'S AGENDA (Detailed) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-serif text-[var(--text-primary)]">Agenda de Hoje</h2>
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest bg-[var(--bg-glass)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                      {formatDate(today)}
                  </span>
              </div>

              <div className="bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-[2.5rem] border border-[var(--border-color)] p-6 lg:p-8 min-h-[400px] shadow-sm">
                  {todayEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] py-12">
                           <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                           <h3 className="text-lg font-bold">Dia Livre</h3>
                           <p className="text-sm">Nenhum compromisso agendado para hoje.</p>
                           <button 
                                onClick={() => onAddEvent({
                                    id: crypto.randomUUID(),
                                    title: '',
                                    start: new Date().toISOString(),
                                    end: new Date(new Date().getTime() + 3600000).toISOString(),
                                    color: 'blue'
                                })}
                                className="mt-4 text-xs font-bold text-[var(--accent-color)] hover:underline"
                           >
                                Adicionar evento manualmente
                           </button>
                      </div>
                  ) : (
                      <div className="space-y-0 relative">
                          {/* Vertical Line */}
                          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[var(--border-color)] rounded-full"></div>
                          
                          {todayEvents.map((evt, idx) => {
                               const styles = colorStyles[evt.color] || colorStyles.blue;
                               const isPast = new Date(evt.end) < new Date();
                               
                               return (
                                   <div key={evt.id} className={`group relative pl-16 py-3 transition-opacity ${isPast ? 'opacity-50 hover:opacity-100' : ''}`}>
                                       {/* Timeline Dot */}
                                       <div className={`absolute left-[21px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[3px] border-[var(--bg-app)] shadow-sm z-10 transition-transform group-hover:scale-125 ${styles.split(' ')[0]}`}></div>
                                       
                                       {/* Time */}
                                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 text-right pr-6">
                                            <span className="text-xs font-bold text-[var(--text-secondary)] block">{formatTime(evt.start)}</span>
                                       </div>

                                       {/* Card */}
                                       <div className="bg-[var(--bg-element)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm group-hover:border-[var(--accent-color)] group-hover:shadow-md transition-all cursor-pointer flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <h3 className={`font-bold text-sm text-[var(--text-primary)] truncate ${isPast ? 'line-through decoration-[var(--text-muted)]' : ''}`}>{evt.title}</h3>
                                                {evt.location && (
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                                                        <MapPinIcon className="w-3 h-3" /> {evt.location}
                                                    </div>
                                                )}
                                            </div>
                                            {evt.categoryLabel && (
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-color)]`}>
                                                    {evt.categoryLabel}
                                                </span>
                                            )}
                                       </div>
                                   </div>
                               )
                          })}
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT: Quick & Finance Widget */}
          <div className="flex flex-col gap-6">
               
               {/* Quick Actions */}
               <div className="grid grid-cols-2 gap-3">
                   <button 
                        onClick={() => { onChangeView('finance'); }} 
                        className="p-4 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-glass-strong)] transition-all text-left group"
                   >
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <BanknoteIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-secondary)]">Lançar Caixa</span>
                   </button>
                   <button 
                        onClick={() => { onChangeView('patients'); }} 
                        className="p-4 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-glass-strong)] transition-all text-left group"
                   >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <UsersIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-secondary)]">Novo Paciente</span>
                   </button>
               </div>

               {/* Finance Widget */}
               <div className="bg-[var(--bg-glass)] backdrop-blur-md p-6 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col gap-4 flex-1">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <TrendingUpIcon className="w-4 h-4 text-emerald-500" /> Fluxo Mensal
                        </h3>
                    </div>
                    
                    {/* Visual Bars */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-[var(--text-muted)]">Receita</span>
                                <span className="font-bold text-emerald-600">R$ {financeMetrics.income.toFixed(0)}</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div> {/* Always full relative to itself, visually just a bar */}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-[var(--text-muted)]">Despesa</span>
                                <span className="font-bold text-rose-500">R$ {financeMetrics.expense.toFixed(0)}</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                                {/* Percentage of income for visual scale */}
                                <div 
                                    className="h-full bg-rose-500 rounded-full" 
                                    style={{ width: `${Math.min((financeMetrics.expense / (financeMetrics.income || 1)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
               </div>

          </div>
      </div>

      {/* PERSONAL/HEALTH SECTION */}
      <div className="border-t border-[var(--border-color)] pt-8 animate-enter delay-300">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest pl-2 mb-6">Pessoal & Saúde</h2>
          
          <div className="flex flex-col md:flex-row gap-6">
              {/* Health Widget (Moved from top) */}
              <div 
                onClick={() => onChangeView('health')}
                className="flex-1 p-6 bg-[var(--bg-glass)] rounded-[2.5rem] border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--accent-color)] transition-all cursor-pointer group flex items-center justify-between"
              >
                  <div className="flex items-center gap-4">
                      <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
                          <ActivityIcon className="w-8 h-8" />
                      </div>
                      <div>
                          <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                              {healthMetrics.latest ? `${healthMetrics.latest} kg` : '--'}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] font-medium">
                              {healthMetrics.previous ? `${(healthMetrics.latest! - healthMetrics.previous).toFixed(1)}kg vs anterior` : 'Último registro de peso'}
                          </div>
                      </div>
                  </div>
                  
                  <div className="text-right">
                       {weightGoal ? (
                           <>
                               <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Meta</div>
                               <div className="text-xl font-bold text-emerald-600">{weightGoal} kg</div>
                           </>
                       ) : (
                           <span className="text-xs font-bold text-[var(--accent-color)] hover:underline">Definir Meta</span>
                       )}
                  </div>
              </div>
              
              {/* Add Entry Button */}
              <button 
                onClick={() => onChangeView('health')}
                className="px-8 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-[2.5rem] hover:bg-[var(--bg-element)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm transition-colors"
              >
                  Ver Histórico Completo
              </button>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
