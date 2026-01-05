import React, { useEffect, useState } from 'react';
import { CheckIcon } from './Icons';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] animate-enter">
      <div className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3.5 rounded-full shadow-2xl border border-slate-700/50">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
          <CheckIcon className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold tracking-wide">{message}</span>
      </div>
    </div>
  );
};

export default Toast;