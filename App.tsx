
import React, { useState, useEffect } from 'react';
import { CalendarEvent, ViewMode, Theme, Patient, SessionNote, Payment, FinanceTransaction, HealthRecord, AnamnesisRecord } from './types';
import { supabase } from './services/supabase';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [theme, setTheme] = useState<Theme>('light');
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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

  // 1. Monitorar Autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUser(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar Dados Reais
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchData = async () => {
      try {
        const [
          { data: pts, error: errPts }, 
          { data: evts, error: errEvts },
          { data: setts, error: errSetts }
        ] = await Promise.all([
          supabase.from('patients').select('*').order('name'),
          supabase.from('events').select('*'),
          supabase.from('user_settings').select('*').single()
        ]);

        if (errPts) console.error("Erro pacientes:", errPts);
        if (errEvts) console.error("Erro eventos:", errEvts);

        if (pts) setPatients(pts);
        if (evts) setEvents(evts);
        if (setts) {
          setWeightGoal(setts.weight_goal);
          setTheme(setts.theme as Theme);
        }
      } catch (error) {
        console.error("Falha ao carregar dados do Supabase:", error);
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  // 3. Aplicação do Tema
  useEffect(() => {
    document.body.className = '';
    if (theme === 'dark') document.body.classList.add('theme-dark');
    if (theme === 'sand') document.body.classList.add('theme-sand');
  }, [theme]);

  // --- Handlers CRUD com Supabase ---

  const handleAddPatient = async (p: Patient) => {
    const { data, error } = await supabase.from('patients').insert([{ 
      name: p.name,
      email: p.email,
      phone: p.phone,
      status: p.status,
      consultation_value: p.consultationValue,
      user_id: user.id 
    }]).select();

    if (error) {
      setToastMessage("Erro ao salvar paciente.");
      setShowToast(true);
    } else if (data) {
      setPatients([...patients, data[0]]);
      setToastMessage("Paciente cadastrado com sucesso!");
      setShowToast(true);
    }
  };

  const handleAddEvent = async (e: CalendarEvent) => {
    // Tratamento para instâncias recorrentes (strip suffix)
    const realId = e.id.includes('_instance_') ? e.id.split('_instance_')[0] : e.id;

    const eventToSave = { 
      title: e.title,
      start: e.start,
      end: e.end,
      description: e.description,
      color: e.color,
      patient_id: e.patientId,
      user_id: user.id,
      location: e.location,
      recurrence: e.recurrence,
      category_label: e.categoryLabel
    };

    // Check if update or insert based on REAL ID
    const existing = events.find(evt => evt.id === realId);
    
    if (existing) {
        // Update (Ao editar uma ocorrência, atualizamos o evento pai - "Editar Todos")
        const { error } = await supabase.from('events').update(eventToSave).eq('id', realId);
        if (error) {
             setToastMessage("Erro ao atualizar.");
             setShowToast(true);
        } else {
             // Atualiza estado local, mantendo o ID original
             setEvents(events.map(evt => evt.id === realId ? { ...e, id: realId } : evt));
             setToastMessage("Evento atualizado!");
             setShowToast(true);
        }
    } else {
        // Insert
        // Remove ID do insert para deixar o banco gerar ou use o ID se for novo e válido UUID
        const { data, error } = await supabase.from('events').insert([eventToSave]).select();
        if (error) {
          console.error(error);
          setToastMessage("Erro ao agendar.");
          setShowToast(true);
        } else if (data) {
          setEvents([...events, data[0]]);
          setToastMessage("Evento agendado!");
          setShowToast(true);
        }
    }
  };

  const handleDeleteEvent = async (id: string) => {
      if (!id) return;
      
      // Tratamento para instâncias recorrentes
      const realId = id.includes('_instance_') ? id.split('_instance_')[0] : id;
      
      console.log("Tentando excluir evento:", realId);

      if (window.confirm("Excluir este evento? Se for recorrente, todas as repetições serão removidas.")) {
        const { error } = await supabase.from('events').delete().eq('id', realId);
        
        if (error) {
            console.error("Erro ao deletar evento:", error);
            setToastMessage("Erro ao excluir. Verifique o console.");
            setShowToast(true);
        } else {
            // Usa atualização funcional para garantir que o estado não esteja stale
            setEvents(prevEvents => prevEvents.filter(e => e.id !== realId));
            
            // Fecha modal e limpa seleção
            setIsModalOpen(false);
            setSelectedEvent(null);
            
            setToastMessage("Evento excluído.");
            setShowToast(true);
        }
      }
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-transparent font-sans overflow-hidden text-slate-800 relative z-0">
      <div className="hidden md:block shadow-[10px_0_30px_rgba(0,0,0,0.02)] z-20">
        <Sidebar 
          currentView={view} 
          onChangeView={setView} 
          currentTheme={theme} 
          onChangeTheme={async (t) => {
            setTheme(t);
            await supabase.from('user_settings').upsert({ user_id: user.id, theme: t });
          }} 
        />
      </div>

      <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
        {view === 'dashboard' ? (
          <Dashboard 
            events={events} patients={patients} financeTransactions={financeTransactions} payments={payments}
            healthRecords={healthRecords} weightGoal={weightGoal} onAddEvent={handleAddEvent}
            onNavigateToCalendar={() => setView('calendar')} onChangeView={setView}
          />
        ) : view === 'patients' ? (
           <PatientsView 
              patients={patients} events={events} notes={notes} payments={payments} anamnesis={anamnesis}
              onAddPatient={handleAddPatient}
              onUpdatePatient={async (p) => {
                await supabase.from('patients').update(p).eq('id', p.id);
                setPatients(patients.map(item => item.id === p.id ? p : item));
              }}
              onDeletePatient={async (id) => {
                await supabase.from('patients').delete().eq('id', id);
                setPatients(patients.filter(p => p.id !== id));
              }}
              onAddNote={(n) => setNotes([...notes, n])}
              onUpdateNote={(n) => setNotes(notes.map(item => item.id === n.id ? n : item))}
              onDeleteNote={(id) => setNotes(notes.filter(n => n.id !== id))}
              onAddPayment={(pay) => setPayments([...payments, pay])}
              onDeletePayment={(id) => setPayments(payments.filter(p => p.id !== id))}
              onUpdateAnamnesis={() => {}}
              onScheduleAppointment={(id) => { setSelectedDate(new Date()); setIsModalOpen(true); }}
           />
        ) : view === 'calendar' ? (
          <CalendarView 
            events={events} onAddEvent={handleAddEvent}
            onDateClick={(d) => { setSelectedDate(d); setSelectedEvent(null); setIsModalOpen(true); }}
            onEventClick={(e) => { setSelectedEvent(e); setIsModalOpen(true); }}
            onBackToDashboard={() => setView('dashboard')}
            onUpdateEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        ) : view === 'finance' ? (
          <FinanceView 
            transactions={financeTransactions} patientPayments={payments} patients={patients} events={events}
            onAddTransaction={(t) => setFinanceTransactions([...financeTransactions, t])}
            onDeleteTransaction={(id) => setFinanceTransactions(financeTransactions.filter(t => t.id !== id))}
          />
        ) : view === 'health' ? (
          <HealthView 
             records={healthRecords} weightGoal={weightGoal}
             onAddRecord={(r) => setHealthRecords([...healthRecords, r])}
             onDeleteRecord={(id) => setHealthRecords(healthRecords.filter(r => r.id !== id))}
             onUpdateRecord={(r) => setHealthRecords(healthRecords.map(item => item.id === r.id ? r : item))}
             onUpdateGoal={(g) => {
               setWeightGoal(g);
               supabase.from('user_settings').upsert({ user_id: user.id, weight_goal: g });
             }}
          />
        ) : null}
      </main>

      <EventModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={handleAddEvent} 
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        initialDate={selectedDate} initialEvent={selectedEvent} patients={patients}
      />

      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default App;
