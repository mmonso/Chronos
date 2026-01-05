
import React, { useMemo } from 'react';
import { CalendarEvent } from '../types';
import { generateCalendarGrid, getMonthYear, SHORT_WEEK_DAYS, isSameDay } from '../utils/dateUtils';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: CalendarEvent[];
}

const DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  yellow: 'bg-amber-500',
  purple: 'bg-violet-500',
  gray: 'bg-slate-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  lime: 'bg-lime-500',
  lavender: 'bg-purple-300',
  mint: 'bg-emerald-200',
  peach: 'bg-orange-200',
  sky: 'bg-sky-200',
  blush: 'bg-rose-200',
  canary: 'bg-yellow-200',
};

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, onDateSelect, onPrevMonth, onNextMonth, events }) => {
  const grid = useMemo(() => {
    return generateCalendarGrid(currentDate.getFullYear(), currentDate.getMonth(), events);
  }, [currentDate, events]);

  return (
    <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-[var(--border-color)] h-fit">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif font-bold text-[var(--text-primary)] text-lg">
          {getMonthYear(currentDate)}
        </h2>
        <div className="flex gap-1">
          <button onClick={onPrevMonth} className="p-1.5 hover:bg-[var(--bg-element)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border-color)]">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={onNextMonth} className="p-1.5 hover:bg-[var(--bg-element)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border-color)]">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {SHORT_WEEK_DAYS.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-[var(--text-muted)] py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {grid.map((cell, idx) => {
          const isSelected = isSameDay(cell.date, currentDate);
          const hasEvents = cell.events.length > 0;

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(cell.date)}
              className={`
                relative flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full transition-all border
                ${!cell.isCurrentMonth ? 'text-[var(--text-muted)] opacity-50 border-transparent' : 'text-[var(--text-secondary)] border-transparent'}
                ${isSelected ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-md scale-110 border-[var(--accent-color)]' : 'hover:bg-[var(--bg-element)] hover:border-[var(--border-color)]'}
                ${cell.isToday && !isSelected ? 'text-[var(--accent-color)] ring-1 ring-[var(--accent-bg)] border-[var(--accent-bg)]' : ''}
              `}
            >
              {cell.date.getDate()}
              {hasEvents && !isSelected && (
                <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 flex gap-0.5 justify-center">
                    {cell.events.slice(0, 3).map((evt, i) => (
                        <div 
                            key={i} 
                            className={`w-1 h-1 rounded-full ${DOT_COLORS[evt.color] || 'bg-slate-400'}`} 
                        />
                    ))}
                    {cell.events.length > 3 && (
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                    )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
