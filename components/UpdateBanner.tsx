import React from 'react';
import { AppUpdate } from '../types';
import { Download, X, Gift } from 'lucide-react';

interface UpdateBannerProps {
  update: AppUpdate;
  onClose: () => void;
  themeColor: string;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ update, onClose, themeColor }) => {
  if (!update.hasUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 p-4 z-50 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
             <Gift className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white">Mise à jour disponible !</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              v{update.currentVersion} <span className="text-slate-300">➜</span> <span className="text-emerald-600 font-bold">v{update.latestVersion}</span>
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mt-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 max-h-20 overflow-y-auto">
         {update.releaseNotes}
      </div>

      <div className="mt-4 flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Plus tard
        </button>
        <a 
          href={update.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-xs font-bold text-white rounded-lg shadow-md flex items-center justify-center transition-transform hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          <Download className="w-3 h-3 mr-1.5" />
          Installer
        </a>
      </div>
    </div>
  );
};