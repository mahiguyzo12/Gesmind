
import React, { useState } from 'react';
import { CashMovement, CashClosing, Currency, User, Transaction, Customer } from '../types';
import { Wallet, TrendingUp, TrendingDown, Plus, Minus, ShieldAlert, Archive, Clock, Lock, CheckCircle, FileText, AlertOctagon, ArrowUpRight, ArrowDownLeft, RefreshCw, HandCoins, Shield, Eye } from 'lucide-react';

interface TreasuryProps {
  movements: CashMovement[];
  closings: CashClosing[];
  transactions?: Transaction[]; 
  onAddMovement: (movement: CashMovement) => void;
  onClosePeriod: () => void;
  onSettleTransaction?: (id: string, amount: number) => void;
  lastClosingDate?: string;
  currency: Currency;
  currentUser: User;
  customers?: Customer[];
  supervisionTarget?: User | null;
}

export const Treasury: React.FC<TreasuryProps> = ({ 
  movements, 
  closings,
  transactions = [],
  onAddMovement, 
  onClosePeriod,
  onSettleTransaction,
  lastClosingDate,
  currency, 
  currentUser,
  customers = [],
  supervisionTarget
}) => {
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY' | 'DEBTS'>('CURRENT');
  const isAdmin = currentUser.role === 'ADMIN';
  
  // Modal states
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);

  // --- FILTERING LOGIC (SUPERVISION) ---
  const isSupervision = !!supervisionTarget;
  const targetName = supervisionTarget ? supervisionTarget.name : currentUser.name;

  // Si Admin et PAS de supervision -> Voit TOUT.
  // Si Admin et Supervision -> Voit seulement les mouvements de la cible.
  // Si Vendeur -> Voit seulement ses mouvements.
  
  const displayedMovements = (isAdmin && !isSupervision)
    ? movements 
    : movements.filter(m => m.performedBy.includes(targetName));

  // Calculate Global Balance (Visible to Admin only or calculated based on personal movements for seller)
  const globalBalance = movements.reduce((acc, m) => {
    if (m.type === 'SALE' || m.type === 'DEPOSIT') return acc + m.amount;
    return acc - m.amount;
  }, 0);

  // Filter movements since last closing for "Current Session"
  const lastCloseTime = lastClosingDate ? new Date(lastClosingDate).getTime() : 0;
  const currentSessionMovements = displayedMovements.filter(m => new Date(m.date).getTime() > lastCloseTime);
  
  const sessionIn = currentSessionMovements.filter(m => m.type === 'SALE' || m.type === 'DEPOSIT').reduce((acc, m) => acc + m.amount, 0);
  const sessionOut = currentSessionMovements.filter(m => m.type === 'PURCHASE' || m.type === 'WITHDRAWAL' || m.type === 'EXPENSE').reduce((acc, m) => acc + m.amount, 0);
  const sessionBalance = sessionIn - sessionOut;

  // Unpaid Transactions
  const unpaidTransactions = transactions.filter(t => t.paymentStatus !== 'PAID');
  const customerDebts = unpaidTransactions.filter(t => t.type === 'SALE');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2
    }).format(val * currency.rate);
  };

  const getCustomerName = (tx: Transaction) => {
    if (tx.customerName) return tx.customerName;
    if (tx.customerId) {
        const found = customers.find(c => c.id === tx.customerId);
        if (found) return found.name;
    }
    return 'Client de passage';
  };

  const handleManualMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const newMovement: CashMovement = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString(),
      type: type,
      amount: amount / currency.rate, 
      description: desc || (type === 'DEPOSIT' ? 'Dépôt manuel' : 'Retrait manuel'),
      performedBy: currentUser.name // App.tsx handles renaming if supervision
    };

    onAddMovement(newMovement);
    setIsMovementModalOpen(false);
    setAmount(0);
    setDesc('');
  };

  const openSettleModal = (tx: Transaction) => {
    setSelectedDebtId(tx.id);
    const dueBase = tx.totalAmount - tx.amountPaid;
    setSettleAmount(parseFloat((dueBase * currency.rate).toFixed(2))); 
    setIsSettleModalOpen(true);
  };
  
  const handleSelectDebtForRecovery = (txId: string) => {
     if (!txId) {
         setSelectedDebtId(null);
         setSettleAmount(0);
         return;
     }
     const tx = customerDebts.find(t => t.id === txId);
     if (tx) {
         setSelectedDebtId(txId);
         const dueBase = tx.totalAmount - tx.amountPaid;
         setSettleAmount(parseFloat((dueBase * currency.rate).toFixed(2)));
     }
  };

  const confirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDebtId && settleAmount > 0 && onSettleTransaction) {
      onSettleTransaction(selectedDebtId, settleAmount);
      setIsSettleModalOpen(false);
      setIsRecoveryModalOpen(false); 
      setSelectedDebtId(null);
    }
  };

  const confirmClosePeriod = () => {
    if (window.confirm("Clôturer la caisse définitivement ?")) {
      onClosePeriod();
      setIsCloseModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center">
              Trésorerie & Caisse
              {isSupervision && (
                  <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center shadow-sm">
                      <Eye className="w-3 h-3 mr-1"/> Supervision: {supervisionTarget?.name}
                  </span>
              )}
          </h2>
          <p className="text-slate-500">
             {isAdmin && !isSupervision ? 'Gestion globale des flux.' : 'Journal de caisse personnel.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
            onClick={() => setIsRecoveryModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-indigo-200 transition-colors"
          >
            <HandCoins className="w-5 h-5 mr-2" /> Recouvrement
          </button>
          <button 
            onClick={() => { setType('DEPOSIT'); setIsMovementModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-emerald-200 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Dépôt
          </button>
          <button 
             onClick={() => { setType('WITHDRAWAL'); setIsMovementModalOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-red-200 transition-colors"
          >
            <Minus className="w-5 h-5 mr-2" /> Retrait
          </button>
        </div>
      </header>

      {/* Global Balance Card (Only visible to Admin for total, Sellers see their session) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <p className="text-slate-400 font-medium mb-1 uppercase tracking-wider text-xs">
             {isAdmin && !isSupervision ? 'Solde Global Actuel' : 'Solde de session'}
          </p>
          <h3 className="text-4xl font-bold tracking-tight">
             {isAdmin && !isSupervision ? formatCurrency(globalBalance) : formatCurrency(sessionBalance)}
          </h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Dernière clôture : {lastClosingDate ? new Date(lastClosingDate).toLocaleString() : 'Jamais'}
          </p>
        </div>
        <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600">
          <Wallet className="w-10 h-10 text-emerald-400" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('CURRENT')}
            className={`${
              activeTab === 'CURRENT'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Session en cours
          </button>

          {isAdmin && !isSupervision && (
            <button
                onClick={() => setActiveTab('HISTORY')}
                className={`${
                activeTab === 'HISTORY'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
                <Archive className="w-4 h-4 mr-2" />
                Historique Clôtures
            </button>
          )}

          <button
            onClick={() => setActiveTab('DEBTS')}
            className={`${
              activeTab === 'DEBTS'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            <AlertOctagon className="w-4 h-4 mr-2" />
            Créances & Dettes
          </button>
        </nav>
      </div>

      {/* TAB CONTENT: CURRENT SESSION */}
      {activeTab === 'CURRENT' && (
        <div className="animate-fade-in space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 gap-4">
             <div className="flex items-center space-x-4">
               <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm">
                 <RefreshCw className="w-6 h-6" />
               </div>
               <div>
                 <h4 className="font-bold text-indigo-900">Mouvements Récents</h4>
                 <p className="text-xs text-indigo-700">
                    {isAdmin && !isSupervision ? 'Tous les mouvements' : 'Vos mouvements'} depuis le {lastClosingDate ? new Date(lastClosingDate).toLocaleDateString() : 'début'}
                 </p>
               </div>
             </div>
             
             <div className="flex items-center gap-6">
               <div className="text-right">
                 <span className="block text-xs text-indigo-600 uppercase font-bold">Variation</span>
                 <span className={`text-xl font-bold ${sessionBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                   {sessionBalance >= 0 ? '+' : ''}{formatCurrency(sessionBalance)}
                 </span>
               </div>

               {isAdmin && !isSupervision && (
                <button 
                    onClick={() => setIsCloseModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-200 flex items-center transition-all"
                >
                    <Lock className="w-4 h-4 mr-2" /> Clôturer la caisse
                </button>
               )}
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Heure</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Flux</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[300px]">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Opérateur</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-40">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSessionMovements.slice().reverse().map(m => {
                    const isPositive = m.type === 'SALE' || m.type === 'DEPOSIT';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono whitespace-nowrap">
                          {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                             isPositive 
                             ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                             : 'bg-red-50 text-red-700 border border-red-100'
                           }`}>
                             {isPositive ? <ArrowDownLeft className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                             {m.type === 'SALE' ? 'Vente' : m.type === 'PURCHASE' ? 'Achat' : m.type === 'DEPOSIT' ? 'Dépôt' : m.type === 'EXPENSE' ? 'Dépense' : 'Retrait'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                          <div className="whitespace-normal break-words" title={m.description}>
                            {m.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-2">
                              {m.performedBy.charAt(0)}
                            </div>
                            {m.performedBy.split(' ')[0]}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold font-mono text-sm whitespace-nowrap ${
                          isPositive ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {isPositive ? '+' : '-'}{formatCurrency(m.amount)}
                        </td>
                      </tr>
                    );
                  })}
                  {currentSessionMovements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Aucun mouvement pour votre session en cours.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: HISTORY (ADMIN ONLY) */}
      {activeTab === 'HISTORY' && isAdmin && !isSupervision && (
        <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Date Clôture</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Auteur</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Entrées</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Sorties</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-40">Solde Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closings.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                        {new Date(c.date).toLocaleDateString()} <span className="text-slate-400 text-xs ml-1">{new Date(c.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          c.type === 'AUTO' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                        }`}>
                          {c.type === 'AUTO' ? 'AUTOMATIQUE' : 'MANUEL'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{c.closedBy}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 text-sm font-mono bg-emerald-50/30 whitespace-nowrap">+{formatCurrency(c.totalIn)}</td>
                      <td className="px-6 py-4 text-right text-red-600 text-sm font-mono bg-red-50/30 whitespace-nowrap">-{formatCurrency(c.totalOut)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono border-l border-slate-100 whitespace-nowrap">{formatCurrency(c.closingBalance)}</td>
                    </tr>
                  ))}
                  {closings.length === 0 && (
                     <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        Aucune clôture archivée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DEBTS & RECEIVABLES */}
      {activeTab === 'DEBTS' && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start space-x-3">
              <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <span className="font-bold">Gestion des Impayés :</span> Vous pouvez ici régulariser les factures non soldées. 
                Toute régularisation créera automatiquement un mouvement d'entrée ou de sortie dans la caisse du jour.
              </p>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[800px]">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Facture</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Type</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Client / Fournisseur</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-48">Progression Paiement</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Reste Dû</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-32">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {unpaidTransactions.map(tx => {
                      const due = tx.totalAmount - tx.amountPaid;
                      const percentPaid = Math.min(100, (tx.amountPaid / tx.totalAmount) * 100);
                      return (
                       <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                           #{tx.id} <br/> <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString()}</span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${tx.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                             {tx.type === 'SALE' ? 'Vente' : 'Achat'}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-sm text-slate-600 font-medium whitespace-normal break-words">
                           {getCustomerName(tx) || (tx.supplierName || 'Inconnu')}
                         </td>
                         <td className="px-6 py-4 text-right align-middle">
                            <div className="w-32 ml-auto">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                 <span>{Math.round(percentPaid)}%</span>
                                 <span>{formatCurrency(tx.totalAmount)}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                 <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percentPaid}%` }}></div>
                              </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right font-mono font-bold text-red-600 text-sm whitespace-nowrap">
                           {formatCurrency(due)}
                         </td>
                         <td className="px-6 py-4 text-center whitespace-nowrap">
                            <button 
                              onClick={() => openSettleModal(tx)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200"
                            >
                              Solder
                            </button>
                         </td>
                       </tr>
                      );
                   })}
                   {unpaidTransactions.length === 0 && (
                     <tr>
                       <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                         <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                         Tout est en ordre ! Aucune dette ni créance en cours.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {/* ... (Existing Modals code remains unchanged) ... */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {type === 'DEPOSIT' ? 'Enregistrer un dépôt' : 'Enregistrer un retrait'}
            </h3>
            <form onSubmit={handleManualMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant ({currency.code})</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Raison</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Ex: Fond de caisse, Paiement facture..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-4 py-2 text-slate-600">Annuler</button>
                <button 
                  type="submit" 
                  className={`px-6 py-2 text-white rounded-lg font-medium ${type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* ... (Other modals) ... */}
      {isSettleModalOpen && selectedDebtId && !isRecoveryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Règlement Facture #{selectedDebtId}</h3>
            <form onSubmit={confirmSettle} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant à régler ({currency.code})</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-lg font-bold"
                    value={settleAmount}
                    onChange={e => setSettleAmount(parseFloat(e.target.value))}
                  />
               </div>
               <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                 Cela va mettre à jour la facture et créer une entrée "Règlement Solde" dans la caisse du jour.
               </div>
               <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsSettleModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm">Annuler</button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
              <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
                <HandCoins className="w-6 h-6 mr-2 text-indigo-600" /> Recouvrement Client
              </h3>
              <p className="text-sm text-slate-500 mb-6">Sélectionnez une facture impayée pour l'encaisser.</p>

              <form onSubmit={confirmSettle} className="space-y-5">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sélectionner Client / Facture</label>
                    <select 
                      className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
                      onChange={(e) => handleSelectDebtForRecovery(e.target.value)}
                      value={selectedDebtId || ''}
                    >
                      <option value="">-- Choisir un impayé --</option>
                      {customerDebts.map(tx => {
                        const due = (tx.totalAmount - tx.amountPaid) * currency.rate;
                        return (
                           <option key={tx.id} value={tx.id}>
                             {getCustomerName(tx)} - Facture #{tx.id} (Reste: {new Intl.NumberFormat('fr-FR', {style: 'currency', currency: currency.code}).format(due)})
                           </option>
                        );
                      })}
                    </select>
                 </div>

                 {selectedDebtId && (
                   <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 animate-fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-indigo-900">Montant à encaisser</span>
                      </div>
                      <div className="relative">
                         <input 
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full pl-4 pr-12 py-3 border border-indigo-200 rounded-lg text-xl font-bold text-indigo-900"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(parseFloat(e.target.value))}
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-400">{currency.code}</span>
                      </div>
                   </div>
                 )}

                 <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={() => setIsRecoveryModalOpen(false)} className="px-4 py-2 text-slate-600">Annuler</button>
                    <button 
                      type="submit" 
                      disabled={!selectedDebtId || settleAmount <= 0}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-100"
                    >
                      Valider l'encaissement
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
      
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-4 text-indigo-900">
               <div className="bg-indigo-100 p-2 rounded-full">
                  <Lock className="w-6 h-6 text-indigo-600" />
               </div>
               <h3 className="text-xl font-bold">Clôture de Caisse</h3>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 mb-6 border border-slate-100">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-600">Total Entrées (Session)</span>
                 <span className="font-bold text-emerald-600">+{formatCurrency(sessionIn)}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-600">Total Sorties (Session)</span>
                 <span className="font-bold text-red-600">-{formatCurrency(sessionOut)}</span>
               </div>
               <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                 <span>Solde théorique fin</span>
                 <span>{formatCurrency(globalBalance)}</span>
               </div>
            </div>

            <p className="text-sm text-slate-500 mb-6">
              Cette action va générer un rapport Z et marquer tous les mouvements actuels comme archivés. Une nouvelle session démarrera immédiatement.
            </p>

            <div className="flex justify-end space-x-3">
               <button 
                 onClick={() => setIsCloseModalOpen(false)} 
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
               >
                 Annuler
               </button>
               <button 
                 onClick={confirmClosePeriod}
                 className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200"
               >
                 Confirmer la clôture
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
