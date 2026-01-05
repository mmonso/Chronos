
import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, Patient } from '../types';
import { XIcon, ClockIcon, MapPinIcon, SparklesIcon, UsersIcon, CalendarIcon } from './Icons';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  initialDate?: Date;
  initialEvent?: CalendarEvent | null;
  patients?: Patient[];
}

const COLORS = [
  // Row 1
  { value: 'blue', class: 'bg-blue-500', ring: 'ring-blue-500', defaultLabel: 'Trabalho' },
  { value: 'green', class: 'bg-emerald-500', ring: 'ring-emerald-500', defaultLabel: 'Pessoal' },
  { value: 'red', class: 'bg-rose-500', ring: 'ring-rose-500', defaultLabel: 'Importante' },
  { value: 'yellow', class: 'bg-amber-500', ring: 'ring-amber-500', defaultLabel: 'Estudos' },
  { value: 'purple', class: 'bg-violet-500', ring: 'ring-violet-500', defaultLabel: 'Lazer' },
  { value: 'gray', class: 'bg-slate-500', ring: 'ring-slate-500', defaultLabel: 'Outro' },
  // Row 2
  { value: 'pink', class: 'bg-pink-500', ring: 'ring-pink-500', defaultLabel: 'Saúde' },
  { value: 'indigo', class: 'bg-indigo-500', ring: 'ring-indigo-500', defaultLabel: 'Viagem' },
  { value: 'cyan', class: 'bg-cyan-500', ring: 'ring-cyan-500', defaultLabel: 'Criativo' },
  { value: 'orange', class: 'bg-orange-500', ring: 'ring-orange-500', defaultLabel: 'Esporte' },
  { value: 'teal', class: 'bg-teal-500', ring: 'ring-teal-500', defaultLabel: 'Finanças' },
  { value: 'lime', class: 'bg-lime-500', ring: 'ring-lime-500', defaultLabel: 'Extra' },
  // Row 3 (Pastels)
  { value: 'lavender', class: 'bg-purple-300', ring: 'ring-purple-300', defaultLabel: 'Suave' }, 
  { value: 'mint', class: 'bg-emerald-200', ring: 'ring-emerald-200', defaultLabel: 'Relax' },
  { value: 'peach', class: 'bg-orange-200', ring: 'ring-orange-200', defaultLabel: 'Leve' },
  { value: 'sky', class: 'bg-sky-200', ring: 'ring-sky-200', defaultLabel: 'Ar Livre' },
  { value: 'blush', class: 'bg-rose-200', ring: 'ring-rose-200', defaultLabel: 'Delicado' },
  { value: 'canary', class: 'bg-yellow-200', ring: 'ring-yellow-200', defaultLabel: 'Alegre' },
];

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, initialDate, initialEvent, patients = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [noEndTime, setNoEndTime] = useState(false);
  const [color, setColor] = useState('blue');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [customLabel, setCustomLabel] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setTitle(initialEvent.title);
        setDescription(initialEvent.description || '');
        setLocation(initialEvent.location || '');
        setStart((initialEvent.start || new Date().toISOString()).substring(0, 16));
        setEnd((initialEvent.end || new Date().toISOString()).substring(0, 16));
        setColor(initialEvent.color);
        setRecurrence(initialEvent.recurrence || 'none');
        setCustomLabel(initialEvent.categoryLabel || '');
        setSelectedPatientId(initialEvent.patientId || '');
        setNoEndTime(false);
      } else {
        const d = initialDate || new Date();
        const localIsoStart = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        const dEnd = new Date(d.getTime() + 60 * 60 * 1000); 
        const localIsoEnd = new Date(dEnd.getTime() - (dEnd.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        
        setTitle('');
        setDescription('');
        setLocation('');
        setStart(localIsoStart);
        setEnd(localIsoEnd);
        setColor('blue');
        setRecurrence('none');
        setCustomLabel('');
        setSelectedPatientId('');
        setNoEndTime(false);
      }
    }
  }, [isOpen, initialDate, initialEvent]);

  // Auto-fill title if patient selected and title is empty
  useEffect(() => {
      if (selectedPatientId && !title) {
          const p = patients.find(pat => pat.id === selectedPatientId);
          if (p) {
              setTitle(`Sessão - ${p.name}`);
              setColor('purple'); // Default color for therapy sessions
              setCustomLabel('Terapia');
          }
      }
  }, [selectedPatientId, patients, title]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalEnd = end;
    if (noEndTime) {
        // If "no end time" is selected, default to start + 50 minutes (standard therapy session)
        const dStart = new Date(start);
        const dEnd = new Date(dStart.getTime() + 50 * 60000);
        finalEnd = new Date(dEnd.getTime() - (dEnd.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    }

    const newEvent: CalendarEvent = {
      id: initialEvent?.id || crypto.randomUUID(),
      title: title || 'Novo Evento',
      description,
      location,
      start: new Date(start).toISOString(),
      end: new Date(finalEnd).toISOString(),
      color: color as any,
      recurrence,
      categoryLabel: customLabel || COLORS.find(c => c.value === color)?.defaultLabel,
      patientId: selectedPatientId || undefined
    };
    onSave(newEvent);
    onClose();
  };

  const triggerStartPicker = () => startInputRef.current?.showPicker();
  const triggerEndPicker = () => endInputRef.current?.showPicker();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-[var(--bg-glass-strong)] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden scale-100 transition-all transform duration-200 border border-[var(--border-color)] max-h-[90vh] overflow-y-auto scrollbar-hide">
        
        <div className="flex items-center justify-between p-8 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {initialEvent ? 'Editar' : 'Criar Evento'}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--bg-glass)] border border-transparent hover:border-[var(--border-color)]">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
          {/* Title Input */}
          <div>
            <input
              type="text"
              placeholder="Nome do evento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-none p-0 focus:ring-0 bg-transparent"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Início</label>
                <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-2xl px-4 py-3 text-[var(--text-secondary)] focus-within:bg-[var(--bg-element)] focus-within:border-[var(--accent-color)] focus-within:ring-4 focus-within:ring-[var(--accent-bg)] transition-all relative">
                    {/* Visual Calendar Trigger */}
                    <button type="button" onClick={triggerStartPicker} className="mr-2 text-[var(--text-muted)] hover:text-[var(--accent-color)]">
                        <CalendarIcon className="w-4 h-4" />
                    </button>
                    <input
                        ref={startInputRef}
                        type="datetime-local"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none font-semibold text-[var(--text-primary)]"
                        required
                    />
                </div>
             </div>
             
             {!noEndTime ? (
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Fim</label>
                    <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-2xl px-4 py-3 text-[var(--text-secondary)] focus-within:bg-[var(--bg-element)] focus-within:border-[var(--accent-color)] focus-within:ring-4 focus-within:ring-[var(--accent-bg)] transition-all">
                        <button type="button" onClick={triggerEndPicker} className="mr-2 text-[var(--text-muted)] hover:text-[var(--accent-color)]">
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                        <input
                            ref={endInputRef}
                            type="datetime-local"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            className="bg-transparent text-sm w-full outline-none font-semibold text-[var(--text-primary)]"
                            required
                        />
                    </div>
                 </div>
             ) : (
                <div className="space-y-1 opacity-50 pointer-events-none">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Fim</label>
                    <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-secondary)]">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span className="text-sm font-semibold">Automático (+50m)</span>
                    </div>
                </div>
             )}
          </div>

          <div className="flex items-center gap-2 pl-1">
              <input 
                  type="checkbox" 
                  id="noEndTime" 
                  checked={noEndTime} 
                  onChange={(e) => setNoEndTime(e.target.checked)}
                  className="w-4 h-4 rounded-md border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-bg)]"
              />
              <label htmlFor="noEndTime" className="text-xs font-bold text-[var(--text-secondary)] cursor-pointer select-none">Sem horário de fim (Duração padrão)</label>
          </div>
          
          {/* Patient Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Paciente (Opcional)</label>
            <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-2xl px-4 py-3 text-[var(--text-secondary)] focus-within:bg-[var(--bg-element)] focus-within:border-[var(--accent-color)] focus-within:ring-4 focus-within:ring-[var(--accent-bg)] transition-all">
                <UsersIcon className="w-4 h-4 text-[var(--text-muted)] mr-3" />
                <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-[var(--text-primary)] font-medium"
                >
                    <option value="">Nenhum</option>
                    {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
          </div>

          {/* Recurrence Selection */}
          <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Repetição</label>
              <div className="flex gap-2">
                 {['none', 'daily', 'weekly', 'monthly'].map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => setRecurrence(opt as any)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${recurrence === opt ? 'bg-[var(--accent-color)] text-[var(--bg-app)] border-[var(--accent-color)]' : 'bg-[var(--bg-element)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                    >
                        {opt === 'none' && 'Não'}
                        {opt === 'daily' && 'Diário'}
                        {opt === 'weekly' && 'Semanal'}
                        {opt === 'monthly' && 'Mensal'}
                    </button>
                 ))}
              </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Onde?</label>
             <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-2xl px-4 py-3 text-[var(--text-secondary)] focus-within:bg-[var(--bg-element)] focus-within:border-[var(--accent-color)] focus-within:ring-4 focus-within:ring-[var(--accent-bg)] transition-all">
                <MapPinIcon className="w-4 h-4 text-[var(--text-muted)] mr-3" />
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Adicionar localização"
                    className="bg-transparent text-sm w-full outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Notas</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-2xl p-4 text-sm text-[var(--text-primary)] min-h-[100px] outline-none focus:bg-[var(--bg-element)] focus:border-[var(--accent-color)] focus:ring-4 focus:ring-[var(--accent-bg)] resize-none font-medium transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Categoria e Cor</label>
            <div className="grid grid-cols-6 gap-2 p-2 bg-[var(--bg-element)] rounded-2xl border border-[var(--border-color)]">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setColor(c.value);
                    setCustomLabel(c.defaultLabel);
                  }}
                  title={c.defaultLabel}
                  className={`w-full aspect-square rounded-full ${c.class} transition-all shadow-sm flex items-center justify-center ${
                    color === c.value ? `ring-2 ring-offset-2 ring-offset-[var(--bg-app)] ${c.ring} scale-100` : 'scale-75 hover:scale-90 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
            {/* Custom Label Input */}
            <input 
                type="text" 
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Nome da categoria..."
                className="w-full text-xs font-bold text-center bg-transparent outline-none text-[var(--text-secondary)] border-b border-[var(--border-color)] focus:border-[var(--accent-color)] pb-1"
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-[var(--border-color)]">
            <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] rounded-2xl transition-colors border border-transparent hover:border-[var(--border-color)]"
            >
                Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-sm font-bold text-[var(--bg-app)] bg-[var(--text-primary)] rounded-2xl hover:opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border border-transparent"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
