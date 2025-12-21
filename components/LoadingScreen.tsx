import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Chargement...',
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      {/* Loader Animé (Cercle tournant) */}
      <div className="relative mb-6">
        {/* Cercle de fond */}
        <div className="w-16 h-16 rounded-full border-4 border-white/20"></div>
        {/* Arc tournant */}
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
      </div>

      {/* Message */}
      <p className="text-white font-medium text-lg tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};
