
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO String
  end: string;   // ISO String
  description?: string;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'pink' | 'indigo' | 'cyan' | 'orange' | 'teal' | 'lime' | 'lavender' | 'mint' | 'peach' | 'sky' | 'blush' | 'canary';
  location?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  categoryLabel?: string; 
  exDates?: string[]; 
  patientId?: string;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  consultationValue?: number;
}

export interface AnamnesisRecord {
  id: string;
  patientId: string;
  data: Record<string, string>; // { "Histórico Familiar": "...", "Queixa": "..." }
  updatedAt: string;
}

export interface SessionNote {
  id: string;
  patientId: string;
  date: string;
  content: string;
  eventId?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
  description: string;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface HealthRecord {
  id: string;
  type: 'weight' | 'water' | 'sleep' | 'mood';
  value: number;
  date: string;
  note?: string;
}

export type ViewMode = 'dashboard' | 'calendar' | 'patients' | 'finance' | 'health';

export type Theme = 'light' | 'dark' | 'ocean' | 'eco' | 'sand';

export interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}
