
import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import WeekView from './WeekView';
import MiniCalendar from './MiniCalendar';
import { PlusIcon, MessageCircleIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, SunsetIcon, LayersIcon, BriefcaseIcon } from './Icons';
import AIChatSidebar from './AIChatSidebar';
import { addDays } from '../utils/dateUtils';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onUpdateEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onBackToDashboard: () => void;
}

type CalendarViewMode = 'all' | 'morning' | 'afternoon' | 'workday' | 'night';

const CalendarView: React.FC<CalendarViewProps> = ({ events, onAddEvent, onDateClick, onEventClick, onUpdateEvent, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('all');

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handlePrevWeek = () => setCurrentDate(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentDate(prev => addDays(prev, 7));

  // Visual Controls Component
  const ViewControls = ({ className }: { className?: string }) => (
      <div className={`flex gap-2 p-1 bg-[var(--bg-element)] rounded-2xl border border-[var(--border-color)] shadow-sm ${className}`}>
          <button 
              onClick={() => setViewMode('morning')}
              className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center ${viewMode === 'morning' ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)]'}`}
              title="Manhã"
          >
              <SunIcon className="w-4 h-4" />
          </button>
          <button 
              onClick={() => setViewMode('workday')}
              className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center ${viewMode === 'workday' ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)]'}`}
              title="Manhã e Tarde"
          >
               <BriefcaseIcon className="w-4 h-4" />
          </button>
          <button 
              onClick={() => setViewMode('afternoon')}
              className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center ${viewMode === 'afternoon' ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)]'}`}
              title="Tarde"
          >
              <SunsetIcon className="w-4 h-4" />
          </button>
          <button 
              onClick={() => setViewMode('night')}
              className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center ${viewMode === 'night' ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)]'}`}
              title="Noite"
          >
              <MoonIcon className="w-4 h-4" />
          </button>
          <button 
              onClick={() => setViewMode('all')}
              className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center ${viewMode === 'all' ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)]'}`}
              title="Dia Inteiro"
          >
              <LayersIcon className="w-4 h-4" />
          </button>
      </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full p-6 lg:p-8 gap-6 font-sans text-[var(--text-primary)] overflow-hidden relative">
      
      {/* Header Mobile / Tablet Tools */}
      <div className="lg:hidden flex flex-col gap-3 mb-2">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <button onClick={handlePrevWeek} className="p-2 rounded-full bg-[var(--bg-element)] text-[var(--text-primary)] shadow-sm">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-1.5 bg-[var(--accent-color)] text-[var(--bg-app)] rounded-full text-xs font-bold shadow-sm"
                >
                    Hoje
                </button>
                <button onClick={handleNextWeek} className="p-2 rounded-full bg-[var(--bg-element)] text-[var(--text-primary)] shadow-sm">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
             </div>
         </div>
         {/* Mobile View Controls */}
         <ViewControls />
      </div>

      {/* Main Content - Week View */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
         <div className="flex-1 min-h-0 relative">
             <WeekView 
                currentDate={currentDate} 
                events={events}
                viewMode={viewMode}
                onEventClick={onEventClick}
                onTimeSlotClick={onDateClick}
                onUpdateEvent={onUpdateEvent}
                onDeleteEvent={onDeleteEvent}
                onSwipePrev={() => setCurrentDate(prev => addDays(prev, -1))}
                onSwipeNext={() => setCurrentDate(prev => addDays(prev, 1))}
                onChangeDate={setCurrentDate}
             />
         </div>
      </div>

      {/* Right Sidebar Container (Desktop) */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col gap-6 animate-enter delay-200 relative pointer-events-none">
         <div className="pointer-events-auto flex flex-col gap-4">
            
            {/* Desktop View Controls */}
            <ViewControls />

            <div className="flex items-center gap-2 w-full">
                <button 
                    onClick={handlePrevWeek}
                    className="h-11 w-11 flex items-center justify-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--accent-color)] text-[var(--text-muted)] hover:text-[var(--accent-color)] rounded-2xl transition-all shadow-sm active:scale-95"
                    title="Semana anterior"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="flex-1 h-11 flex items-center justify-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--accent-color)] text-[var(--accent-color)] font-bold rounded-2xl transition-all shadow-sm active:scale-95 text-sm"
                >
                    Ir para Hoje
                </button>
                <button 
                    onClick={handleNextWeek}
                    className="h-11 w-11 flex items-center justify-center bg-[var(--bg-element)] border border-[var(--border-color)] hover:border-[var(--accent-color)] text-[var(--text-muted)] hover:text-[var(--accent-color)] rounded-2xl transition-all shadow-sm active:scale-95"
                    title="Próxima semana"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
            
            <MiniCalendar 
                currentDate={currentDate}
                events={events}
                onDateSelect={setCurrentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />
         </div>
      </div>

      {/* Floating Chat Widget Area */}
      <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
          
          <div className="pointer-events-auto">
            <AIChatSidebar 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)}
                onAddEvent={onAddEvent}
                events={events}
            />
          </div>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`
                pointer-events-auto
                w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 
                hover:scale-110 active:scale-95 border border-[var(--border-color)]
                ${isChatOpen ? 'bg-[var(--bg-element)] text-[var(--text-primary)] rotate-90' : 'bg-[var(--bg-element)] text-[var(--text-primary)] hover:bg-[var(--accent-color)] hover:text-white'}
            `}
          >
            {isChatOpen ? <XIcon className="w-6 h-6" /> : <MessageCircleIcon className="w-6 h-6" />}
          </button>
      </div>

    </div>
  );
};

export default CalendarView;
