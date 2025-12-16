import React, { useState } from 'react';
import { InventoryItem, AIAnalysisResult, Currency } from '../types';
import { analyzeStock } from '../services/geminiService';
import { Sparkles, Brain, CheckCircle, AlertOctagon, ArrowRight } from 'lucide-react';

interface AIAdvisorProps {
  items: InventoryItem[];
  currency: Currency;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ items, currency }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeStock(items, currency);
      setAnalysis(result);
    } catch (err) {
      setError("Impossible d'obtenir l'analyse IA. Vérifiez votre clé API ou réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center">
          <Brain className="w-8 h-8 text-indigo-600 mr-3" />
          Assistant Intelligent
        </h2>
        <p className="text-slate-500 mt-2">
          Utilisez la puissance de Gemini pour détecter les anomalies et optimiser votre stock.
        </p>
      </header>

      {!analysis && !loading && (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Prêt à analyser votre inventaire ?</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Notre IA va scanner vos {items.length} produits pour identifier les risques de rupture, les surstocks et les opportunités d'optimisation (Analyse en {currency.label}).
          </p>
          <button
            onClick={handleAnalysis}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
          >
            Lancer l'Analyse Intelligente
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-slate-700">Gemini analyse vos données...</p>
          <p className="text-sm text-slate-400 mt-2">Cela ne prend que quelques secondes.</p>
        </div>
      )}

      {error && (
         <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 flex items-start space-x-3">
           <AlertOctagon className="w-6 h-6 flex-shrink-0" />
           <p>{error}</p>
         </div>
      )}

      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Summary Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 text-indigo-500 mr-2" />
              Synthèse Stratégique
            </h3>
            <p className="text-slate-600 leading-relaxed text-lg">
              {analysis.summary}
            </p>
          </div>

          {/* Alerts */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <AlertOctagon className="w-5 h-5 text-amber-500 mr-2" />
              Alertes Critiques
            </h3>
            <ul className="space-y-3">
              {analysis.alerts.map((alert, idx) => (
                <li key={idx} className="flex items-start bg-amber-50/50 p-3 rounded-lg">
                  <span className="w-2 h-2 mt-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></span>
                  <span className="text-slate-700">{alert}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-green-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Recommandations d'Optimisation
            </h3>
            <ul className="space-y-3">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start bg-green-50/50 p-3 rounded-lg">
                  <ArrowRight className="w-4 h-4 mt-1 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-slate-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="lg:col-span-2 flex justify-end">
             <button
              onClick={handleAnalysis}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center bg-indigo-50 px-4 py-2 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Actualiser l'analyse
            </button>
          </div>
        </div>
      )}
    </div>
  );
};