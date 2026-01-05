
import React, { useState, useEffect, useRef } from 'react';
import { parseEventFromText } from '../services/geminiService';
import { CalendarEvent } from '../types';
import { SendIcon, SparklesIcon, LoaderIcon } from './Icons';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: CalendarEvent) => void;
  events?: CalendarEvent[];
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ isOpen, onClose, onAddEvent, events = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', text: 'Olá! Sou sua assistente. Diga algo como "Agendar reunião amanhã às 14h". Eu entendo o contexto da nossa conversa.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: inputValue };
    
    // Prepare history for API (exclude current message as it is passed as prompt, include previous)
    // We map 'ai' role to 'model' if needed, but the service handles it as simple object array
    const history = messages.map(m => ({ role: m.role, text: m.text }));

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Pass existing events AND history to the AI
      const eventData = await parseEventFromText(userMsg.text, new Date().toISOString(), events, history);
      
      if (eventData) {
        // Handle Conflict Warning
        if (eventData.conflict) {
             const warningMsg: Message = {
                 id: crypto.randomUUID(),
                 role: 'ai',
                 text: eventData.conflictMessage || `Atenção: Detectei um conflito de horário para "${eventData.title}". Deseja agendar mesmo assim?`
             };
             setMessages(prev => [...prev, warningMsg]);
             
             const newEvent: CalendarEvent = {
                ...eventData,
                id: crypto.randomUUID(),
            };
            onAddEvent(newEvent);
        } else {
            const newEvent: CalendarEvent = {
              ...eventData,
              id: crypto.randomUUID(),
            };
            onAddEvent(newEvent);
            
            const aiMsg: Message = { 
              id: crypto.randomUUID(), 
              role: 'ai', 
              text: `Agendado: "${eventData.title}" (${new Date(eventData.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}).`
            };
            setMessages(prev => [...prev, aiMsg]);
        }
      } else {
        const aiMsg: Message = { 
            id: crypto.randomUUID(), 
            role: 'ai', 
            text: 'Entendi o contexto, mas preciso de mais detalhes como horário específico para agendar.'
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
       const aiMsg: Message = { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        text: 'Desculpe, tive um erro de conexão. Tente novamente.'
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-[340px] h-[500px] flex flex-col bg-[var(--bg-glass-strong)] backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_-10px_var(--shadow-color)] border border-[var(--border-color)] overflow-hidden origin-bottom-right animate-enter transition-all mb-2">
        
        {/* Header */}
        <div className="flex items-center gap-3 p-5 bg-[var(--bg-glass)] border-b border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-purple-500 flex items-center justify-center text-white shadow-lg ring-2 ring-white/20">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
             <h3 className="font-bold text-[var(--text-primary)] text-sm">Assistente IA</h3>
             <p className="text-[10px] text-[var(--text-muted)] font-medium">Online • Contexto Ativo</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-[var(--text-primary)] text-[var(--bg-app)] rounded-br-none shadow-md' 
                  : 'bg-[var(--bg-element)] text-[var(--text-secondary)] shadow-sm border border-[var(--border-color)] rounded-bl-none'}
              `}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
               <div className="bg-[var(--bg-element)] border border-[var(--border-color)] px-3 py-2 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-8">
                  <div className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce delay-150"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-[var(--bg-glass)] border-t border-[var(--border-color)]">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite aqui..."
              className="flex-1 pl-4 pr-4 py-2.5 bg-[var(--bg-element)] border border-[var(--border-color)] rounded-full text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-sm focus:ring-2 focus:ring-[var(--accent-bg)] outline-none focus:border-[var(--accent-color)]"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              className="p-2.5 bg-[var(--accent-color)] text-[var(--bg-app)] rounded-full hover:opacity-90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 border border-[var(--border-color)]"
            >
              {isTyping ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
            </button>
          </form>
        </div>

    </div>
  );
};

export default AIChatSidebar;
