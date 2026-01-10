
import React, { useState } from 'react';
import { SparklesIcon, ShieldIcon, LoaderIcon, XIcon } from './Icons';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // Credenciais pré-preenchidas para facilitar o desenvolvimento
  const [email, setEmail] = useState('marcelomonso.art@gmail.com');
  const [password, setPassword] = useState('JojoPlatinado1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Configuração pendente: Insira suas chaves do Supabase no arquivo 'services/supabase.ts'.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        alert('Cadastro realizado! Verifique seu e-mail ou tente logar.');
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-app)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[var(--bg-glass-strong)] backdrop-blur-2xl border border-[var(--border-color)] p-10 rounded-[3rem] shadow-2xl relative z-10 animate-enter">
        
        {!isSupabaseConfigured && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <h3 className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">Configuração Necessária</h3>
            <p className="text-amber-700 text-[10px] leading-relaxed">
              O projeto foi reiniciado. Para funcionar, você precisa inserir a <b>URL</b> e a <b>API Key</b> no arquivo <code>services/supabase.ts</code>.
            </p>
          </div>
        )}

        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-2xl flex items-center justify-center font-bold text-3xl mb-6 shadow-xl ring-4 ring-indigo-500/10">
            C
          </div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-2">Chronos AI</h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium">
            {isRegistering ? 'Crie sua conta profissional.' : 'Sua jornada clínica começa aqui.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
               <XIcon className="w-2.5 h-2.5" />
            </div>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Email Profissional</label>
            <input 
              type="email" 
              placeholder="exemplo@psicologia.com.br"
              required
              className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium outline-none focus:border-[var(--accent-color)] focus:ring-4 focus:ring-indigo-500/5 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••"
              required
              className="w-full bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium outline-none focus:border-[var(--accent-color)] focus:ring-4 focus:ring-indigo-500/5 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading || !isSupabaseConfigured}
            className="w-full py-4 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-2xl font-bold text-sm shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon className="w-5 h-5 animate-spin" />
            ) : (
              <>{isRegistering ? 'Criar Conta' : 'Acessar Consultório'}</>
            )}
          </button>
        </form>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-6 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
        >
          {isRegistering ? 'Já tenho conta. Fazer Login.' : 'Não tem conta? Cadastre-se grátis.'}
        </button>

        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <ShieldIcon className="w-3 h-3" />
            <span>Conformidade LGPD & Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
