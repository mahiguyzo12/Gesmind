
import React, { useState } from 'react';
import { User, Transaction, Currency } from '../types';
import { Briefcase, TrendingUp, Receipt, ChevronRight, User as UserIcon } from 'lucide-react';

interface SalesTeamProps {
  users: User[];
  transactions: Transaction[];
  currency: Currency;
}

export const SalesTeam: React.FC<SalesTeamProps> = ({ users, transactions, currency }) => {
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const sellers = users.filter(u => u.role === 'SELLER');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2
    }).format(amount * currency.rate);
  };

  // Get Stats for a specific user
  const getUserStats = (userId: string, commissionRate: number = 0) => {
    const userSales = transactions.filter(t => t.sellerId === userId && t.type === 'SALE');
    const totalSalesAmount = userSales.reduce((acc, t) => acc + t.totalAmount, 0);
    const totalCommission = totalSalesAmount * (commissionRate / 100);
    return {
      count: userSales.length,
      total: totalSalesAmount,
      commission: totalCommission,
      sales: userSales
    };
  };

  const selectedSeller = selectedSellerId ? users.find(u => u.id === selectedSellerId) : null;
  const selectedSellerStats = selectedSeller ? getUserStats(selectedSeller.id, selectedSeller.commissionRate) : null;

  return (
    <div className="space-y-6">
       <header className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center">
          <Briefcase className="w-8 h-8 text-indigo-600 mr-3" />
          Équipe Commerciale
        </h2>
        <p className="text-slate-500 mt-2">Suivi des performances individuelles et des factures associées.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List of Sellers */}
        <div className="lg:col-span-1 space-y-4">
           <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Commerciaux</h3>
           {sellers.map(seller => {
             const stats = getUserStats(seller.id, seller.commissionRate);
             const isSelected = selectedSellerId === seller.id;
             
             return (
               <button
                key={seller.id}
                onClick={() => setSelectedSellerId(seller.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group
                  ${isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-white border-slate-100 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
               >
                 <div className="flex items-center space-x-4">
                   <img 
                    src={seller.avatar} 
                    alt={seller.name} 
                    className={`w-12 h-12 rounded-full border-2 ${isSelected ? 'border-white/30' : 'border-slate-100'}`} 
                   />
                   <div className="flex-1 min-w-0">
                     <p className={`font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{seller.name}</p>
                     <div className="flex items-center text-xs mt-1 space-x-2">
                       <span className={`${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                         {stats.count} Ventes
                       </span>
                       <span className={`px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                         {seller.commissionRate || 0}% Com.
                       </span>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {formatCurrency(stats.total)}
                      </p>
                      <ChevronRight className={`w-4 h-4 ml-auto mt-1 ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`} />
                   </div>
                 </div>
               </button>
             );
           })}
           
           {sellers.length === 0 && (
             <div className="text-center p-8 bg-white rounded-xl border border-slate-100 text-slate-400">
               Aucun commercial enregistré.
             </div>
           )}
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-2">
          {selectedSeller && selectedSellerStats ? (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Cards for Selected Seller */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm text-slate-500">Chiffre d'Affaires</span>
                     <TrendingUp className="w-5 h-5 text-emerald-500" />
                   </div>
                   <p className="text-2xl font-bold text-slate-800">{formatCurrency(selectedSellerStats.total)}</p>
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm text-slate-500">Commissions Estimées</span>
                     <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                       {selectedSeller.commissionRate}%
                     </span>
                   </div>
                   <p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedSellerStats.commission)}</p>
                 </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 flex items-center">
                     <Receipt className="w-4 h-4 mr-2 text-slate-500" />
                     Factures associées
                   </h3>
                   <span className="text-xs text-slate-500">{selectedSellerStats.count} factures</span>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                       <tr>
                         <th className="px-6 py-3">ID Facture</th>
                         <th className="px-6 py-3">Date</th>
                         <th className="px-6 py-3">Articles</th>
                         <th className="px-6 py-3 text-right">Montant</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {selectedSellerStats.sales.map(tx => (
                         <tr key={tx.id} className="hover:bg-slate-50 text-sm">
                           <td className="px-6 py-4 font-medium text-slate-700">{tx.id}</td>
                           <td className="px-6 py-4 text-slate-500">
                             {new Date(tx.date).toLocaleDateString()}
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                             {tx.items.length} produit(s)
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-slate-800">
                             {formatCurrency(tx.totalAmount)}
                           </td>
                         </tr>
                       ))}
                       {selectedSellerStats.sales.length === 0 && (
                         <tr>
                           <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                             Aucune vente réalisée pour le moment.
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-slate-400">
               <UserIcon className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-lg">Sélectionnez un commercial pour voir les détails.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
