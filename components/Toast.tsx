
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-indigo-600'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <AlertCircle className="w-5 h-5 text-white" />,
    info: <Info className="w-5 h-5 text-white" />
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center shadow-2xl rounded-full px-6 py-3 text-white ${bgColors[type]} animate-fade-in-up transition-all`}>
      <div className="mr-3">
        {icons[type]}
      </div>
      <span className="font-medium text-sm mr-4">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
