
import { createClient } from '@supabase/supabase-js';

// ==========================================
// PASSO 1: CREDENCIAIS CONFIGURADAS
// ==========================================
const SUPABASE_URL = 'https://cilbrsgkuofxjclennyd.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbGJyc2drdW9meGpjbGVubnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTk0NjEsImV4cCI6MjA4MzUzNTQ2MX0.Wh5-NWI1UhmNHoxRlWvIeH7sCdzMxWBy52wGR7r92mA';

// ==========================================
// INICIALIZAÇÃO SEGURA
// ==========================================
const isUrlValid = SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('COLE_AQUI');

export const supabase = isUrlValid 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new Proxy({} as any, {
      get: () => {
        throw new Error("Supabase não configurado corretamente. Verifique as chaves em 'services/supabase.ts'.");
      }
    });

export const isSupabaseConfigured = isUrlValid;

/**
 * ==========================================
 * PASSO 2: LEMBRETE - SCRIPT SQL
 * ==========================================
 * Se você ainda não rodou o SQL no painel do Supabase, faça isso agora 
 * no 'SQL Editor' para criar as tabelas necessárias:
 * 
 * create extension if not exists "uuid-ossp";
 * 
 * create table patients (
 *   id uuid primary key default uuid_generate_v4(),
 *   user_id uuid references auth.users(id) not null,
 *   name text not null,
 *   email text,
 *   phone text,
 *   status text default 'active',
 *   notes text,
 *   consultation_value numeric default 0,
 *   created_at timestamp with time zone default now()
 * );
 * 
 * create table events (
 *   id uuid primary key default uuid_generate_v4(),
 *   user_id uuid references auth.users(id) not null,
 *   patient_id uuid references patients(id) on delete cascade,
 *   title text not null,
 *   start timestamp with time zone not null,
 *   "end" timestamp with time zone not null,
 *   description text,
 *   color text default 'blue',
 *   location text,
 *   recurrence text default 'none',
 *   category_label text,
 *   created_at timestamp with time zone default now()
 * );
 * 
 * create table user_settings (
 *   user_id uuid primary key references auth.users(id),
 *   weight_goal numeric,
 *   theme text default 'light',
 *   updated_at timestamp with time zone default now()
 * );
 * 
 * alter table patients enable row level security;
 * alter table events enable row level security;
 * alter table user_settings enable row level security;
 * 
 * create policy "Users can only see their own patients" on patients for all using (auth.uid() = user_id);
 * create policy "Users can only see their own events" on events for all using (auth.uid() = user_id);
 * create policy "Users can only see their own settings" on user_settings for all using (auth.uid() = user_id);
 */
