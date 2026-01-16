
import React, { useState } from 'react';
import { Check, Globe, Search } from 'lucide-react';
import { GesmindLogo } from './GesmindLogo';

interface LanguageSelectorProps {
  onSelect: (langCode: string) => void;
}

// Liste restreinte aux langues principales supportées par l'application
export const ALL_LANGUAGES = [
  { code: 'fr', label: 'Français', sub: 'France / Afrique / Canada', flag: '🇫🇷' },
  { code: 'en', label: 'English', sub: 'USA / UK / World', flag: '🇺🇸' },
  { code: 'es', label: 'Español', sub: 'España / Latinoamérica', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', sub: 'Monde Arabe', flag: '🇸🇦' },
  { code: 'zh', label: '中文', sub: 'Chine / Singapour', flag: '🇨🇳' },
  { code: 'pt', label: 'Português', sub: 'Portugal / Brasil', flag: '🇵🇹' },
  { code: 'de', label: 'Deutsch', sub: 'Allemagne / Suisse', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', sub: 'Italie', flag: '🇮🇹' },
  { code: 'ru', label: 'Русский', sub: 'Russie', flag: '🇷🇺' },
  { code: 'ja', label: '日本語', sub: 'Japon', flag: '🇯🇵' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLanguages = ALL_LANGUAGES.filter(lang => 
    lang.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.sub.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in">
      
      <div className="mb-4 transform scale-75">
        <GesmindLogo />
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bienvenue / Welcome</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Sélectionnez la langue principale / Select main language
        </p>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-2 custom-scrollbar">
            {filteredLanguages.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                    {filteredLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => onSelect(lang.code)}
                        className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group text-left"
                    >
                        <span className="text-2xl mr-3" role="img" aria-label={lang.label}>{lang.flag}</span>
                        <div className="flex-1">
                        <span className="block font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {lang.label}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">
                            {lang.sub}
                        </span>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 flex items-center justify-center">
                           <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </button>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                    Aucune langue trouvée.
                </div>
            )}
        </div>
      </div>

      <div className="mt-6 flex items-center text-xs text-slate-400">
        <Globe className="w-3 h-3 mr-1" />
        Gesmind v{process.env.PACKAGE_VERSION || '1.0.0'}
      </div>
    </div>
  );
};
