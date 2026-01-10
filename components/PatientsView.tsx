
import React, { useState, useMemo, useEffect } from 'react';
import { Patient, CalendarEvent, SessionNote, Payment, AnamnesisRecord } from '../types';
import { PlusIcon, SearchIcon, UsersIcon, FileTextIcon, BanknoteIcon, CalendarIcon, ChevronRightIcon, ChevronLeftIcon, XIcon, EditIcon, DownloadIcon, TrashIcon, ClockIcon, SparklesIcon, LoaderIcon, EyeIcon, StethoscopeIcon } from './Icons';
import { formatTime } from '../utils/dateUtils';
import { improveSessionNote } from '../services/geminiService';
import { parse } from 'marked';

interface PatientsViewProps {
  patients: Patient[];
  events: CalendarEvent[];
  notes: SessionNote[];
  payments: Payment[];
  anamnesis: AnamnesisRecord[];
  onAddPatient: (patient: Patient) => void;
  onUpdatePatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onAddNote: (note: SessionNote) => void;
  onUpdateNote: (note: SessionNote) => void;
  onDeleteNote: (noteId: string) => void;
  onAddPayment: (payment: Payment) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdateAnamnesis: (record: AnamnesisRecord) => void;
  onScheduleAppointment: (patientId: string) => void;
}

const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-pink-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const PatientsView: React.FC<PatientsViewProps> = ({ 
    patients, events, notes, payments, anamnesis,
    onAddPatient, onUpdatePatient, onDeletePatient,
    onAddNote, onUpdateNote, onDeleteNote,
    onAddPayment, onDeletePayment, onUpdateAnamnesis,
    onScheduleAppointment 
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'notes' | 'finance' | 'anamnesis'>('profile');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isImprovingNote, setIsImprovingNote] = useState(false);
  const [noteMode, setNoteMode] = useState<'write' | 'preview'>('write');
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'patient' | 'note' | 'payment', id: string } | null>(null);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);
  const patientAnamnesis = useMemo(() => anamnesis.find(a => a.patientId === selectedPatientId), [anamnesis, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  const patientEvents = useMemo(() => events.filter(e => e.patientId === selectedPatientId).sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()), [events, selectedPatientId]);
  const patientNotes = useMemo(() => notes.filter(n => n.patientId === selectedPatientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [notes, selectedPatientId]);
  const patientPayments = useMemo(() => payments.filter(p => p.patientId === selectedPatientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [payments, selectedPatientId]);

  const handleUpdateAnamnesisField = (field: string, value: string) => {
    const record = patientAnamnesis || { id: crypto.randomUUID(), patientId: selectedPatientId!, data: {}, updatedAt: new Date().toISOString() };
    const updatedRecord = {
      ...record,
      data: { ...record.data, [field]: value },
      updatedAt: new Date().toISOString()
    };
    onUpdateAnamnesis(updatedRecord);
  };

  const handleSavePatient = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;
      const newPatient: Patient = {
          id: formData.id || crypto.randomUUID(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status || 'active',
          notes: formData.notes,
          consultationValue: formData.consultationValue ? Number(formData.consultationValue) : undefined
      };
      if (formData.id) onUpdatePatient(newPatient); else onAddPatient(newPatient);
      setIsFormOpen(false);
      setFormData({});
      setSelectedPatientId(newPatient.id);
  };

  const handleOpenNewNoteModal = () => {
      setNoteContent('');
      const now = new Date();
      const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setNoteDate(localIso);
      setEditingNoteId(null);
      setNoteMode('write');
      setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedPatientId || !noteContent.trim() || !noteDate) return;
      const finalDate = new Date(noteDate).toISOString();
      if (editingNoteId) {
          const originalNote = notes.find(n => n.id === editingNoteId);
          if (originalNote) onUpdateNote({ ...originalNote, content: noteContent, date: finalDate });
      } else {
          onAddNote({ id: crypto.randomUUID(), patientId: selectedPatientId, content: noteContent, date: finalDate });
      }
      setIsNoteModalOpen(false);
  };

  return (
    <div className="flex h-full p-4 lg:p-8 gap-6 animate-enter text-[var(--text-primary)] font-sans">
        {/* Patient List Sidebar */}
        <div className={`flex flex-col w-full lg:w-1/3 bg-[var(--bg-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--border-color)] shadow-sm overflow-hidden ${selectedPatientId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 border-b border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-serif font-bold">Pacientes</h2>
                    <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="p-2.5 bg-[var(--accent-color)] text-[var(--bg-app)] rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative group">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <input 
                        type="text" placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--bg-element)] pl-9 pr-3 py-2.5 rounded-xl text-xs border border-[var(--border-color)] outline-none focus:border-[var(--accent-color)] transition-all"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                {filteredPatients.map(patient => (
                    <div 
                        key={patient.id} onClick={() => setSelectedPatientId(patient.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${selectedPatientId === patient.id ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--bg-element)] hover:bg-[var(--bg-glass-strong)] border-[var(--border-color)]'}`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${getAvatarColor(patient.name)} text-white`}>
                            {patient.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{patient.name}</h3>
                            <span className="text-[10px] opacity-70">{patient.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4" />
                    </div>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className={`flex-1 flex flex-col bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-[2.5rem] border border-[var(--border-color)] shadow-lg overflow-hidden relative transition-all ${selectedPatientId ? 'flex' : 'hidden lg:flex'}`}>
            {selectedPatient ? (
                <>
                    <div className="p-6 lg:p-8 border-b border-[var(--border-color)] bg-[var(--bg-glass)] z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div className="flex items-center gap-4">
                             <button onClick={() => setSelectedPatientId(null)} className="lg:hidden p-3 -ml-2 rounded-full hover:bg-[var(--bg-element)] text-[var(--text-muted)]"><ChevronLeftIcon className="w-5 h-5" /></button>
                             <div className={`w-16 h-16 rounded-[1.5rem] ${getAvatarColor(selectedPatient.name)} text-white flex items-center justify-center text-3xl font-serif font-bold shadow-lg`}>
                                 {selectedPatient.name.charAt(0)}
                             </div>
                             <div>
                                 <h1 className="text-2xl font-bold font-serif">{selectedPatient.name}</h1>
                                 <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mt-1">
                                     <span>{selectedPatient.phone || 'Sem telefone'}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => onScheduleAppointment(selectedPatient.id)} className="px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center gap-2">
                                 <CalendarIcon className="w-4 h-4" /> Agendar
                             </button>
                         </div>
                    </div>

                    <div className="flex flex-1 min-h-0 flex-col md:flex-row">
                        <nav className="hidden md:flex flex-col w-[80px] border-r border-[var(--border-color)] bg-[var(--bg-glass)] py-6 gap-3 shrink-0 items-center">
                             <button onClick={() => setActiveTab('profile')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-[var(--accent-color)] text-white shadow-md' : 'text-[var(--text-muted)]'}`} title="Perfil"><UsersIcon className="w-6 h-6" /></button>
                             <button onClick={() => setActiveTab('anamnesis')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'anamnesis' ? 'bg-[var(--accent-color)] text-white shadow-md' : 'text-[var(--text-muted)]'}`} title="Anamnese"><StethoscopeIcon className="w-6 h-6" /></button>
                             <button onClick={() => setActiveTab('notes')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'notes' ? 'bg-[var(--accent-color)] text-white shadow-md' : 'text-[var(--text-muted)]'}`} title="Relatos"><FileTextIcon className="w-6 h-6" /></button>
                             <button onClick={() => setActiveTab('finance')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'finance' ? 'bg-[var(--accent-color)] text-white shadow-md' : 'text-[var(--text-muted)]'}`} title="Financeiro"><BanknoteIcon className="w-6 h-6" /></button>
                        </nav>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[var(--bg-app)]/30 scrollbar-hide">
                            {activeTab === 'profile' && (
                                <div className="space-y-6 animate-enter">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-[2rem] bg-[var(--bg-element)] border border-[var(--border-color)] shadow-sm">
                                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Próximos Agendamentos</h3>
                                            <div className="space-y-3">
                                                {patientEvents.filter(e => new Date(e.start) > new Date()).slice(0, 3).map(evt => (
                                                    <div key={evt.id} className="p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] text-xs">
                                                        <div className="font-bold">{new Date(evt.start).toLocaleDateString('pt-BR')}</div>
                                                        <div className="text-[var(--text-muted)]">{formatTime(evt.start)} - {evt.title}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'anamnesis' && (
                                <div className="max-w-4xl mx-auto space-y-8 animate-enter">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl font-serif font-bold">Ficha de Anamnese</h2>
                                            <p className="text-xs text-[var(--text-muted)]">Histórico clínico e informações de base do paciente.</p>
                                        </div>
                                        {patientAnamnesis && <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Atualizado em: {new Date(patientAnamnesis.updatedAt).toLocaleDateString()}</span>}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                        {[
                                            "Queixa Principal", 
                                            "Histórico Familiar", 
                                            "Saúde e Sono", 
                                            "Medicamentos em Uso", 
                                            "Objetivos da Terapia",
                                            "Observações Gerais"
                                        ].map(field => (
                                            <div key={field} className="space-y-2">
                                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">{field}</label>
                                                <textarea 
                                                    className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-medium outline-none focus:border-[var(--accent-color)] min-h-[120px] shadow-sm transition-all"
                                                    placeholder={`Descreva aqui o ${field.toLowerCase()}...`}
                                                    value={patientAnamnesis?.data[field] || ''}
                                                    onChange={(e) => handleUpdateAnamnesisField(field, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase">Relatos de Sessão</h3>
                                        <button onClick={handleOpenNewNoteModal} className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-xl text-xs font-bold shadow-md">Novo Relato</button>
                                    </div>
                                    <div className="space-y-4">
                                        {patientNotes.map(note => (
                                            <div key={note.id} className="p-6 bg-[var(--bg-element)] border border-[var(--border-color)] rounded-[2rem] shadow-sm">
                                                <div className="flex justify-between mb-4">
                                                    <span className="text-xs font-bold text-[var(--accent-color)]">{new Date(note.date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(note.content) as string }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                             {activeTab === 'finance' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase">Histórico de Pagamentos</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {patientPayments.map(pay => (
                                            <div key={pay.id} className="flex justify-between items-center p-4 bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl">
                                                 <div className="flex flex-col">
                                                     <span className="text-xs font-bold text-[var(--text-primary)]">{pay.description}</span>
                                                     <span className="text-[10px] text-[var(--text-muted)]">{new Date(pay.date).toLocaleDateString()}</span>
                                                 </div>
                                                 <span className="font-bold text-emerald-600">R$ {pay.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                    <UsersIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium">Selecione um paciente</p>
                </div>
            )}
        </div>

        {/* MODAL ADD/EDIT PATIENT */}
        {isFormOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
                <div className="relative bg-[var(--bg-glass-strong)] w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-[var(--border-color)] animate-enter">
                    <h2 className="text-xl font-bold font-serif mb-6 text-[var(--text-primary)]">
                        {formData.id ? 'Editar Paciente' : 'Novo Paciente'}
                    </h2>
                    <form onSubmit={handleSavePatient} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome Completo</label>
                            <input
                                className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] font-medium"
                                placeholder="Ex: João da Silva"
                                required
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Telefone</label>
                                <input
                                    className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] font-medium"
                                    placeholder="(00) 00000-0000"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Valor Sessão</label>
                                <input
                                    type="number"
                                    className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] font-medium"
                                    placeholder="R$ 0,00"
                                    value={formData.consultationValue || ''}
                                    onChange={e => setFormData({...formData, consultationValue: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl p-3 outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] font-medium"
                                placeholder="email@exemplo.com"
                                value={formData.email || ''}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-colors">Cancelar</button>
                            <button type="submit" className="px-6 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-bold hover:opacity-90 shadow-md">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL NOTE */}
        {isNoteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsNoteModalOpen(false)}></div>
                <div className="relative bg-[var(--bg-glass-strong)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 border border-[var(--border-color)] animate-enter flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold font-serif text-[var(--text-primary)]">
                            {editingNoteId ? 'Editar Relato' : 'Novo Relato de Sessão'}
                        </h2>
                         <button 
                            type="button" 
                            onClick={async () => {
                                if (!noteContent) return;
                                setIsImprovingNote(true);
                                const improved = await improveSessionNote(noteContent);
                                setNoteContent(improved);
                                setIsImprovingNote(false);
                            }}
                            disabled={isImprovingNote || !noteContent}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-indigo-200 transition-colors disabled:opacity-50"
                        >
                            {isImprovingNote ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                            Melhorar com IA
                        </button>
                    </div>
                    
                    <form onSubmit={handleSaveNote} className="flex flex-col flex-1 min-h-0 space-y-4">
                         <div className="flex items-center gap-4">
                             <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl px-3 py-2 focus-within:border-[var(--accent-color)]">
                                <ClockIcon className="w-4 h-4 text-[var(--text-muted)] mr-2" />
                                <input 
                                    type="datetime-local"
                                    value={noteDate}
                                    onChange={(e) => setNoteDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-[var(--text-secondary)] outline-none"
                                    required
                                />
                             </div>
                         </div>
                         
                        <textarea
                            className="flex-1 w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl p-5 text-sm leading-relaxed outline-none focus:border-[var(--accent-color)] resize-none font-medium"
                            placeholder="Descreva o que foi abordado na sessão, observações clínicas, etc..."
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            autoFocus
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-colors">Cancelar</button>
                            <button type="submit" className="px-6 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-bold hover:opacity-90 shadow-md">Salvar Relato</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default PatientsView;
