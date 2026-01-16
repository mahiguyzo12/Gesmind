
import React, { useEffect, useState } from 'react';
import { GesmindLogo } from './GesmindLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.9);

  useEffect(() => {
    // Séquence d'animation d'entrée
    const entryTimer = setTimeout(() => {
      setOpacity(1);
      setScale(1);
    }, 100);

    // Séquence de sortie et navigation
    const exitTimer = setTimeout(() => {
      setOpacity(0);
      setScale(1.1); // Zoom léger en sortant
      // Déclenche la fin réelle après la transition CSS
      setTimeout(onFinish, 700); 
    }, 2500); // Durée totale d'affichage (~2.5s)

    return () => {
      clearTimeout(entryTimer);
      clearTimeout(exitTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ease-in-out"
      style={{ 
        opacity: opacity,
        // Dégradé vert demandé (#4CAF50 -> #81C784)
        background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)' 
      }}
    >
      {/* Conteneur du Logo avec animation d'échelle */}
      <div 
        className="mb-16 transition-transform duration-700 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Fond blanc translucide pour faire ressortir le logo sur le vert */}
        <div className="bg-white/90 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
           <GesmindLogo className="w-32 h-32 md:w-40 md:h-40" />
        </div>
      </div>

      {/* Loader Animé (Cercle tournant) */}
      <div className="relative">
        {/* Cercle de fond */}
        <div className="w-12 h-12 rounded-full border-4 border-white/20"></div>
        {/* Arc tournant */}
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
      </div>
      
      {/* Version / Copyright en bas */}
      <div className="absolute bottom-8 text-white/80 text-xs font-medium tracking-widest font-mono">
        GESMIND v{process.env.PACKAGE_VERSION || '1.0.0'}
      </div>
    </div>
  );
};
