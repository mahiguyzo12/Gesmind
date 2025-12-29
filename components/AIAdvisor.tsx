import React, { useState, useMemo } from 'react';
import { InventoryItem, Currency, ViewState } from '../types';
import { Loader2, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';

interface AIAdvisorProps {
  items: InventoryItem[];
  currency: Currency;
  onNavigate: (view: ViewState) => void;
}

interface Suggestion {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  action?: {
    label: string;
    targetView: ViewState;
  };
}

const generateInsights = (items: InventoryItem[], currency: Currency): Suggestion[] => {
  const insights: Suggestion[] = [];

  // 1. Surstock
  const overstockedItems = items
    .filter(item => item.quantity > 50 && item.purchasePrice > 0)
    .sort((a, b) => (b.quantity * b.purchasePrice) - (a.quantity * a.purchasePrice))
    .slice(0, 2);

  overstockedItems.forEach(item => {
    const stockValue = (item.quantity * item.purchasePrice * currency.rate).toFixed(2);
    insights.push({
      id: `overstock-${item.id}`,
      icon: TrendingDown,
      color: 'text-amber-500',
      title: `Surstock potentiel : ${item.name}`,
      description: `Vous avez ${item.quantity} unités, représentant une valeur de ${stockValue} ${currency.symbol}. Envisagez une promotion.`,
      action: {
        label: 'Voir en Stock',
        targetView: ViewState.INVENTORY,
      }
    });
  });

  // 2. Risque de rupture de stock
  const lowStockItems = items
    .filter(item => item.quantity > 0 && item.quantity <= (item.alertThreshold ?? 5))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 2);

  lowStockItems.forEach(item => {
    insights.push({
      id: `lowstock-${item.id}`,
      icon: AlertTriangle,
      color: 'text-red-500',
      title: `Risque de rupture : ${item.name}`,
      description: `Il ne reste que ${item.quantity} unité(s). Pensez à passer une nouvelle commande.`,
      action: {
        label: 'Gérer les Achats',
        targetView: ViewState.COMMERCIAL,
      }
    });
  });

  // 3. Produit le plus rentable
  const mostProfitable = items
    .filter(item => item.salePrice > item.purchasePrice && item.purchasePrice > 0)
    .sort((a, b) => (b.salePrice - b.purchasePrice) - (a.salePrice - a.purchasePrice))
    [0];

  if (mostProfitable) {
    const margin = ((mostProfitable.salePrice - mostProfitable.purchasePrice) * currency.rate).toFixed(2);
    insights.push({
      id: 'most-profitable',
      icon: TrendingUp,
      color: 'text-green-500',
      title: `Produit star : ${mostProfitable.name}`,
      description: `Ce produit génère une marge de ${margin} ${currency.symbol} par unité. Mettez-le en avant !`,
      action: {
        label: 'Analyser les Ventes',
        targetView: ViewState.DASHBOARD,
      }
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'no-insights',
      icon: Lightbulb,
      color: 'text-blue-500',
      title: "Tout semble en ordre !",
      description: "Continuez à ajouter des produits et des ventes pour obtenir des analyses plus fines."
    });
  }

  return insights;
};

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ items, currency, onNavigate }) => {
  const [isLoading, setIsLoading] = useState(true);

  const insights = useMemo(() => {
    setIsLoading(true);
    // Simule un délai pour l'analyse
    const timer = setTimeout(() => setIsLoading(false), 700);
    const result = generateInsights(items, currency);
    // Nettoyage au cas où le composant est démonté
    return () => {
      clearTimeout(timer);
      return result; // Retourne le résultat pour useMemo
    };
  }, [items, currency])(); // Exécute immédiatement la fonction retournée

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <div key={insight.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-start space-x-4">
          <insight.icon className={`w-6 h-6 mt-1 flex-shrink-0 ${insight.color}`} />
          <div className="flex-grow">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{insight.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{insight.description}</p>
          </div>
          {insight.action && (
            <button onClick={() => onNavigate(insight.action.targetView)} className="flex-shrink-0 self-center bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-300 font-semibold text-sm py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors">
              <span>{insight.action.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};