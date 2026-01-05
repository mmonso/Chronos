
import React, { useState, useEffect } from 'react';
import { CalendarEvent, ViewMode, Theme, Patient, SessionNote, Payment, FinanceTransaction, HealthRecord, AnamnesisRecord } from './types';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import PatientsView from './components/PatientsView';
import FinanceView from './components/FinanceView';
import HealthView from './components/HealthView';
import Sidebar from './components/Sidebar';
import EventModal from './components/EventModal';
import Toast from './components/Toast';
import LoginView from './components/LoginView';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('chronos_auth') === 'true';
  });
  const [view, setView] = useState<ViewMode>('dashboard');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('chronos_theme') as Theme) || 'light');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [anamnesis, setAnamnesis] = useState<AnamnesisRecord[]>([]);

  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    document.body.className = '';
    if (theme === 'dark') document.body.classList.add('theme-dark');
    if (theme === 'sand') document.body.classList.add('theme-sand');
    localStorage.setItem('chronos_theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedEvents = localStorage.getItem('chronos_events');
    const savedPatients = localStorage.getItem('chronos_patients');
    const savedNotes = localStorage.getItem('chronos_notes');
    const savedPayments = localStorage.getItem('chronos_payments');
    const savedAnamnesis = localStorage.getItem('chronos_anamnesis');
    const savedFinance = localStorage.getItem('chronos_finance');
    const savedHealth = localStorage.getItem('chronos_health');
    const savedWeightGoal = localStorage.getItem('chronos_weight_goal');

    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
    if (savedAnamnesis) setAnamnesis(JSON.parse(savedAnamnesis));
    if (savedFinance) setFinanceTransactions(JSON.parse(savedFinance));
    if (savedHealth) setHealthRecords(JSON.parse(savedHealth));
    if (savedWeightGoal) setWeightGoal(JSON.parse(savedWeightGoal));
  }, []);

  useEffect(() => localStorage.setItem('chronos_events', JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem('chronos_patients', JSON.stringify(patients)), [patients]);
  useEffect(() => localStorage.setItem('chronos_notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('chronos_payments', JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem('chronos_anamnesis', JSON.stringify(anamnesis)), [anamnesis]);
  useEffect(() => localStorage.setItem('chronos_finance', JSON.stringify(financeTransactions)), [financeTransactions]);
  useEffect(() => localStorage.setItem('chronos_health', JSON.stringify(healthRecords)), [healthRecords]);
  useEffect(() => localStorage.setItem('chronos_weight_goal', JSON.stringify(weightGoal)), [weightGoal]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('chronos_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('chronos_auth');
  };

  const handleUpdateAnamnesis = (record: AnamnesisRecord) => {
    setAnamnesis(prev => {
      const idx = prev.findIndex(a => a.id === record.id || a.patientId === record.patientId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [...prev, record];
    });
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-transparent font-sans overflow-hidden text-slate-800 relative z-0">
      <div className="hidden md:block shadow-[10px_0_30px_rgba(0,0,0,0.02)] z-20">
        <Sidebar currentView={view} onChangeView={setView} currentTheme={theme} onChangeTheme={setTheme} />
      </div>

      <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
        {view === 'dashboard' ? (
          <Dashboard 
            events={events} patients={patients} financeTransactions={financeTransactions} payments={payments}
            healthRecords={healthRecords} weightGoal={weightGoal} onAddEvent={(e) => setEvents([...events, e])}
            onNavigateToCalendar={() => setView('calendar')} onChangeView={setView}
          />
        ) : view === 'patients' ? (
           <PatientsView 
              patients={patients} events={events} notes={notes} payments={payments} anamnesis={anamnesis}
              onAddPatient={(p) => setPatients([...patients, p])}
              onUpdatePatient={(p) => setPatients(patients.map(item => item.id === p.id ? p : item))}
              onDeletePatient={(id) => setPatients(patients.filter(p => p.id !== id))}
              onAddNote={(n) => setNotes([...notes, n])}
              onUpdateNote={(n) => setNotes(notes.map(item => item.id === n.id ? n : item))}
              onDeleteNote={(id) => setNotes(notes.filter(n => n.id !== id))}
              onAddPayment={(pay) => setPayments([...payments, pay])}
              onDeletePayment={(id) => setPayments(payments.filter(p => p.id !== id))}
              onUpdateAnamnesis={handleUpdateAnamnesis}
              onScheduleAppointment={(id) => { setSelectedDate(new Date()); setIsModalOpen(true); }}
           />
        ) : view === 'calendar' ? (
          <CalendarView 
            events={events} onAddEvent={(e) => setEvents([...events, e])}
            onDateClick={(d) => { setSelectedDate(d); setIsModalOpen(true); }}
            onEventClick={(e) => { setSelectedEvent(e); setIsModalOpen(true); }}
            onBackToDashboard={() => setView('dashboard')}
          />
        ) : view === 'finance' ? (
          <FinanceView 
            transactions={financeTransactions}
            patientPayments={payments}
            patients={patients}
            events={events}
            onAddTransaction={(t) => setFinanceTransactions([...financeTransactions, t])}
            onDeleteTransaction={(id) => setFinanceTransactions(financeTransactions.filter(t => t.id !== id))}
          />
        ) : view === 'health' ? (
          <HealthView 
             records={healthRecords}
             weightGoal={weightGoal}
             onAddRecord={(r) => setHealthRecords([...healthRecords, r])}
             onDeleteRecord={(id) => setHealthRecords(healthRecords.filter(r => r.id !== id))}
             onUpdateRecord={(r) => setHealthRecords(healthRecords.map(item => item.id === r.id ? r : item))}
             onUpdateGoal={(g) => setWeightGoal(g)}
          />
        ) : <div className="p-10 flex items-center justify-center h-full text-[var(--text-muted)]">Módulo em desenvolvimento</div>}
      </main>

      <EventModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={(e) => setEvents([...events, e])} initialDate={selectedDate} initialEvent={selectedEvent} patients={patients}
      />

      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default App;
