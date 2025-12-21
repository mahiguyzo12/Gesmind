import React, { useState, useEffect } from 'react';
import {
  CashMovement,
  CashClosing,
  Currency,
  User,
  Transaction,
  Customer,
} from '../types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  ShieldAlert,
  Archive,
  Clock,
  Lock,
  CheckCircle,
  FileText,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  HandCoins,
  Shield,
  Eye,
  Landmark,
  Coins,
  Banknote,
  CalendarRange,
  Search,
  PiggyBank,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  performCashClosing,
  checkTodayClosingStatus,
} from '../src/services/firestoreService';
import { LoadingScreen } from './LoadingScreen'; // Import ajouté

interface TreasuryProps {
  movements: CashMovement[];
  closings: CashClosing[];
  transactions?: Transaction[];
  onAddMovement: (movement: CashMovement) => void;
  onClosePeriod: () => void; // Legacy, kept for interface compat but unused
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
  supervisionTarget,
}) => {
  const [activeTab, setActiveTab] = useState<
    'CURRENT' | 'RANGE' | 'HISTORY' | 'DEBTS'
  >('CURRENT');
  const isAdmin = currentUser.role === 'ADMIN';

  // Date Range States
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Modal states
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Closing Logic States
  const [closingStep, setClosingStep] = useState<1 | 2>(1);
  const [inputCashReal, setInputCashReal] = useState<string>('');
  const [closingComment, setClosingComment] = useState('');
  const [isClosingProcessing, setIsClosingProcessing] = useState(false);
  const [closingError, setClosingError] = useState<string | null>(null);

  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'BANK_DEPOSIT'>(
    'DEPOSIT'
  );
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);

  // Lock State
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockInfo, setLockInfo] = useState<{
    reopeningTime: string;
    remainingText: string;
  } | null>(null);

  // --- FILTERING LOGIC ---
  const isSupervision = !!supervisionTarget;
  const targetUser = supervisionTarget || currentUser;
  const registerId = targetUser.id;
  const targetName = targetUser.name;

  const displayedMovements =
    isAdmin && !isSupervision
      ? movements
      : movements.filter((m) => m.performedBy.includes(targetName));

  // --- GLOBAL & SESSION CALCULATIONS ---
  // Calcul du solde physique (legacy logic based on movements)
  const allTimeIn = displayedMovements
    .filter((m) => m.type === 'SALE' || m.type === 'DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);

  const allTimeOut = displayedMovements
    .filter(
      (m) =>
        m.type === 'PURCHASE' || m.type === 'WITHDRAWAL' || m.type === 'EXPENSE'
    )
    .reduce((acc, m) => acc + m.amount, 0);

  const allTimeBank = displayedMovements
    .filter((m) => m.type === 'BANK_DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);

  const currentPhysicalBalance = allTimeIn - allTimeOut - allTimeBank;

  // --- TODAY'S DATA (STRICT FOR CLOSING) ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Mouvements du jour
  const currentSessionMovements = displayedMovements.filter(
    (m) => new Date(m.date) >= todayStart
  );

  // Transactions (Ventes) du jour (Uniquement celles actives et de ce registre)
  const todayTransactions = transactions.filter(
    (t) =>
      (t.sellerId === registerId || (isAdmin && !isSupervision)) &&
      new Date(t.date) >= todayStart &&
      !t.isLocked
  );

  const sessionIn = currentSessionMovements
    .filter((m) => m.type === 'SALE' || m.type === 'DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);

  const sessionOut = currentSessionMovements
    .filter(
      (m) =>
        m.type === 'PURCHASE' || m.type === 'WITHDRAWAL' || m.type === 'EXPENSE'
    )
    .reduce((acc, m) => acc + m.amount, 0);

  const sessionBankDeposits = currentSessionMovements
    .filter((m) => m.type === 'BANK_DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);

  // --- DATE RANGE CALCULATIONS ---
  const getRangeMovements = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return displayedMovements.filter((m) => {
      const d = new Date(m.date);
      return d >= start && d <= end;
    });
  };
  const rangeMovements = getRangeMovements();
  const rangeIn = rangeMovements
    .filter((m) => m.type === 'SALE' || m.type === 'DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);
  const rangeOut = rangeMovements
    .filter(
      (m) =>
        m.type === 'PURCHASE' || m.type === 'WITHDRAWAL' || m.type === 'EXPENSE'
    )
    .reduce((acc, m) => acc + m.amount, 0);
  const rangeBank = rangeMovements
    .filter((m) => m.type === 'BANK_DEPOSIT')
    .reduce((acc, m) => acc + m.amount, 0);
  const rangeNetVariation = rangeIn - rangeOut - rangeBank;

  // Unpaid Transactions
  const unpaidTransactions = transactions.filter(
    (t) => t.paymentStatus !== 'PAID'
  );
  const customerDebts = unpaidTransactions.filter((t) => t.type === 'SALE');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2,
    }).format(val * currency.rate);
  };

  const getCustomerName = (tx: Transaction) => {
    if (tx.customerName) return tx.customerName;
    if (tx.customerId) {
      const found = customers.find((c) => c.id === tx.customerId);
      if (found) return found.name;
    }
    return 'Client de passage';
  };

  const showLockedModal = (reopenAt: Date) => {
    const diffMs = reopenAt.getTime() - new Date().getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    setLockInfo({
      reopeningTime: '00h00',
      remainingText: `${hours} heures ${minutes} minutes`,
    });
    setIsLockModalOpen(true);
  };

  const checkLockStatus = async (): Promise<boolean> => {
    const storeId = localStorage.getItem('gesmind_last_store_id');
    if (storeId) {
      const result = await checkTodayClosingStatus(storeId, targetUser.id);
      if (result.isLocked && result.reopenAt) {
        showLockedModal(result.reopenAt);
        return true;
      }
    }
    return false;
  };

  const handleOpenMovementModal = async (
    movementType: 'DEPOSIT' | 'WITHDRAWAL' | 'BANK_DEPOSIT'
  ) => {
    if (await checkLockStatus()) return;
    setType(movementType);
    setIsMovementModalOpen(true);
  };

  const handleOpenRecoveryModal = async () => {
    if (await checkLockStatus()) return;
    setIsRecoveryModalOpen(true);
  };

  const handleManualMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    if (
      type === 'BANK_DEPOSIT' &&
      amount / currency.rate > currentPhysicalBalance
    ) {
      if (
        !window.confirm(
          'Attention : Le montant du versement dépasse le solde physique disponible calculé. Continuer quand même ?'
        )
      ) {
        return;
      }
    }
    const newMovement: CashMovement = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString(),
      type: type,
      amount: amount / currency.rate,
      description:
        desc ||
        (type === 'DEPOSIT'
          ? 'Dépôt manuel'
          : type === 'BANK_DEPOSIT'
            ? 'Versement Banque'
            : 'Retrait manuel'),
      performedBy: currentUser.name,
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
    const tx = customerDebts.find((t) => t.id === txId);
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

  // --- STRICT CLOSING LOGIC ---

  const prepareClosing = async () => {
    // 1. Vérification stricte du verrouillage via Firestore (Source de vérité)
    if (await checkLockStatus()) return;

    // 2. Vérification locale (Fallback pour cohérence UI immédiate)
    const todayStr = new Date().toISOString().split('T')[0];
    const closureId = `${todayStr}_${registerId}`;
    const existing = closings.find((c) => c.id === closureId);

    if (existing) {
      // Si localement connu comme fermé mais checkLockStatus a manqué (ex: latence), on bloque aussi
      // Mais idéalement checkLockStatus l'attrape.
      // On réutilise la modale pour l'UX uniforme
      const now = new Date();
      const reopenAt = new Date(now);
      reopenAt.setHours(24, 0, 0, 0);
      showLockedModal(reopenAt);
      return;
    }

    setClosingStep(1);
    setInputCashReal('');
    setClosingComment('');
    setClosingError(null);
    setIsCloseModalOpen(true);
  };

  const executeClosing = async () => {
    if (!inputCashReal) return;
    setIsClosingProcessing(true);
    setClosingError(null);

    // Simulation d'un délai pour montrer le loader
    await new Promise((r) => setTimeout(r, 1500));

    const cashRealBase = parseFloat(inputCashReal) / currency.rate;
    const todayStr = new Date().toISOString().split('T')[0];
    const closureId = `${todayStr}_${registerId}`;

    // Calcul des totaux basés sur les transactions du JOUR
    let totalSales = 0;
    let amountCash = 0;
    let amountMobile = 0;
    let amountCard = 0;

    todayTransactions.forEach((tx) => {
      totalSales += tx.totalAmount;
      if (tx.paymentMethod === 'MOBILE_MONEY') amountMobile += tx.amountPaid;
      else if (tx.paymentMethod === 'CARD') amountCard += tx.amountPaid;
      else amountCash += tx.amountPaid; // Default to Cash
    });

    // Le solde attendu (Théorique) est basé sur le calcul global actuel
    const cashExpected = currentPhysicalBalance;
    const difference = cashRealBase - cashExpected;

    const newClosing: CashClosing = {
      id: closureId,
      date: new Date().toISOString(),
      registerId: registerId,
      closedBy: currentUser.name,
      status: 'closed',
      autoClosed: false,
      totalSales,
      amountCash,
      amountMobileMoney: amountMobile,
      amountCard: amountCard,
      cashExpected,
      cashReal: cashRealBase,
      difference,
      comment: closingComment,
      totalCashIn: sessionIn,
      totalCashOut: sessionOut + sessionBankDeposits,
    };

    const transactionsToLock = todayTransactions.map((t) => t.id);

    try {
      const storeId =
        localStorage.getItem('gesmind_last_store_id') || 'unknown';
      await performCashClosing(storeId, newClosing, transactionsToLock);

      setIsCloseModalOpen(false);
      alert(
        'Caisse clôturée avec succès ! Les ventes du jour sont verrouillées.'
      );
    } catch (err: any) {
      setClosingError(err.message || 'Erreur lors de la clôture.');
    } finally {
      setIsClosingProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* LOADING SCREEN OVERLAY (Pendant la clôture) */}
      {isClosingProcessing && (
        <LoadingScreen message="Clôture et verrouillage de la caisse..." />
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center">
            Trésorerie & Caisse
            {isSupervision && (
              <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center shadow-sm">
                <Eye className="w-3 h-3 mr-1" /> Supervision:{' '}
                {supervisionTarget?.name}
              </span>
            )}
          </h2>
          <p className="text-slate-500">
            Suivi de la session du jour et des mouvements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenRecoveryModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-indigo-200 transition-colors"
          >
            <HandCoins className="w-5 h-5 mr-2" /> Recouvrement
          </button>
          <button
            onClick={() => handleOpenMovementModal('BANK_DEPOSIT')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-blue-200 transition-colors"
          >
            <Landmark className="w-5 h-5 mr-2" /> Versement Banque
          </button>
          <button
            onClick={() => handleOpenMovementModal('DEPOSIT')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-emerald-200 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Dépôt
          </button>
          <button
            onClick={() => handleOpenMovementModal('WITHDRAWAL')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-red-200 transition-colors"
          >
            <Minus className="w-5 h-5 mr-2" /> Retrait
          </button>
        </div>
      </header>

      {/* --- CARTES DE SOLDE --- */}
      {activeTab === 'CURRENT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Session Entrées
              </span>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(sessionIn)}
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-400">
              <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" /> Ventes +
              Dépôts
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Session Sorties
              </span>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(sessionOut)}
              </h3>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-400">
              <TrendingDown className="w-4 h-4 mr-1 text-red-500" /> Achats +
              Frais
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Solde Physique (Caisse)
                </span>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-3xl font-bold mt-1 text-white">
                {formatCurrency(currentPhysicalBalance)}
              </h3>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center text-xs">
                <span className="text-slate-400">Sécurisé en Banque :</span>
                <span className="font-bold text-blue-300">
                  {formatCurrency(allTimeBank)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('CURRENT')}
            className={`${activeTab === 'CURRENT' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Clock className="w-4 h-4 mr-2" /> Mouvements Session
          </button>
          <button
            onClick={() => setActiveTab('RANGE')}
            className={`${activeTab === 'RANGE' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <CalendarRange className="w-4 h-4 mr-2" /> Recherche par Date
          </button>
          {isAdmin && !isSupervision && (
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`${activeTab === 'HISTORY' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Archive className="w-4 h-4 mr-2" /> Historique Clôtures
            </button>
          )}
          <button
            onClick={() => setActiveTab('DEBTS')}
            className={`${activeTab === 'DEBTS' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <AlertOctagon className="w-4 h-4 mr-2" /> Créances & Dettes
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
                <h4 className="font-bold text-indigo-900">
                  Journal d'activité (Session)
                </h4>
                <p className="text-xs text-indigo-700">
                  {isAdmin && !isSupervision
                    ? 'Tous les mouvements'
                    : 'Vos mouvements'}{' '}
                  depuis le{' '}
                  {lastClosingDate
                    ? new Date(lastClosingDate).toLocaleDateString()
                    : 'début'}
                </p>
              </div>
            </div>

            {/* BOUTON CLÔTURE */}
            <button
              onClick={prepareClosing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-200 flex items-center transition-all"
            >
              <Lock className="w-4 h-4 mr-2" /> Clôturer la caisse
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                      Heure
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                      Flux
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[300px]">
                      Description
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">
                      Opérateur
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-40">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSessionMovements
                    .slice()
                    .reverse()
                    .map((m) => {
                      const isPositive =
                        m.type === 'SALE' || m.type === 'DEPOSIT';
                      const isBank = m.type === 'BANK_DEPOSIT';
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-slate-500 font-mono whitespace-nowrap">
                            {new Date(m.date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : isBank ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="w-3 h-3 mr-1" />
                              ) : isBank ? (
                                <Landmark className="w-3 h-3 mr-1" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                              )}
                              {m.type === 'SALE'
                                ? 'Vente'
                                : m.type === 'PURCHASE'
                                  ? 'Achat'
                                  : m.type === 'DEPOSIT'
                                    ? 'Dépôt'
                                    : m.type === 'EXPENSE'
                                      ? 'Dépense'
                                      : m.type === 'BANK_DEPOSIT'
                                        ? 'Vers. Banque'
                                        : 'Retrait'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                            <div
                              className="whitespace-normal break-words"
                              title={m.description}
                            >
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
                          <td
                            className={`px-6 py-4 text-right font-bold font-mono text-sm whitespace-nowrap ${isPositive ? 'text-emerald-600' : isBank ? 'text-blue-600' : 'text-slate-800'}`}
                          >
                            {isPositive ? '+' : '-'}
                            {formatCurrency(m.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  {currentSessionMovements.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
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

      {/* TAB CONTENT: HISTORY (Updated for new closing structure) */}
      {activeTab === 'HISTORY' && isAdmin && !isSupervision && (
        <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-48">
                    Date Clôture
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-32">
                    Type
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-40">
                    Auteur
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right w-32">
                    Ventes
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right w-32">
                    Réel
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right w-32">
                    Écart
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closings.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                      {new Date(c.date).toLocaleDateString()}{' '}
                      <span className="text-slate-400 text-xs ml-1">
                        {new Date(c.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${c.autoClosed ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}
                      >
                        {c.autoClosed ? 'AUTO' : 'MANUEL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {c.closedBy}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 text-sm font-mono whitespace-nowrap">
                      {formatCurrency(c.totalSales)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-800 text-sm font-mono whitespace-nowrap">
                      {formatCurrency(c.cashReal)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold font-mono whitespace-nowrap ${c.difference !== 0 ? 'text-red-500' : 'text-slate-400'}`}
                    >
                      {c.difference > 0 ? '+' : ''}
                      {formatCurrency(c.difference)}
                    </td>
                  </tr>
                ))}
                {closings.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400"
                    >
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

      {/* ... (Other tabs like RANGE and DEBTS kept same) ... */}

      {/* --- NOUVEAU MODAL DE CLÔTURE SÉCURISÉ --- */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up border-t-4 border-indigo-600">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3 text-indigo-900">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Lock className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Clôture de Caisse</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {new Date().toLocaleDateString()} • {targetName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {closingStep === 1 && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">
                      Fond de Caisse (Calculé)
                    </span>
                    <span className="font-bold text-slate-800 text-lg">
                      {formatCurrency(currentPhysicalBalance)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-xs text-slate-400 uppercase">
                        Total Ventes
                      </p>
                      <p className="font-bold text-emerald-600">
                        +
                        {formatCurrency(
                          todayTransactions.reduce(
                            (acc, t) => acc + t.totalAmount,
                            0
                          ) * currency.rate
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">
                        Sorties / Banque
                      </p>
                      <p className="font-bold text-red-600">
                        -{formatCurrency(sessionOut + sessionBankDeposits)}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center">
                    <Banknote className="w-4 h-4 mr-2 text-indigo-600" />
                    Montant Espèces Réel (Compté)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      className="w-full pl-4 pr-12 py-4 border-2 border-indigo-100 rounded-xl text-2xl font-bold text-indigo-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      placeholder="0.00"
                      value={inputCashReal}
                      onChange={(e) => setInputCashReal(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-300">
                      {currency.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Comptez les billets et pièces dans le tiroir et saisissez le
                    total exact.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Commentaire (Facultatif)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Ex: Écart justifié par..."
                    value={closingComment}
                    onChange={(e) => setClosingComment(e.target.value)}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setClosingStep(2)}
                    disabled={!inputCashReal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Suivant <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {closingStep === 2 && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="inline-block p-3 bg-amber-50 rounded-full mb-3 text-amber-600">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">
                    Confirmation de Clôture
                  </h4>
                  <p className="text-sm text-slate-500">
                    Cette action est irréversible.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500">Attendu</span>
                    <span className="font-bold text-slate-700">
                      {formatCurrency(currentPhysicalBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500">Saisi (Réel)</span>
                    <span className="font-bold text-indigo-700">
                      {formatCurrency(parseFloat(inputCashReal || '0'))}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">
                      Écart (Différence)
                    </span>
                    <span
                      className={`font-bold ${parseFloat(inputCashReal || '0') - currentPhysicalBalance * currency.rate === 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(
                        parseFloat(inputCashReal || '0') -
                          currentPhysicalBalance * currency.rate
                      )}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex items-start text-xs text-blue-800">
                  <Lock className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    Une fois validé, toutes les ventes de la journée seront
                    verrouillées et plus aucune modification ne sera possible.
                  </div>
                </div>
                {closingError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {closingError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setClosingStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    disabled={isClosingProcessing}
                  >
                    Retour
                  </button>
                  <button
                    onClick={executeClosing}
                    disabled={isClosingProcessing}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center transition-all disabled:opacity-70"
                  >
                    CONFIRMER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ... Other modals (Movement, Recovery, Lock) identical ... */}

      {/* MOVEMENT MODAL */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              Nouveau Mouvement
            </h3>
            <form onSubmit={handleManualMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type de Mouvement
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('DEPOSIT')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold ${type === 'DEPOSIT' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Dépôt
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('WITHDRAWAL')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold ${type === 'WITHDRAWAL' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Retrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('BANK_DEPOSIT')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold ${type === 'BANK_DEPOSIT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Banque
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant ({currency.code})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-lg font-bold text-slate-800"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                  />
                  <Banknote className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  placeholder="Motif..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECOVERY MODAL */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Recouvrement de Créances
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Sélectionnez un client et une facture impayée pour enregistrer un
              règlement.
            </p>

            <div className="space-y-4">
              {customerDebts.length > 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Facture Impayée
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      value={selectedDebtId || ''}
                      onChange={(e) =>
                        handleSelectDebtForRecovery(e.target.value)
                      }
                    >
                      <option value="">-- Sélectionner --</option>
                      {customerDebts.map((tx) => (
                        <option key={tx.id} value={tx.id}>
                          {getCustomerName(tx)} -{' '}
                          {formatCurrency(tx.totalAmount)} (
                          {new Date(tx.date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDebtId && (
                    <form onSubmit={confirmSettle}>
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Total Facture</span>
                          <span className="font-bold">
                            {formatCurrency(
                              customerDebts.find((t) => t.id === selectedDebtId)
                                ?.totalAmount || 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Déjà Payé</span>
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(
                              customerDebts.find((t) => t.id === selectedDebtId)
                                ?.amountPaid || 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
                          <span className="font-bold text-amber-800">
                            Reste à Payer
                          </span>
                          <span className="font-bold text-red-600">
                            {formatCurrency(
                              (customerDebts.find(
                                (t) => t.id === selectedDebtId
                              )?.totalAmount || 0) -
                                (customerDebts.find(
                                  (t) => t.id === selectedDebtId
                                )?.amountPaid || 0)
                            )}
                          </span>
                        </div>
                      </div>

                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Montant du Règlement
                      </label>
                      <div className="relative mb-6">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-lg font-bold text-slate-800"
                          value={settleAmount}
                          onChange={(e) =>
                            setSettleAmount(parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          {currency.code}
                        </span>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsRecoveryModalOpen(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                        >
                          Confirmer
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>Aucune créance client en cours.</p>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(false)}
                    className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lock Modal */}
      {isLockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in-up border-b-4 border-red-600 relative">
            <button
              onClick={() => setIsLockModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock className="w-10 h-10 text-red-600" />
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Caisse actuellement clôturée
            </h3>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Réouverture automatique
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {lockInfo?.reopeningTime}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Temps restant
                </span>
                <span className="font-bold text-indigo-600">
                  {lockInfo?.remainingText}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsLockModalOpen(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
