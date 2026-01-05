
import React, { useState, useMemo } from 'react';
import { HealthRecord } from '../types';
import { ActivityIcon, PlusIcon, TrashIcon, CheckIcon, XIcon, EditIcon, ClockIcon, TargetIcon } from './Icons';

interface HealthViewProps {
  records: HealthRecord[];
  onAddRecord: (record: HealthRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord?: (record: HealthRecord) => void;
  weightGoal?: number | null;
  onUpdateGoal?: (goal: number | null) => void;
}

const HealthView: React.FC<HealthViewProps> = ({ records, onAddRecord, onDeleteRecord, onUpdateRecord, weightGoal, onUpdateGoal }) => {
  // Helper to get local ISO string for datetime-local input
  const getNowLocalISO = () => {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 16);
  };

  // Weight Form State
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(getNowLocalISO());
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  
  // Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  
  // Filter only weight records and sort by date (Oldest -> Newest)
  const weightHistory = useMemo(() => 
    records.filter(r => r.type === 'weight')
           .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
           .slice(-30), // Show last 30 entries for better chart scaling
  [records]);

  // Chart Logic (SVG)
  const chartData = useMemo(() => {
      if (weightHistory.length < 2) return null;
      
      // Determine Y Axis Range (Weight)
      const weights = weightHistory.map(r => r.value);
      
      // Add Goal to scale calculation to ensure line is visible
      const allValuesToCheck = weightGoal ? [...weights, weightGoal] : weights;

      const minWeight = Math.min(...allValuesToCheck) - 1; // 1kg buffer bottom
      const maxWeight = Math.max(...allValuesToCheck) + 1; // 1kg buffer top
      const range = maxWeight - minWeight;
      
      // Create SVG Points
      const points = weightHistory.map((r, i) => {
          const x = (i / (weightHistory.length - 1)) * 100;
          const y = 100 - ((r.value - minWeight) / range) * 100;
          return `${x},${y}`;
      }).join(' ');

      // Create Area Fill Path (closes the loop at the bottom)
      const areaPoints = `0,100 ${points} 100,100`;

      // Map data for HTML Overlay (Dots & Tooltips)
      const htmlPoints = weightHistory.map((r, i) => {
          const x = (i / (weightHistory.length - 1)) * 100;
          const y = 100 - ((r.value - minWeight) / range) * 100;
          return { x, y, value: r.value, date: r.date, id: r.id };
      });

      // Goal Line Position
      const goalY = weightGoal ? 100 - ((weightGoal - minWeight) / range) * 100 : null;

      // Generate Y-Axis Grid Lines (5 lines)
      const gridLines = [];
      const step = range / 5;
      for (let i = 0; i <= 5; i++) {
          const val = minWeight + (step * i);
          const yPerc = 100 - ((val - minWeight) / range) * 100;
          gridLines.push({ val, yPerc });
      }

      return { points, areaPoints, data: weightHistory, min: minWeight, max: maxWeight, htmlPoints, gridLines, goalY };
  }, [weightHistory, weightGoal]);

  const handleWeightSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!weightInput || !dateInput) return;

      const val = parseFloat(weightInput);
      const finalDate = new Date(dateInput).toISOString();
      
      if (editingWeightId) {
          const original = records.find(r => r.id === editingWeightId);
          if (original && onUpdateRecord) {
              onUpdateRecord({
                  ...original,
                  value: val,
                  date: finalDate
              });
          }
          setEditingWeightId(null);
      } else {
          onAddRecord({
              id: crypto.randomUUID(),
              type: 'weight',
              value: val,
              date: finalDate
          });
      }
      setWeightInput('');
      setDateInput(getNowLocalISO()); // Reset to now
  };

  const openGoalModal = () => {
      setGoalInput(weightGoal ? weightGoal.toString() : '');
      setIsGoalModalOpen(true);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onUpdateGoal) {
          const val = goalInput ? parseFloat(goalInput) : null;
          onUpdateGoal(val);
      }
      setIsGoalModalOpen(false);
  };

  const startEditWeight = (record: {id: string, value: number, date: string}) => {
      setWeightInput(record.value.toString());
      
      // Format existing date for input
      const d = new Date(record.date);
      const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
      setDateInput(local.toISOString().slice(0, 16));

      setEditingWeightId(record.id);
      const input = document.getElementById('weight-input');
      if(input) input.focus();
  };

  const cancelEditWeight = () => {
      setWeightInput('');
      setDateInput(getNowLocalISO());
      setEditingWeightId(null);
  };

  return (
    <div className="flex flex-col h-full p-6 lg:p-10 gap-8 animate-enter text-[var(--text-primary)] font-sans overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-end gap-6 shrink-0">
            <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <ActivityIcon className="w-8 h-8 text-rose-500" />
                    Controle de Peso
                </h1>
                
                {/* Stats / Goals Cards */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                    
                    {/* Current Weight Badge */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-[var(--bg-glass)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                         <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Peso Atual</span>
                             <span className="text-2xl font-bold text-[var(--text-primary)] leading-none mt-1">
                                {weightHistory.length > 0 ? weightHistory[weightHistory.length-1].value : '--'} <span className="text-sm font-medium text-[var(--text-secondary)]">kg</span>
                             </span>
                         </div>
                    </div>

                    {/* Goal Badge (Click to Open Modal) */}
                    <button 
                        onClick={openGoalModal}
                        className="flex items-center gap-3 px-5 py-3 bg-[var(--bg-glass)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all group text-left"
                    >
                         <div className={`p-2 rounded-full transition-colors ${weightGoal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                             <TargetIcon className="w-5 h-5" />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Meta</span>
                             <span className={`text-2xl font-bold leading-none mt-1 ${weightGoal ? 'text-emerald-700' : 'text-[var(--text-muted)]'}`}>
                                 {weightGoal ? weightGoal : 'Definir'} <span className={`text-sm font-medium ${weightGoal ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>kg</span>
                             </span>
                         </div>
                    </button>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleWeightSubmit} className="flex flex-col sm:flex-row items-center gap-2 bg-[var(--bg-glass)] p-2 rounded-2xl border border-[var(--border-color)] shadow-sm w-full xl:w-auto">
                 {editingWeightId && (
                    <button 
                        type="button" 
                        onClick={cancelEditWeight}
                        className="p-2.5 bg-[var(--bg-element)] text-[var(--text-muted)] rounded-xl hover:bg-slate-200 transition-all self-stretch flex items-center justify-center"
                        title="Cancelar Edição"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                )}
                
                {/* Date Input */}
                <div className="flex items-center bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 w-full sm:w-auto focus-within:border-[var(--accent-color)] transition-colors">
                    <ClockIcon className="w-4 h-4 text-[var(--text-muted)] mr-2" />
                    <input 
                        type="datetime-local"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="bg-transparent text-sm font-bold text-[var(--text-secondary)] outline-none w-full sm:w-[130px]"
                        required
                    />
                </div>

                {/* Weight Input */}
                <input 
                    id="weight-input"
                    type="number" 
                    step="0.1" 
                    placeholder="Peso (kg)"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className={`w-full sm:w-28 bg-[var(--bg-element)] border rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all ${editingWeightId ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-bg)]' : 'border-[var(--border-color)] focus:border-rose-500'}`}
                />

                <button type="submit" className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 ${editingWeightId ? 'bg-[var(--accent-color)] text-[var(--bg-app)]' : 'bg-[var(--text-primary)] text-[var(--bg-app)]'}`}>
                    {editingWeightId ? <CheckIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    <span className="">{editingWeightId ? 'Atualizar' : 'Registrar'}</span>
                </button>
            </form>
        </div>

        {/* CHART SECTION (Occupies rest of height) */}
        <div className="flex-1 min-h-0 bg-[var(--bg-glass-strong)] border border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-12 shadow-sm relative flex flex-col">
            
            {chartData ? (
                <div className="absolute inset-8 lg:inset-12 flex flex-col">
                    
                    {/* Y-Axis Labels & Grid */}
                    <div className="absolute inset-0 pointer-events-none">
                         {chartData.gridLines.map((line, i) => (
                             <div 
                                key={i} 
                                className="absolute w-full flex items-center" 
                                style={{ top: `${line.yPerc}%` }}
                             >
                                 <span className="absolute -left-10 text-[10px] font-bold text-[var(--text-muted)] w-8 text-right">
                                     {line.val.toFixed(1)}
                                 </span>
                                 <div className="w-full border-t border-[var(--border-color)] border-dashed opacity-50"></div>
                             </div>
                         ))}
                    </div>

                    {/* Chart Container */}
                    <div className="relative flex-1 w-full z-10 my-4"> {/* Margins match label offsets */}
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible absolute inset-0">
                            {/* Gradient Area */}
                            <defs>
                                <linearGradient id="weightGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={chartData.areaPoints} fill="url(#weightGradient)" />

                            {/* GOAL LINE */}
                            {chartData.goalY !== null && (
                                <line 
                                    x1="0" 
                                    y1={chartData.goalY} 
                                    x2="100" 
                                    y2={chartData.goalY} 
                                    stroke="#10b981" 
                                    strokeWidth="2" 
                                    strokeDasharray="6,4" 
                                    vectorEffect="non-scaling-stroke"
                                    className="opacity-60"
                                />
                            )}

                            {/* Main Line */}
                            <polyline 
                                points={chartData.points} 
                                fill="none" 
                                stroke="var(--accent-color)" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                vectorEffect="non-scaling-stroke"
                                className="drop-shadow-sm"
                            />
                        </svg>
                        
                        {/* Goal Label Overlay */}
                        {chartData.goalY !== null && (
                             <div 
                                className="absolute right-0 flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 pointer-events-none"
                                style={{ top: `${chartData.goalY}%`, transform: 'translateY(-50%)' }}
                             >
                                 <TargetIcon className="w-3 h-3 text-emerald-600" />
                                 <span className="text-[10px] font-bold text-emerald-700">Meta: {weightGoal}kg</span>
                             </div>
                        )}

                        {/* Interactive Dots Overlay */}
                        {chartData.htmlPoints.map((p, i) => (
                            <div 
                                key={p.id}
                                className="absolute group"
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                            >
                                {/* The Dot */}
                                <div 
                                    className="w-4 h-4 bg-[var(--bg-app)] border-[3px] border-[var(--accent-color)] rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 shadow-sm z-20 relative"
                                    onClick={() => startEditWeight({ id: p.id, value: p.value, date: p.date })}
                                ></div>

                                {/* Tooltip / Action Menu */}
                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[var(--bg-element)] border border-[var(--border-color)] px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto flex flex-col items-center gap-1 min-w-[120px] z-50">
                                    <span className="text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">{p.value} kg</span>
                                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap mb-1">
                                        {new Date(p.date).toLocaleDateString('pt-BR')} • {new Date(p.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    <div className="flex gap-1 w-full border-t border-[var(--border-color)] pt-1 mt-1 justify-center">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); startEditWeight({ id: p.id, value: p.value, date: p.date }); }}
                                            className="p-1 hover:bg-[var(--bg-app)] rounded-md text-[var(--text-secondary)]"
                                            title="Editar"
                                        >
                                            <EditIcon className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteRecord(p.id); }}
                                            className="p-1 hover:bg-red-50 rounded-md text-red-400"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--border-color)]"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* X-Axis Labels (Dates) */}
                    <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between pointer-events-none">
                         {chartData.htmlPoints.filter((_, i) => i % Math.ceil(chartData.htmlPoints.length / 6) === 0).map((p, i) => (
                             <span key={i} className="text-[10px] font-bold text-[var(--text-muted)] transform -translate-x-1/2" style={{ position: 'absolute', left: `${p.x}%` }}>
                                 {new Date(p.date).getDate()}/{new Date(p.date).getMonth() + 1}
                             </span>
                         ))}
                    </div>
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-[2rem] bg-[var(--bg-glass)]">
                     <ActivityIcon className="w-16 h-16 mb-4 opacity-20" />
                     <h2 className="text-xl font-bold mb-2">Sem dados suficientes</h2>
                     <p className="text-sm max-w-xs text-center">Adicione pelo menos 2 registros de peso para visualizar o gráfico de evolução.</p>
                 </div>
            )}
        </div>

        {/* Goal Modal */}
        {isGoalModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsGoalModalOpen(false)}></div>
                <div className="relative bg-[var(--bg-glass-strong)] w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-[var(--border-color)] animate-enter text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <TargetIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold font-serif mb-2 text-[var(--text-primary)]">Definir Meta</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Qual é o seu peso alvo ideal? Vamos traçar uma linha no gráfico para te motivar.
                    </p>
                    
                    <form onSubmit={handleGoalSubmit} className="space-y-6">
                         <div className="relative max-w-[140px] mx-auto">
                            <input 
                                type="number"
                                step="0.1"
                                className="w-full text-center text-4xl font-bold bg-transparent border-b-2 border-[var(--border-color)] pb-2 outline-none focus:border-emerald-500 text-[var(--text-primary)]"
                                placeholder="00.0"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                autoFocus
                            />
                            <span className="absolute right-0 bottom-3 text-sm font-bold text-[var(--text-muted)]">kg</span>
                         </div>
                         
                         <div className="flex gap-3 justify-center">
                            <button 
                                type="button"
                                onClick={() => setIsGoalModalOpen(false)}
                                className="px-5 py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-element)] font-bold text-sm text-[var(--text-secondary)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 shadow-md transition-all hover:scale-105 active:scale-95"
                            >
                                Salvar Meta
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default HealthView;
