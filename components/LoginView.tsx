
import React, { useState } from 'react';
import { SparklesIcon, ShieldIcon } from './Icons';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // Credenciais padrão pré-preenchidas para facilitar o acesso
  const [email, setEmail] = useState('doutor@chronos.ai');
  const [password, setPassword] = useState('chronos123');
  const [isLoading, setIsLoading] = useState(false);

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-app)]">
      {/* Background Orbs are handled in index.html via CSS, but let's add one specifically for login */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[var(--bg-glass-strong)] backdrop-blur-2xl border border-[var(--border-color)] p-10 rounded-[3rem] shadow-2xl relative z-10 animate-enter">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-2xl flex items-center justify-center font-bold text-3xl mb-6 shadow-xl ring-4 ring-indigo-500/10">
            C
          </div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-2">Chronos AI</h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium">Sua jornada clínica começa aqui.</p>
        </div>

        <form onSubmit={handleMockLogin} className="space-y-4">
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
            disabled={isLoading}
            className="w-full py-4 bg-[var(--text-primary)] text-[var(--bg-app)] rounded-2xl font-bold text-sm shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Acessar Consultório</>
            )}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border-color)]"></div>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">ou entre com</span>
          <div className="flex-1 h-px bg-[var(--border-color)]"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-2 p-3 bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-app)] transition-all">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            <span className="text-xs font-bold">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-3 bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-app)] transition-all">
            <img src="https://www.svgrepo.com/show/330030/apple.svg" className="w-5 h-5 opacity-80" alt="Apple" />
            <span className="text-xs font-bold">Apple</span>
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <ShieldIcon className="w-3 h-3" />
            <span>Conformidade LGPD & Criptografia E2EE</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-2 leading-relaxed">
            Ao entrar, você concorda com nossos <br />
            <a href="#" className="underline">Termos de Uso</a> e <a href="#" className="underline">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
