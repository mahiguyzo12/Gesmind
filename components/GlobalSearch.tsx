import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Package,
  FileText,
  User as UserIcon,
  ArrowRight,
  X,
  Eye,
} from 'lucide-react';
import {
  InventoryItem,
  Transaction,
  User,
  ViewState,
  Currency,
} from '../types';

interface GlobalSearchProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  users: User[];
  onNavigate: (view: ViewState) => void;
  currency: Currency;
  currentUser?: User;
  supervisionTarget?: User | null;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  inventory,
  transactions,
  users,
  onNavigate,
  currency,
  currentUser,
  supervisionTarget,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSupervision = !!supervisionTarget;
  const targetId = supervisionTarget ? supervisionTarget.id : currentUser?.id;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(e.target.value.length > 0);
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
  };

  const handleSelect = (view: ViewState) => {
    onNavigate(view);
    clearSearch();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
    }).format(val * currency.rate);
  };

  // --- FILTERED DATA SOURCES ---
  const searchableTransactions =
    isAdmin && !isSupervision
      ? transactions
      : transactions.filter((t) => t.sellerId === targetId);

  // STRICT INVENTORY FILTER
  const searchableInventory =
    isAdmin && !isSupervision
      ? inventory
      : inventory.filter((item) => item.createdBy === targetId);

  // Filter Logic
  const filteredInventory = query
    ? searchableInventory
        .filter(
          (item) =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.sku.toLowerCase().includes(query.toLowerCase()) ||
            item.category.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 3)
    : [];

  const filteredTransactions = query
    ? searchableTransactions
        .filter(
          (tx) =>
            tx.id.toLowerCase().includes(query.toLowerCase()) ||
            tx.sellerName.toLowerCase().includes(query.toLowerCase()) ||
            tx.items.some((i) =>
              i.productName.toLowerCase().includes(query.toLowerCase())
            )
        )
        .slice(0, 3)
    : [];

  const filteredUsers =
    query && isAdmin && !isSupervision
      ? users
          .filter(
            (u) =>
              u.name.toLowerCase().includes(query.toLowerCase()) ||
              u.role.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 2)
      : [];

  const hasResults =
    filteredInventory.length > 0 ||
    filteredTransactions.length > 0 ||
    filteredUsers.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full mb-4 z-30">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isSupervision ? (
            <Eye className="h-4 w-4 text-amber-500 animate-pulse" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          className={`block w-full pl-10 pr-10 py-2.5 border-0 rounded-xl leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-sm transition-all text-sm ${isSupervision ? 'focus:ring-amber-500/30' : 'focus:ring-indigo-500/20'}`}
          placeholder={
            isAdmin && !isSupervision
              ? 'Rechercher partout...'
              : `Rechercher dans les données de ${supervisionTarget ? supervisionTarget.name : 'VOS données'}...`
          }
          value={query}
          onChange={handleSearch}
          onFocus={() => {
            if (query) setIsOpen(true);
          }}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-fade-in-up origin-top">
          {!hasResults ? (
            <div className="p-8 text-center text-slate-500">
              Aucun résultat trouvé pour &quot;{query}&quot;
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Inventory Results */}
              {filteredInventory.length > 0 && (
                <div className="py-2">
                  <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Package className="w-3 h-3 mr-2" /> Stocks
                  </h4>
                  {filteredInventory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(ViewState.INVENTORY)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.sku} • {item.category}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full mr-3 ${item.quantity <= item.minQuantity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                        >
                          Stock: {item.quantity}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Transactions Results */}
              {filteredTransactions.length > 0 && (
                <div className="py-2 border-t border-slate-50">
                  <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <FileText className="w-3 h-3 mr-2" />{' '}
                    {isAdmin && !isSupervision
                      ? 'Transactions'
                      : 'Vos Transactions'}
                  </h4>
                  {filteredTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => handleSelect(ViewState.COMMERCIAL)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          Ref {tx.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.date).toLocaleDateString()} • par{' '}
                          {tx.sellerName}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-slate-700 mr-3">
                          {formatCurrency(tx.totalAmount)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Users Results (Admin only) */}
              {filteredUsers.length > 0 && (
                <div className="py-2 border-t border-slate-50">
                  <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <UserIcon className="w-3 h-3 mr-2" /> Utilisateurs
                  </h4>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelect(ViewState.USERS)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                    >
                      <div className="flex items-center">
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full border border-slate-200 mr-3"
                        />
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500">{user.role}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
