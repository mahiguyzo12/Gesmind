import React from 'react';
import { InventoryItem, Currency, Transaction, Expense, User } from '../types';
import {
  AlertTriangle,
  PackageCheck,
  ShoppingBag,
  PieChart,
  Wallet,
  BarChart3,
  Activity,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardProps {
  inventory: InventoryItem[];
  currency: Currency;
  transactions?: Transaction[];
  expenses?: Expense[];
  currentUser?: User;
  supervisionTarget?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  inventory,
  currency,
  transactions = [],
  expenses = [],
  currentUser,
  supervisionTarget,
}) => {
  // If supervising, we act AS IF we are that user (or viewing that user's data),
  // but isAdmin is based on the REAL logged in user (currentUser)
  // However, for filtering data, we check if we are in supervision mode.

  const isAdmin = currentUser?.role === 'ADMIN';
  const targetUser = supervisionTarget || currentUser; // Whose data to show?
  const isSupervisionMode = !!supervisionTarget;

  // --- FILTRAGE DES DONNÉES ---
  // 1. Si Admin et PAS de supervision -> Voit TOUT.
  // 2. Si Admin et Supervision -> Voit seulement les données de la cible.
  // 3. Si Vendeur -> Voit seulement ses données.

  const shouldFilter = !isAdmin || isSupervisionMode;
  const filterId = targetUser?.id;

  const myTransactions = shouldFilter
    ? transactions.filter((t) => t.sellerId === filterId)
    : transactions;

  const myExpenses = shouldFilter
    ? expenses.filter((e) => e.paidBy.includes(targetUser?.name || ''))
    : expenses;

  // --- FILTRAGE STOCK ---
  const myStock = shouldFilter
    ? inventory.filter((item) => item.createdBy === filterId)
    : inventory;

  // --- CALCULS (Séparation Activité vs Trésorerie) ---

  // 1. ACTIVITÉ ÉCONOMIQUE (Factures)
  // Total Ventes (Facturées, payées ou non)
  const totalSalesVolume =
    myTransactions
      .filter((t) => t.type === 'SALE')
      .reduce((acc, t) => acc + t.totalAmount, 0) * currency.rate;

  // Total Achats (Facturés, payés ou non)
  const totalPurchasesVolume =
    myTransactions
      .filter((t) => t.type === 'PURCHASE')
      .reduce((acc, t) => acc + t.totalAmount, 0) * currency.rate;

  // Marge Brute Théorique (basée sur les factures de vente)
  let grossProfit = 0;
  myTransactions
    .filter((t) => t.type === 'SALE')
    .forEach((tx) => {
      tx.items.forEach((item) => {
        const product = inventory.find((p) => p.id === item.productId);
        const purchasePrice = product ? product.purchasePrice || 0 : 0;
        const margin = item.unitPrice - purchasePrice;
        grossProfit += margin * item.quantity;
      });
    });
  const realizedGrossProfit = grossProfit * currency.rate;

  // 2. TRÉSORERIE (Cash Réel)
  // Entrées Cash (Ventes payées)
  const cashInSales =
    myTransactions
      .filter((t) => t.type === 'SALE')
      .reduce((acc, t) => acc + t.amountPaid, 0) * currency.rate;
  // Sorties Cash (Achats payés)
  const cashOutPurchases =
    myTransactions
      .filter((t) => t.type === 'PURCHASE')
      .reduce((acc, t) => acc + t.amountPaid, 0) * currency.rate;
  // Dépenses (Toujours cash/débit immédiat dans ce modèle simplifié)
  const cashOutExpenses =
    myExpenses.reduce((acc, e) => acc + e.amount, 0) * currency.rate;

  // Solde Trésorerie (Flux nets)
  // Note: Ce calcul est une approximation basée sur les transactions visibles.
  // La "vraie" trésorerie inclut aussi les apports/retraits manuels (via Treasury), non dispo ici en props simple.
  // On affiche donc le "Cash Flow Opérationnel"
  const operatingCashFlow = cashInSales - cashOutPurchases - cashOutExpenses;

  const lowStockItems = myStock.filter(
    (item) => item.quantity <= item.minQuantity
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2,
    }).format(value);
  };

  const chartData = myStock
    .map((item) => ({
      name:
        item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name,
      stock: item.quantity,
      min: item.minQuantity,
    }))
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">
              Tableau de Bord
            </h2>
            <p className="text-slate-500">
              {isAdmin && !isSupervisionMode
                ? "Vue Globale de l'entreprise"
                : `Performances de ${targetUser?.name}`}
            </p>
          </div>
          {isSupervisionMode ? (
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center">
              <Eye className="w-3 h-3 mr-1" /> Supervision Active
            </span>
          ) : null}
        </div>
      </header>

      {/* SECTION 1: PERFORMANCE ÉCONOMIQUE (Factures) */}
      <div className="mb-2 flex items-center space-x-2">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-700">
          Activité Globale (Facturé)
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CA (Ventes) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Chiffre d&apos;Affaires
                </p>
                <h3 className="text-2xl font-bold text-blue-700 mt-1">
                  {formatCurrency(totalSalesVolume)}
                </h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Total ventes (encaissées ou non)
            </p>
          </div>
        </div>

        {/* Volume Achats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Volume d&apos;Achats
                </p>
                <h3 className="text-2xl font-bold text-purple-700 mt-1">
                  {formatCurrency(totalPurchasesVolume)}
                </h3>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Total factures fournisseurs
            </p>
          </div>
        </div>

        {/* Marge Commerciale */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Marge Commerciale
                </p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                  {formatCurrency(realizedGrossProfit)}
                </h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">Sur ventes réalisées</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: TRÉSORERIE (Cash) */}
      <div className="mb-2 flex items-center space-x-2">
        <Wallet className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-bold text-slate-700">
          Flux de Trésorerie (Réel)
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Entrées (Ventes)
          </span>
          <div className="text-lg font-bold text-emerald-600 mt-1">
            +{formatCurrency(cashInSales)}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Sorties (Achats)
          </span>
          <div className="text-lg font-bold text-rose-500 mt-1">
            -{formatCurrency(cashOutPurchases)}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Dépenses (Charges)
          </span>
          <div className="text-lg font-bold text-orange-500 mt-1">
            -{formatCurrency(cashOutExpenses)}
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${operatingCashFlow >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase">
            Flux Net Opérationnel
          </span>
          <div
            className={`text-xl font-bold mt-1 ${operatingCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {operatingCashFlow > 0 ? '+' : ''}
            {formatCurrency(operatingCashFlow)}
          </div>
        </div>
      </div>

      {/* Row 3 - Stock Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            Niveaux de Stock{' '}
            {isAdmin && !isSupervisionMode
              ? '(Global)'
              : `(${targetUser?.name})`}
          </h3>
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar
                    dataKey="stock"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.stock <= entry.min ? '#f59e0b' : '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Aucun produit dans{' '}
                {isAdmin && !isSupervisionMode ? "l'inventaire" : 'ce stock'}.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-center">
            <span>Alertes Stock</span>
            {lowStockItems.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {lowStockItems.length}
              </span>
            )}
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-8">
                Tout est en ordre. Aucun stock critique.
              </p>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      Stock:{' '}
                      <span className="font-bold text-red-600">
                        {item.quantity}
                      </span>{' '}
                      (Min: {item.minQuantity})
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
