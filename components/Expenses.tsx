import React, { useState } from 'react';
import { Expense, ExpenseCategory, Currency, User } from '../types';
import {
  Plus,
  Trash2,
  Tag,
  Calendar,
  Banknote,
  Filter,
  PieChart,
  TrendingDown,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { checkTodayClosingStatus } from '../src/services/firestoreService';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  currency: Currency;
  currentUser: User;
}

const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
  { id: 'RENT', label: 'Loyer & Locaux', color: '#6366f1' },
  { id: 'SALARY', label: 'Salaires', color: '#ec4899' },
  { id: 'UTILITIES', label: 'Électricité / Eau', color: '#eab308' },
  { id: 'TRANSPORT', label: 'Transport', color: '#f97316' },
  { id: 'MARKETING', label: 'Marketing / Pub', color: '#8b5cf6' },
  { id: 'MAINTENANCE', label: 'Maintenance', color: '#14b8a6' },
  { id: 'TAX', label: 'Taxes & Impôts', color: '#ef4444' },
  { id: 'OTHER', label: 'Autre', color: '#64748b' },
];

export const Expenses: React.FC<ExpensesProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  currency,
  currentUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Delete Modal State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<
    string | null
  >(null);

  // Form State
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Lock State
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockInfo, setLockInfo] = useState<{
    reopeningTime: string;
    remainingText: string;
  } | null>(null);

  // Permission Check
  const canManageExpenses =
    currentUser.permissions.includes('expenses.manage') ||
    currentUser.role === 'ADMIN';

  const filteredExpenses = expenses.filter(
    (e) => filterCategory === 'ALL' || e.category === filterCategory
  );

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2,
    }).format(val * currency.rate);
  };

  const handleOpenAddModal = async () => {
    const storeId = localStorage.getItem('gesmind_last_store_id');
    if (storeId) {
      const result = await checkTodayClosingStatus(storeId, currentUser.id);
      if (result.isLocked && result.reopenAt) {
        const diffMs = result.reopenAt.getTime() - new Date().getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setLockInfo({
          reopeningTime: '00h00',
          remainingText: `${hours} heures ${minutes} minutes`,
        });
        setIsLockModalOpen(true);
        return;
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      amount: amount / currency.rate, // Store in Base Currency
      category,
      description,
      date: new Date(date).toISOString(),
      paidBy: currentUser.name,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount(0);
    setDescription('');
    setCategory('OTHER');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const requestDelete = (id: string) => {
    if (!canManageExpenses) return;
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      onDeleteExpense(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  // Chart Data Preparation
  const chartData = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.id)
      .reduce((acc, e) => acc + e.amount, 0);
    return { name: cat.label, value: total, color: cat.color };
  }).filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center">
            <TrendingDown className="w-8 h-8 mr-3 text-rose-500" />
            Gestion des Dépenses
          </h2>
          <p className="text-slate-500">
            Suivi des charges, frais généraux et salaires.
          </p>
        </div>
        {canManageExpenses && (
          <button
            onClick={handleOpenAddModal}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-rose-200 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Ajouter une dépense
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-slate-500" /> Répartition
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend
                    iconType="circle"
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '10px' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Aucune donnée
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <span className="text-slate-500 text-sm">Total Dépenses</span>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              Tout voir
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === cat.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-xs uppercase text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses
                  .slice()
                  .reverse()
                  .map((exp) => {
                    const catInfo =
                      CATEGORIES.find((c) => c.id === exp.category) ||
                      CATEGORIES[7];
                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(exp.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${catInfo.color}15`,
                              color: catInfo.color,
                            }}
                          >
                            {catInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {exp.description}{' '}
                          <span className="text-xs text-slate-400 block">
                            Par: {exp.paidBy}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600 font-mono">
                          -{formatCurrency(exp.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {canManageExpenses && (
                            <button
                              onClick={() => requestDelete(exp.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      Aucune dépense enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              Nouvelle Dépense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-lg font-bold text-slate-800"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                  />
                  <Banknote className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Catégorie
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 appearance-none bg-white"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ExpenseCategory)
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 h-24 resize-none"
                  placeholder="Ex: Facture électricité Janvier..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 shadow-lg shadow-rose-200"
                >
                  Enregistrer
                </button>
              </div>
            </form>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-2 border-rose-100">
            <div className="flex items-center space-x-3 mb-4 text-rose-600">
              <div className="bg-rose-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Supprimer ?</h3>
            </div>

            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              Êtes-vous sûr de vouloir supprimer cette dépense ?
              <br />
              <br />
              <span className="font-bold text-rose-600">Attention :</span> Cela
              annulera l'écriture comptable associée dans la trésorerie.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-lg shadow-rose-200 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
