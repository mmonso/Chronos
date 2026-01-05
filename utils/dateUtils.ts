
import { CalendarEvent, DayCell } from '../types';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const SHORT_WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const getMonthYear = (date: Date): string => {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust so Sunday is first day
  return new Date(d.setDate(diff));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const generateCalendarGrid = (year: number, month: number, events: CalendarEvent[]): DayCell[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  const grid: DayCell[] = [];
  const today = new Date();

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    grid.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      events: events.filter(e => isSameDay(new Date(e.start), date))
    });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    grid.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      events: events.filter(e => isSameDay(new Date(e.start), date))
    });
  }

  // Next month padding to fill 6 rows (42 cells total)
  const remainingCells = 42 - grid.length;
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i);
    grid.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      events: events.filter(e => isSameDay(new Date(e.start), date))
    });
  }

  return grid;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(date);
};

export const formatTime = (isoString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString));
};

// Helper to expand recurring events into instances for the current view
export const getRecurringEventsForWeek = (events: CalendarEvent[], weekStart: Date): CalendarEvent[] => {
  const expanded: CalendarEvent[] = [];
  const weekEnd = addDays(weekStart, 7);

  events.forEach(event => {
    // If regular event, check if it falls in window
    if (!event.recurrence || event.recurrence === 'none') {
       const eStart = new Date(event.start);
       if (eStart >= weekStart && eStart < weekEnd) {
           expanded.push(event);
       }
       return;
    }

    // Handle Recurrence
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const duration = eventEnd.getTime() - eventStart.getTime();

    // Iterate through days of the current week to find matches
    for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i);
        let occurs = false;

        // Reset times for day comparison (check pure dates)
        const dayStart = new Date(currentDay);
        dayStart.setHours(0,0,0,0);
        
        const evtDayStart = new Date(eventStart);
        evtDayStart.setHours(0,0,0,0);

        if (dayStart < evtDayStart) continue; // Future week, recurrence hasn't started

        // Check Exceptions (exDates)
        // We compare ISO string of the expected start time or just the date part. 
        // Simplest strategy: Check if any exDate falls on this 'currentDay'.
        const isException = event.exDates?.some(exDateStr => isSameDay(new Date(exDateStr), currentDay));
        if (isException) continue;

        if (event.recurrence === 'daily') {
            occurs = true;
        } else if (event.recurrence === 'weekly') {
            if (dayStart.getDay() === evtDayStart.getDay()) occurs = true;
        } else if (event.recurrence === 'monthly') {
            if (dayStart.getDate() === evtDayStart.getDate()) occurs = true;
        }

        if (occurs) {
            // Create instance
            const instanceStart = new Date(currentDay);
            instanceStart.setHours(eventStart.getHours(), eventStart.getMinutes());
            
            const instanceEnd = new Date(instanceStart.getTime() + duration);
            
            // Generate a composite ID for the instance to distinguish it
            // Unless it is the EXACT original start date, in which case keep original ID
            const isOriginalInstance = isSameDay(instanceStart, eventStart);
            
            expanded.push({
                ...event,
                id: isOriginalInstance ? event.id : `${event.id}_instance_${instanceStart.getTime()}`,
                start: instanceStart.toISOString(),
                end: instanceEnd.toISOString(),
            });
        }
    }
  });

  return expanded;
};
