
import React, { useState, useMemo } from 'react';
import { FinanceTransaction, Payment, Patient, CalendarEvent } from '../types';
import { PlusIcon, TrendingUpIcon, TrendingDownIcon, SearchIcon, TrashIcon, CalendarIcon, BanknoteIcon, UsersIcon, ClockIcon, WalletIcon, CheckIcon, LayersIcon, ArrowDownUpIcon, TargetIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { getRecurringEventsForWeek, addDays, getStartOfWeek, MONTH_NAMES, generateCalendarGrid, isSameDay } from '../utils/dateUtils';

interface FinanceViewProps {
  transactions: FinanceTransaction[];
  patientPayments: Payment[];
  patients: Patient[];
  events?: CalendarEvent[];
  onAddTransaction: (t: FinanceTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const FinanceView: React.FC<FinanceViewProps> = ({ 
    transactions, 
    patientPayments, 
    patients, 
    events = [],
    onAddTransaction, 
    onDeleteTransaction,
}) => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [forecastView, setForecastView] = useState<'by_patient' | 'calendar'>('calendar'); // Changed default to calendar
  const [selectedDay, setSelectedDay] = useState<Date>(new Date()); // For detail view
  
  // Personal Transaction Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  
  // --- CORE LOGIC: REVENUE FORECAST ---
  
  // 1. Determine Date Range for the selected month (Local Time Boundaries)
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  // 2. Expand Recurring Events for this Month
  const monthlyEvents = useMemo(() => {
      let expandedEvents: CalendarEvent[] = [];
      let currentWeekStart = getStartOfWeek(startOfMonth);
      
      // Expand week by week to cover the month
      while (currentWeekStart <= endOfMonth) {
          const weekEvents = getRecurringEventsForWeek(events, currentWeekStart);
          expandedEvents = [...expandedEvents, ...weekEvents];
          currentWeekStart = addDays(currentWeekStart, 7);
      }

      // Filter strict date range and deduplicate
      const seenIds = new Set();
      return expandedEvents.filter(e => {
          const d = new Date(e.start);
          if (seenIds.has(e.id)) return false;
          seenIds.add(e.id);
          return d >= startOfMonth && d <= endOfMonth;
      });
  }, [events, startOfMonth, endOfMonth]);

  // 3. Build Forecast Data per Patient (for the list view)
  const forecastData = useMemo(() => {
      return patients
        .filter(p => p.status === 'active')
        .map(p => {
            const patientEvents = monthlyEvents.filter(e => e.patientId === p.id);
            const sessionCount = patientEvents.length;
            const sessionValue = p.consultationValue || 0;
            const totalValue = sessionCount * sessionValue;

            return {
                id: p.id,
                name: p.name,
                sessionValue,
                sessionCount,
                totalValue
            };
        })
        .filter(data => data.totalValue > 0)
        .filter(data => data.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.totalValue - a.totalValue);
  }, [patients, monthlyEvents, searchTerm]);

  // 4. Calculate Totals
  const totalForecast = forecastData.reduce((acc, item) => acc + item.totalValue, 0);
  
  const totalPaidThisMonth = patientPayments
    .filter(p => {
        const d = new Date(p.date);
        return d >= startOfMonth && d <= endOfMonth && p.status === 'paid';
    })
    .reduce((acc, p) => acc + p.amount, 0);

  const personalExpenses = transactions
    .filter(t => {
        const d = new Date(t.date);
        return d >= startOfMonth && d <= endOfMonth && t.type === 'expense';
    })
    .reduce((acc, t) => acc + t.amount, 0);

  // --- CARRY OVER BALANCE CALCULATION ---
  const previousBalance = useMemo(() => {
      const cutoffTime = startOfMonth.getTime();

      const pastPatientIncome = patientPayments
        .filter(p => p.status === 'paid' && new Date(p.date).getTime() < cutoffTime)
        .reduce((acc, p) => acc + p.amount, 0);

      const pastTransactions = transactions.filter(t => new Date(t.date).getTime() < cutoffTime);
      
      const pastManualIncome = pastTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
        
      const pastManualExpenses = pastTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      return (pastPatientIncome + pastManualIncome) - pastManualExpenses;
  }, [patientPayments, transactions, startOfMonth, currentDate]); // Added currentDate to force recalc on month switch

  const projectedFinalBalance = previousBalance + totalForecast - personalExpenses;

  // --- DAILY RUNNING BALANCE LOGIC ---
  const dailyCashFlow = useMemo(() => {
      const flowMap: Record<string, { revenue: number, expenses: number, balance: number, events: CalendarEvent[], transactions: FinanceTransaction[] }> = {};
      
      // We need to iterate from Day 1 to End of Month
      let iterDate = new Date(startOfMonth);
      let runningBalance = previousBalance;

      while (iterDate <= endOfMonth) {
          const dateKey = iterDate.toDateString(); // Simple key
          
          // 1. Revenue for this specific day (Sessions)
          const dayEvents = monthlyEvents.filter(e => isSameDay(new Date(e.start), iterDate));
          const dayRevenue = dayEvents.reduce((acc, e) => {
              const p = patients.find(pat => pat.id === e.patientId);
              return acc + (p?.consultationValue || 0);
          }, 0);

          // 2. Expenses for this specific day
          const dayTransactions = transactions.filter(t => 
              isSameDay(new Date(t.date), iterDate) && t.type === 'expense'
          );
          const dayExpenses = dayTransactions.reduce((acc, t) => acc + t.amount, 0);

          // 3. Update Running Balance
          runningBalance = runningBalance + dayRevenue - dayExpenses;

          flowMap[dateKey] = {
              revenue: dayRevenue,
              expenses: dayExpenses,
              balance: runningBalance,
              events: dayEvents,
              transactions: dayTransactions
          };

          iterDate.setDate(iterDate.getDate() + 1);
      }
      return flowMap;
  }, [startOfMonth, endOfMonth, previousBalance, monthlyEvents, transactions, patients]);

  // Selected Day Details
  const selectedDayDetails = useMemo(() => {
      const dateKey = selectedDay.toDateString();
      const data = dailyCashFlow[dateKey];
      
      // If date is outside current month, try to compute ad-hoc or return empty
      if (!data) return { revenue: 0, expenses: 0, balance: 0, events: [], transactions: [] };
      return data;
  }, [selectedDay, dailyCashFlow]);


  // --- HANDLERS ---

  const handleMonthChange = (direction: number) => {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
      setCurrentDate(newDate);
      setSelectedDay(newDate); // Reset selection to 1st of new month
  };

  const openForm = () => {
      // Default to SELECTED DAY formatted YYYY-MM-DD
      const localIso = new Date(selectedDay.getTime() - (selectedDay.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
      setTransactionDate(localIso);
      setAmount('');
      setDescription('');
      setCategory('');
      setIsFormOpen(true);
  };

  const handleAddPersonalTransaction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount || !description || !transactionDate) return;
      
      // FIX: Create date at 12:00:00 Local Time
      const parts = transactionDate.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      
      const localDate = new Date(year, month, day, 12, 0, 0);

      onAddTransaction({
          id: crypto.randomUUID(),
          type,
          amount: parseFloat(amount),
          description,
          category: category || 'Geral',
          date: localDate.toISOString() 
      });
      setIsFormOpen(false);
      setAmount('');
      setDescription('');
      setCategory('');
  };

  const calendarGrid = useMemo(() => {
      return generateCalendarGrid(currentDate.getFullYear(), currentDate.getMonth(), []);
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full p-6 lg:p-10 gap-8 animate-enter text-[var(--text-primary)] font-sans overflow-y-auto scrollbar-hide">
        
        {/* HEADER & MONTH CONTROL */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Painel Financeiro</h1>
            
            <div className="flex items-center gap-4 bg-[var(--bg-element)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors text-[var(--text-secondary)]">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="w-40 text-center font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)]">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors text-[var(--text-secondary)]">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* TOP METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 0: Saldo Inicial */}
            <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-[var(--bg-glass)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-[var(--text-secondary)]">
                    <LayersIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Saldo Inicial</span>
                </div>
                <div className={`text-3xl font-serif font-bold ${previousBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}>
                     R$ {previousBalance.toFixed(2)}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
                    Do mês anterior.
                </p>
            </div>

            {/* Card 1: REVENUE FORECAST */}
            <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-[var(--bg-glass-strong)] border border-[var(--border-color)] shadow-lg group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-emerald-500/20"></div>
                <div className="flex items-center gap-3 mb-2 text-emerald-600">
                    <TrendingUpIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Previsão Receita</span>
                </div>
                <div className="text-3xl font-serif font-bold text-[var(--text-primary)]">
                    R$ {totalForecast.toFixed(2)}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
                    {forecastData.reduce((acc, i) => acc + i.sessionCount, 0)} sessões agendadas.
                </p>
            </div>

            {/* Card 2: REALIZED */}
            <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-[var(--bg-glass)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-blue-500">
                    <CheckIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Já Recebido</span>
                </div>
                <div className="text-3xl font-serif font-bold text-[var(--text-secondary)] opacity-80">
                    R$ {totalPaidThisMonth.toFixed(2)}
                </div>
                <div className="w-full bg-[var(--border-color)] h-1 rounded-full mt-4 overflow-hidden">
                    <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((totalPaidThisMonth / (totalForecast || 1)) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Card 3: FINAL PROJECTED BALANCE */}
            <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-[var(--bg-glass)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-indigo-500">
                    <TargetIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Saldo Final (Proj.)</span>
                </div>
                <div className={`text-3xl font-serif font-bold ${projectedFinalBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}>
                    R$ {projectedFinalBalance.toFixed(2)}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
                    Como você terminará o mês.
                </p>
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-col lg:flex-row gap-8 min-h-0 flex-1">
            
            {/* LEFT: CALENDAR / LIST VIEW */}
            <div className="flex-1 bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-[2.5rem] border border-[var(--border-color)] shadow-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 bg-[var(--bg-element)] p-1 rounded-xl border border-[var(--border-color)]">
                         <button 
                            onClick={() => setForecastView('calendar')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${forecastView === 'calendar' ? 'bg-[var(--text-primary)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'}`}
                         >
                             <CalendarIcon className="w-3.5 h-3.5" />
                             Calendário Diário
                         </button>
                         <button 
                            onClick={() => setForecastView('by_patient')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${forecastView === 'by_patient' ? 'bg-[var(--text-primary)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'}`}
                         >
                             <UsersIcon className="w-3.5 h-3.5" />
                             Por Paciente
                         </button>
                    </div>

                    {forecastView === 'calendar' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleMonthChange(-1)} className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-[var(--text-secondary)] w-24 text-center">
                                {MONTH_NAMES[currentDate.getMonth()].slice(0,3)} {currentDate.getFullYear()}
                            </span>
                            <button onClick={() => handleMonthChange(1)} className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {forecastView === 'by_patient' && (
                        <div className="relative group w-full sm:w-48">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <input 
                                type="text" 
                                placeholder="Filtrar..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--bg-element)] pl-9 pr-3 py-2 rounded-xl text-xs border border-[var(--border-color)] outline-none focus:border-[var(--accent-color)] transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                    
                    {/* VIEW: BY PATIENT (Legacy List) */}
                    {forecastView === 'by_patient' && (
                        forecastData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] py-12">
                                <UsersIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p className="font-medium">Nenhum agendamento para este mês.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                                <thead className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 pb-2">Paciente</th>
                                        <th className="px-4 pb-2 text-center">Sessões</th>
                                        <th className="px-4 pb-2 text-right">Valor/Sessão</th>
                                        <th className="px-4 pb-2 text-right">Total Previsto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecastData.map((item) => (
                                        <tr key={item.id} className="bg-[var(--bg-element)] hover:bg-[var(--bg-glass)] transition-colors rounded-2xl group shadow-sm">
                                            <td className="px-4 py-4 rounded-l-2xl font-bold text-[var(--text-primary)]">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="px-2 py-1 rounded-md bg-[var(--accent-bg)] text-[var(--accent-color)] font-bold text-xs">
                                                    {item.sessionCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-[var(--text-secondary)]">
                                                R$ {item.sessionValue.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 rounded-r-2xl text-right font-bold text-emerald-600 font-serif text-base">
                                                R$ {item.totalValue.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    )}

                    {/* VIEW: CALENDAR (Daily Balance) */}
                    {forecastView === 'calendar' && (
                        <div className="h-full flex flex-col">
                            <div className="grid grid-cols-7 mb-2 px-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                                {calendarGrid.map((cell, idx) => {
                                    if (!cell.isCurrentMonth) {
                                        return <div key={idx} className="bg-[var(--bg-app)]/30 rounded-xl"></div>;
                                    }
                                    
                                    const dateKey = cell.date.toDateString();
                                    const flow = dailyCashFlow[dateKey];
                                    const isSelected = isSameDay(cell.date, selectedDay);
                                    
                                    // Visual Helpers
                                    const isNegative = flow?.balance < 0;
                                    const hasExpenses = flow?.expenses > 0;
                                    const hasRevenue = flow?.revenue > 0;

                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedDay(cell.date)}
                                            className={`
                                                relative p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[80px] group
                                                ${isSelected 
                                                    ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--bg-app)] shadow-md ring-2 ring-[var(--accent-bg)] ring-offset-2 ring-offset-[var(--bg-app)]' 
                                                    : 'bg-[var(--bg-element)] border-[var(--border-color)] hover:border-[var(--accent-color)]'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs font-bold ${isSelected ? 'opacity-100' : 'text-[var(--text-secondary)]'}`}>{cell.date.getDate()}</span>
                                                <div className="flex gap-1">
                                                    {hasRevenue && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
                                                    {hasExpenses && <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>}
                                                </div>
                                            </div>

                                            {flow && (
                                                <div className="text-right mt-1">
                                                    <div className={`text-[10px] font-medium ${isSelected ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>Saldo dia</div>
                                                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : (isNegative ? 'text-rose-500' : 'text-emerald-600')}`}>
                                                        {isNegative ? '-' : ''}R$ {Math.abs(flow.balance).toFixed(0)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: SELECTED DAY DETAILS */}
            <div className="w-full lg:w-96 flex flex-col gap-6">
                
                <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[2.5rem] border border-[var(--border-color)] shadow-sm p-6 flex flex-col h-full animate-enter">
                    
                    {/* Header Details */}
                    <div className="flex justify-between items-start mb-6 pb-6 border-b border-[var(--border-color)]">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                Detalhes do Dia
                            </h3>
                            <div className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-1">
                                {selectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </div>
                            <div className={`text-sm font-bold mt-1 ${selectedDayDetails.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                Saldo Acumulado: R$ {selectedDayDetails.balance.toFixed(2)}
                            </div>
                        </div>
                        <button 
                            onClick={openForm}
                            className="p-3 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                            title="Adicionar Conta neste dia"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                        
                        {/* 1. Entradas Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Entradas (Sessões)</span>
                                <span className="text-xs font-bold text-emerald-600">+ R$ {selectedDayDetails.revenue.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2">
                                {selectedDayDetails.events.length === 0 ? (
                                    <div className="text-xs text-[var(--text-muted)] italic pl-2">Nenhuma sessão agendada.</div>
                                ) : (
                                    selectedDayDetails.events.map(e => {
                                        const p = patients.find(pat => pat.id === e.patientId);
                                        return (
                                            <div key={e.id} className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">{e.title}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{new Date(e.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </div>
                                                <div className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                                                    + R$ {p?.consultationValue?.toFixed(0) || '0'}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* 2. Saídas Section */}
                        <div>
                             <div className="flex items-center justify-between mb-2 mt-4">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Saídas (Contas)</span>
                                <span className="text-xs font-bold text-rose-500">- R$ {selectedDayDetails.expenses.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2">
                                {selectedDayDetails.transactions.length === 0 ? (
                                    <div className="text-xs text-[var(--text-muted)] italic pl-2">Nenhuma conta para vencer.</div>
                                ) : (
                                    selectedDayDetails.transactions.map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 group relative">
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-[var(--text-primary)] truncate">{t.description}</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">{t.category}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-bold text-rose-500 whitespace-nowrap">
                                                    - R$ {t.amount.toFixed(2)}
                                                </div>
                                                <button 
                                                    onClick={() => onDeleteTransaction(t.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-rose-300 hover:text-rose-600 transition-opacity"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal Form (Personal Expense) */}
        {isFormOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
                <div className="relative bg-[var(--bg-glass-strong)] w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-[var(--border-color)] animate-enter">
                    <h2 className="text-lg font-bold mb-4 font-serif">Nova Conta / Gasto</h2>
                    <form onSubmit={handleAddPersonalTransaction} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Valor</label>
                            <input 
                                className="w-full text-2xl font-bold bg-transparent border-b border-[var(--border-color)] py-2 outline-none focus:border-rose-500 text-[var(--text-primary)]" 
                                type="number" 
                                step="0.01"
                                placeholder="0,00"
                                required 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Descrição</label>
                            <input 
                                className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 mt-1 outline-none focus:border-[var(--accent-color)]" 
                                placeholder="Ex: Cartão de Crédito"
                                required 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Data de Vencimento</label>
                             <input 
                                 type="date"
                                 className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 mt-1 outline-none focus:border-[var(--accent-color)]"
                                 required
                                 value={transactionDate}
                                 onChange={e => setTransactionDate(e.target.value)}
                             />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Categoria</label>
                            <select 
                                className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 mt-1 outline-none focus:border-[var(--accent-color)]"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                <option value="Moradia">Moradia</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Lazer">Lazer</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-element)]">Cancelar</button>
                            <button type="submit" className="px-6 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-bold hover:opacity-90">Salvar Gasto</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default FinanceView;
