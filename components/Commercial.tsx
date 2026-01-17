
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem, Currency, User, Customer, Supplier, StoreSettings, RegisterStatus, PaymentMethod } from '../types';
import { ShoppingCart, TrendingUp, TrendingDown, Plus, Trash2, Search, FileText, CheckCircle, Printer, Filter, User as UserIcon, Truck, Clock, X, ChevronDown, Shield, Eye, Calculator, Lock, Info, Wallet, Smartphone, CreditCard, Banknote } from 'lucide-react';
import { checkTodayClosingStatus } from '../src/services/firestoreService';

interface CommercialProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  currency: Currency;
  currentUser: User;
  customers?: Customer[];
  suppliers?: Supplier[];
  storeSettings?: StoreSettings;
  supervisionTarget?: User | null;
}

export const Commercial: React.FC<CommercialProps> = ({ 
  inventory, 
  transactions, 
  onAddTransaction, 
  currency, 
  currentUser,
  customers = [],
  suppliers = [],
  storeSettings,
  supervisionTarget
}) => {
  // Main View State
  const [listFilterType, setListFilterType] = useState<'ALL' | 'SALE' | 'PURCHASE'>('ALL');
  const [listFilterStatus, setListFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  
  // Modal State for New Transaction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'SALE' | 'PURCHASE'>('SALE');
  
  // New Transaction Form State
  const [cartItems, setCartItems] = useState<TransactionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qtyInput, setQtyInput] = useState(0); 
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // For keyboard nav
  
  // Third Party Selection (Customer or Supplier)
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState('');
  
  // Payment State
  const [amountPaid, setAmountPaid] = useState<string>(''); 
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Permissions & Role Check
  const isAdmin = currentUser.role === 'ADMIN';
  const canSale = currentUser.permissions.includes('commercial.sale');
  const canPurchase = currentUser.permissions.includes('commercial.purchase');

  // LOCK STATE
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockInfo, setLockInfo] = useState<{reopeningTime: string, remainingText: string} | null>(null);

  // --- DATA FILTERING (SECURITY & SUPERVISION) ---
  const isSupervision = !!supervisionTarget;
  const targetId = supervisionTarget ? supervisionTarget.id : currentUser.id;

  const accessibleTransactions = (isAdmin && !isSupervision)
    ? transactions 
    : transactions.filter(t => t.sellerId === targetId);

  // --- INVENTORY FILTERING ---
  const accessibleInventory = (isAdmin && !isSupervision)
    ? inventory
    : inventory.filter(item => item.createdBy === targetId);

  // Helper for Product Dropdown
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close product dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [productDropdownRef]);

  // Format Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2
    }).format(amount * currency.rate);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'à l\'instant';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `il y a ${diffInHours} h`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Filter Logic (View)
  const filteredTransactions = accessibleTransactions.filter(t => {
    const matchType = listFilterType === 'ALL' || t.type === listFilterType;
    const matchStatus = listFilterStatus === 'ALL' || 
                        (listFilterStatus === 'PAID' && t.paymentStatus === 'PAID') ||
                        (listFilterStatus === 'UNPAID' && t.paymentStatus !== 'PAID');
    return matchType && matchStatus;
  });

  const filteredProducts = accessibleInventory.filter(item => 
    item.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  ).slice(0, 50); // Limit results for performance

  // --- LOGIC LOCK CHECK (MANDATORY UX) ---
  const checkRegisterLock = async (): Promise<boolean> => {
      const storeId = localStorage.getItem('gesmind_last_store_id');
      if (!storeId) return false; 

      // On vérifie le statut de clôture pour l'utilisateur concerné
      const result = await checkTodayClosingStatus(storeId, targetId);
      
      if (result.isLocked && result.reopenAt) {
          const lockedUntilDate = result.reopenAt;
          const now = new Date();
          const diffMs = lockedUntilDate.getTime() - now.getTime();
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          const reopeningTime = "00h00"; // Statut fixe demandé
          
          const remainingText = `${hours} heures ${minutes} minutes`;

          setLockInfo({ reopeningTime, remainingText });
          setIsLockModalOpen(true);
          return true; // LOCKED
      }
      return false; // OPEN
  };

  // --- Handlers ---

  const openNewTransaction = async (mode: 'SALE' | 'PURCHASE') => {
    if (mode === 'SALE' && !canSale) return;
    if (mode === 'PURCHASE' && !canPurchase) return;

    // BLOCKING ACTION IF LOCKED
    const isLocked = await checkRegisterLock();
    if (isLocked) return;

    setModalMode(mode);
    setCartItems([]);
    setSelectedThirdPartyId('');
    setProductSearchTerm('');
    setAmountPaid(''); // Reset payment field to force explicit entry
    setPaymentMethod('CASH'); // Default
    setQtyInput(0); 
    setIsModalOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchTerm(e.target.value);
    setIsProductDropdownOpen(true);
    setHighlightedIndex(0); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isProductDropdownOpen || filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        selectProduct(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsProductDropdownOpen(false);
    }
  };

  const selectProduct = (item: InventoryItem) => {
    setSelectedProductId(item.id);
    setProductSearchTerm(item.name);
    setIsProductDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    
    if (qtyInput <= 0) {
        alert("Veuillez saisir une quantité valide supérieure à 0.");
        return;
    }

    const product = inventory.find(i => i.id === selectedProductId);
    if (!product) return;

    if (modalMode === 'SALE' && qtyInput > product.quantity) {
      alert(`Stock insuffisant ! Disponible : ${product.quantity}`);
      return;
    }

    const newItem: TransactionItem = {
      productId: product.id,
      productName: product.name,
      quantity: qtyInput,
      unitPrice: product.price
    };

    setCartItems([...cartItems, newItem]);
    
    setSelectedProductId('');
    setProductSearchTerm('');
    setQtyInput(0);
    searchInputRef.current?.focus();
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  // IMPORTANT: For Purchases, we DO NOT auto-fill the payment amount.
  // This adheres to the rule: Invoice != Cash Movement.
  // User must explicitly type the amount if they are paying in cash.
  useEffect(() => {
    if (isModalOpen) {
        const total = calculateTotal();
        // Only autofill for SALES to speed up checkout. For PURCHASES, default to 0 (Unpaid/Credit).
        if (modalMode === 'SALE') {
            setAmountPaid((total * currency.rate).toFixed(2));
        } else {
            // For purchases, we default to empty or 0 to encourage "Invoice now, pay later" or explicit entry.
            // If we want to be helpful but safe:
            if (amountPaid === '') setAmountPaid('0'); 
        }
    }
  }, [cartItems, currency.rate, isModalOpen, modalMode]);

  const handleSubmitTransaction = () => {
    if (cartItems.length === 0) return;

    const totalBase = calculateTotal();
    const paidAmountBase = (parseFloat(amountPaid) || 0) / currency.rate;

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    let paidAtStr: string | undefined = undefined;

    if (paidAmountBase >= totalBase - 0.01) {
       paymentStatus = 'PAID';
       paidAtStr = new Date().toISOString();
    }
    else if (paidAmountBase > 0) paymentStatus = 'PARTIAL';

    let customerInfo = {};
    let supplierInfo = {};

    if (modalMode === 'SALE' && selectedThirdPartyId) {
      const customer = customers.find(c => c.id === selectedThirdPartyId);
      if (customer) {
        customerInfo = { customerId: customer.id, customerName: customer.name };
      }
    } else if (modalMode === 'PURCHASE' && selectedThirdPartyId) {
      const supplier = suppliers.find(s => s.id === selectedThirdPartyId);
      if (supplier) {
        supplierInfo = { supplierId: supplier.id, supplierName: supplier.name };
      }
    }

    const newTransaction: Transaction = {
      id: `T-${Date.now()}`,
      type: modalMode,
      date: new Date().toISOString(),
      items: cartItems,
      totalAmount: totalBase,
      amountPaid: paidAmountBase, // Explicitly tracked separate from Total
      paymentStatus: paymentStatus,
      paidAt: paidAtStr,
      paymentMethod: paymentMethod, // Include payment method
      status: 'COMPLETED',
      sellerId: currentUser.id, 
      sellerName: currentUser.name, 
      ...customerInfo,
      ...supplierInfo
    };

    onAddTransaction(newTransaction);
    setIsModalOpen(false);
  };

  // --- Printing Logic (Omitted for brevity, unchanged) ---
  const handlePrintInvoice = (tx: Transaction) => { /* ... */ };

  // --- Render ---

  const modalTotalBase = calculateTotal();
  const modalTotalDisplayed = modalTotalBase * currency.rate;
  const modalPaidDisplayed = parseFloat(amountPaid) || 0;
  const modalBalanceDue = Math.max(0, modalTotalDisplayed - modalPaidDisplayed);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center">
              Ventes/Achats
              {isSupervision && (
                  <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center shadow-sm">
                      <Eye className="w-3 h-3 mr-1"/> Supervision: {supervisionTarget?.name}
                  </span>
              )}
          </h2>
          <p className="text-slate-500">
             {isAdmin && !isSupervision ? 'Journal global des transactions.' : 'Historique des transactions.'}
          </p>
        </div>
        <div className="flex gap-3">
           {canSale && (
            <button 
                onClick={() => openNewTransaction('SALE')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-emerald-200 transition-colors"
            >
                <TrendingUp className="w-5 h-5 mr-2" /> Nouvelle Vente
            </button>
           )}
          {canPurchase && (
             <button 
              onClick={() => openNewTransaction('PURCHASE')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-blue-200 transition-colors"
            >
              <TrendingDown className="w-5 h-5 mr-2" /> Nouvel Achat
            </button>
          )}
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Type</span>
            <button onClick={() => setListFilterType('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>TOUT</button>
            <button onClick={() => setListFilterType('SALE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterType === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>VENTES</button>
            <button onClick={() => setListFilterType('PURCHASE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterType === 'PURCHASE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ACHATS</button>
        </div>
        <div className="w-px bg-slate-200 hidden md:block"></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Statut</span>
            <button onClick={() => setListFilterStatus('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>TOUT</button>
            <button onClick={() => setListFilterStatus('PAID')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>PAYÉ</button>
            <button onClick={() => setListFilterStatus('UNPAID')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${listFilterStatus === 'UNPAID' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>NON PAYÉ</button>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Détails</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Vendeur</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">Statut</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${tx.type === 'SALE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {tx.type === 'SALE' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {tx.type === 'SALE' ? 'Vente' : 'Achat'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 mb-1">{tx.customerName || tx.supplierName || 'Client de passage'}</span>
                        <div className="flex flex-wrap gap-1">
                            {tx.items.slice(0, 2).map((item, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                    {item.quantity}x {item.productName}
                                </span>
                            ))}
                            {tx.items.length > 2 && <span className="text-[10px] text-slate-400">+{tx.items.length - 2} autres</span>}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center">
                        <UserIcon className="w-3 h-3 mr-1.5 text-slate-400" />
                        {tx.sellerName.split(' ')[0]}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-slate-800">{formatCurrency(tx.totalAmount)}</div>
                    {tx.paymentStatus !== 'PAID' && (
                        <div className="text-xs text-red-500 font-medium mt-0.5">Reste: {formatCurrency(tx.totalAmount - tx.amountPaid)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tx.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 rounded-full text-emerald-600" title="Payé"><CheckCircle className="w-4 h-4" /></span>
                    ) : tx.paymentStatus === 'PARTIAL' ? (
                        <span className="inline-flex px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">PARTIEL</span>
                    ) : (
                        <span className="inline-flex px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold">IMPAYÉ</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button onClick={() => handlePrintInvoice(tx)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                         <Printer className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Aucune transaction trouvée.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* NEW TRANSACTION MODAL - FINANCIAL LOGIC UPDATE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-2 z-50 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-7xl h-full md:h-[95vh] flex flex-col animate-fade-in-up">
            
            {/* HEADER */}
            <div className={`flex justify-between items-center px-3 py-2 border-b shrink-0 ${modalMode === 'PURCHASE' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold flex items-center ${modalMode === 'PURCHASE' ? 'text-blue-700' : 'text-slate-800'}`}>
                        {modalMode === 'SALE' ? <TrendingUp className="w-4 h-4 mr-1 text-emerald-600"/> : <TrendingDown className="w-4 h-4 mr-1 text-blue-600"/>}
                        Nouvelle {modalMode === 'SALE' ? 'Vente' : 'Facture d\'Achat'}
                    </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full hover:bg-red-50 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* FINANCIAL WARNING FOR PURCHASES */}
            {modalMode === 'PURCHASE' && (
                <div className="bg-blue-100 border-b border-blue-200 px-4 py-2 text-xs text-blue-800 flex items-center shrink-0">
                    <Info className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                        Cette facture sera comptabilisée dans l'activité globale (Chiffre d'Affaires/Volume), 
                        mais <strong>n'impactera la caisse que si vous saisissez un "Montant Versé" ci-dessous</strong>.
                    </span>
                </div>
            )}

            {/* BODY (Inputs & Table) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
                {/* Inputs Row */}
                <div className="bg-white p-2 border-b border-slate-200 shrink-0 shadow-sm z-20">
                    <div className="flex flex-col md:flex-row gap-2">
                        {/* Third Party Select */}
                        <div className="w-full md:w-48">
                            <select 
                                className="w-full h-9 px-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-1 focus:ring-indigo-500 text-sm font-medium"
                                value={selectedThirdPartyId}
                                onChange={(e) => setSelectedThirdPartyId(e.target.value)}
                            >
                                <option value="">-- {modalMode === 'SALE' ? 'Client' : 'Fournisseur'} --</option>
                                {modalMode === 'SALE' 
                                    ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                    : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                }
                            </select>
                        </div>

                        {/* Search & Add Logic */}
                        <div className="flex-1 flex gap-1 relative" ref={productDropdownRef}>
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                                <input 
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Produit (Nom / SKU)..."
                                    className="w-full h-9 pl-7 pr-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    value={productSearchTerm}
                                    onChange={handleProductSearchChange}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => { if(productSearchTerm) setIsProductDropdownOpen(true) }}
                                    autoComplete="off"
                                />
                                {isProductDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-2 text-center text-slate-400 text-xs">Aucun produit</div>
                                    ) : (
                                        filteredProducts.map((item, index) => (
                                        <button
                                            key={item.id}
                                            className={`w-full text-left px-3 py-1.5 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors ${
                                                index === highlightedIndex ? 'bg-indigo-100' : 'hover:bg-indigo-50'
                                            }`}
                                            onClick={() => selectProduct(item)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-slate-800 block text-xs truncate">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{item.sku}</span>
                                            </div>
                                            <div className="text-right ml-2">
                                                <span className="font-bold text-indigo-600 block text-xs">{formatCurrency(item.price)}</span>
                                                <span className={`text-[10px] ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>Stock: {item.quantity}</span>
                                            </div>
                                        </button>
                                        ))
                                    )}
                                    </div>
                                )}
                            </div>
                            <input 
                                type="number"
                                min="0"
                                className="w-14 h-9 px-1 border border-indigo-200 rounded-lg text-center font-bold text-sm"
                                value={qtyInput}
                                onChange={(e) => setQtyInput(parseInt(e.target.value) || 0)}
                                placeholder="Qté"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
                            />
                            <button 
                                onClick={handleAddToCart}
                                disabled={!selectedProductId}
                                className="bg-indigo-600 text-white w-9 h-9 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Logic */}
                <div className="flex-1 overflow-auto bg-white p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-50 sticky top-0 z-10 shadow-sm text-[10px] uppercase font-bold">
                            <tr>
                                <th className="px-3 py-2">Produit</th>
                                <th className="px-3 py-2 text-center">Qté</th>
                                <th className="px-3 py-2 text-right">P.U.</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-2 py-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {cartItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 group">
                                    <td className="px-3 py-1.5 font-medium text-slate-800">{item.productName}</td>
                                    <td className="px-3 py-1.5 text-center font-mono">{item.quantity}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-3 py-1.5 text-right font-bold text-slate-800">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                    <td className="px-2 py-1.5 text-center">
                                        <button onClick={() => handleRemoveFromCart(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {cartItems.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 italic">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        Panier vide. Ajoutez des produits ci-dessus.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. FOOTER (Summary Horizontal Bar) */}
            <div className="bg-slate-100 border-t border-slate-200 p-2 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    
                    {/* Left: Total Global (Activity) */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Total Facture (Activité)</span>
                            <span className={`text-xl md:text-2xl font-bold ${modalMode === 'PURCHASE' ? 'text-blue-700' : 'text-indigo-700'}`}>
                                {formatCurrency(modalTotalBase)}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-300 hidden md:block"></div>
                        <div className="text-xs text-slate-500 hidden md:block">
                            {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Articles
                        </div>
                    </div>

                    {/* Right: Payment Input (Treasury Impact) */}
                    <div className="flex items-center gap-2 w-full md:w-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        
                        {/* PAYMENT METHOD SELECTOR */}
                        <div className="flex flex-col items-start px-2 border-r border-slate-100">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Mode</label>
                            <select
                                className="h-6 text-sm font-bold text-slate-800 bg-transparent outline-none border-none p-0 cursor-pointer w-24"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            >
                                <option value="CASH">Espèces</option>
                                <option value="MOBILE_MONEY">Mobile Money</option>
                                <option value="CARD">Carte Bancaire</option>
                                <option value="CHECK">Chèque</option>
                                <option value="OTHER">Autre</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-2 border-r border-slate-100 pr-3">
                            <div className="flex flex-col items-end">
                                <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center">
                                    <Wallet className="w-3 h-3 mr-1 text-slate-400" />
                                    {modalMode === 'PURCHASE' ? 'Règlement' : 'Versement'}
                                </label>
                                <div className="relative w-28">
                                    <input 
                                        type="number"
                                        className="w-full text-right font-bold text-slate-800 text-sm bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 p-0.5"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder={modalMode === 'SALE' ? modalTotalDisplayed.toFixed(0) : "0 (Non payé)"}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Reste Dû</label>
                                <span className={`text-sm font-mono font-bold ${modalBalanceDue > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatCurrency(modalBalanceDue / currency.rate)}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmitTransaction}
                            disabled={cartItems.length === 0}
                            className={`px-4 py-2 rounded-lg text-white font-bold text-sm shadow-md transition-all flex items-center whitespace-nowrap
                                ${cartItems.length > 0 
                                ? (modalMode === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700')
                                : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Valider
                        </button>
                    </div>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* --- REGISTER LOCKED MODAL --- */}
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
                  
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Caisse actuellement clôturée</h3>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 mt-4">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Réouverture automatique</span>
                          <span className="font-mono font-bold text-slate-800">{lockInfo?.reopeningTime}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temps restant</span>
                          <span className="font-bold text-indigo-600">{lockInfo?.remainingText}</span>
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
