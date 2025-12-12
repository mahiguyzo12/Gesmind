
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionType, TransactionItem, Currency, User, Customer, Supplier, StoreSettings } from '../types';
import { ShoppingCart, TrendingUp, TrendingDown, Plus, Trash2, Search, FileText, CheckCircle, Printer, Filter, User as UserIcon, Truck, Clock, X, ChevronDown, Shield, Eye, Calculator } from 'lucide-react';

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
  
  // Permissions & Role Check
  const isAdmin = currentUser.role === 'ADMIN';
  const canSale = currentUser.permissions.includes('commercial.sale');
  const canPurchase = currentUser.permissions.includes('commercial.purchase');

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

  // --- Handlers ---

  const openNewTransaction = (mode: 'SALE' | 'PURCHASE') => {
    if (mode === 'SALE' && !canSale) return;
    if (mode === 'PURCHASE' && !canPurchase) return;

    setModalMode(mode);
    setCartItems([]);
    setSelectedThirdPartyId('');
    setProductSearchTerm('');
    setAmountPaid('');
    setQtyInput(0); 
    setIsModalOpen(true);
    // Focus after open
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchTerm(e.target.value);
    setIsProductDropdownOpen(true);
    setHighlightedIndex(0); // Reset selection on typing
  };

  // KEYBOARD NAVIGATION FOR DROPDOWN
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
    // Focus back to search for speed
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

  useEffect(() => {
    if (isModalOpen) {
        const total = calculateTotal();
        setAmountPaid((total * currency.rate).toFixed(2));
    }
  }, [cartItems, currency.rate, isModalOpen]);

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
      amountPaid: paidAmountBase,
      paymentStatus: paymentStatus,
      paidAt: paidAtStr,
      status: 'COMPLETED',
      sellerId: currentUser.id, 
      sellerName: currentUser.name, 
      ...customerInfo,
      ...supplierInfo
    };

    onAddTransaction(newTransaction);
    setIsModalOpen(false);
  };

  // --- Printing Logic ---
  const handlePrintInvoice = (tx: Transaction) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const total = tx.totalAmount * currency.rate;
    const paid = tx.amountPaid * currency.rate;
    const due = total - paid;
    
    const logoHtml = storeSettings?.logoUrl 
      ? `<img src="${storeSettings.logoUrl}" style="max-height: 80px; max-width: 200px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />` 
      : '';

    const htmlContent = `
      <html>
        <head>
          <title>Facture ${tx.id}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-top: 5px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .meta-box { width: 45%; }
            .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .value { font-size: 14px; margin-bottom: 5px; font-weight: 500; }
            table { w-full; border-collapse: collapse; margin-bottom: 30px; width: 100%; }
            th { text-align: left; border-bottom: 1px solid #ccc; padding: 10px; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .totals { float: right; width: 40%; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
            .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="company-name">${storeSettings?.name || 'StockMind Store'}</div>
            <div>${storeSettings?.address || ''}</div>
            <div>${storeSettings?.phone || ''}</div>
          </div>

          <div class="meta">
            <div class="meta-box">
              <div class="label">Client / Tiers</div>
              <div class="value">${tx.customerName || tx.supplierName || 'Client de passage'}</div>
              <div class="label" style="margin-top:10px;">Émis par</div>
              <div class="value">${tx.sellerName}</div>
            </div>
            <div class="meta-box" style="text-align:right;">
              <div class="label">Facture N°</div>
              <div class="value">#${tx.id}</div>
              <div class="label" style="margin-top:10px;">Date</div>
              <div class="value">${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th style="text-align:center;">Qté</th>
                <th style="text-align:right;">P.U.</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tx.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td style="text-align:center;">${item.quantity}</td>
                  <td style="text-align:right;">${(item.unitPrice * currency.rate).toFixed(2)}</td>
                  <td style="text-align:right;">${(item.unitPrice * item.quantity * currency.rate).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row total-final">
              <span>Total TTC</span>
              <span>${formatCurrency(tx.totalAmount)}</span>
            </div>
            <div class="total-row">
              <span>Montant Versé</span>
              <span>${formatCurrency(tx.amountPaid)}</span>
            </div>
            ${due > 0.01 ? `
            <div class="total-row" style="color:red;">
              <span>Reste à payer</span>
              <span>${formatCurrency(tx.totalAmount - tx.amountPaid)}</span>
            </div>
            ` : `
             <div class="total-row" style="color:green; font-weight:bold; margin-top:5px;">
              FACTURE SOLDÉE
            </div>
            ${tx.paidAt ? `
             <div class="total-row" style="font-size:10px; color:#666; margin-top:0;">
              Le ${new Date(tx.paidAt).toLocaleDateString()} à ${new Date(tx.paidAt).toLocaleTimeString()}
            </div>
            ` : ''}
            `}
          </div>

          <div style="clear:both;"></div>

          <div class="footer">
            Merci de votre confiance !<br/>
            ${storeSettings?.email || ''}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  // --- Render ---

  // Calculated values for the modal
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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
         {!isAdmin && !isSupervision && (
             <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded font-bold flex items-center">
                 <Shield className="w-3 h-3 mr-1" /> Vos données uniquement
             </span>
         )}
         <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Type:</span>
            <select 
              value={listFilterType}
              onChange={(e) => setListFilterType(e.target.value as any)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-slate-50"
            >
              <option value="ALL">Tout</option>
              <option value="SALE">Ventes</option>
              <option value="PURCHASE">Achats</option>
            </select>
         </div>
         <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-600">Statut:</span>
            <select 
              value={listFilterStatus}
              onChange={(e) => setListFilterStatus(e.target.value as any)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-slate-50"
            >
              <option value="ALL">Tout</option>
              <option value="PAID">Soldé</option>
              <option value="UNPAID">Non Soldé / Partiel</option>
            </select>
         </div>
      </div>

      {/* TRANSACTION LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Ref & Date</th>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Tiers</th>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Détails</th>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Montant</th>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Statut</th>
                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredTransactions.slice().reverse().map(tx => (
                   <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4">
                       <div className="font-medium text-slate-900 flex items-center gap-2">
                         {tx.type === 'SALE' ? <TrendingUp className="w-4 h-4 text-emerald-600"/> : <TrendingDown className="w-4 h-4 text-blue-600"/>}
                         #{tx.id}
                       </div>
                       <div className="text-xs text-slate-500 mt-1 flex items-center">
                         <Clock className="w-3 h-3 mr-1" />
                         {formatTimeAgo(tx.date)}
                       </div>
                       <div className="text-[10px] text-slate-400 mt-0.5">
                         Par: {tx.sellerName}
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       {tx.customerName ? (
                         <div className="flex items-center text-sm text-slate-700">
                           <UserIcon className="w-3 h-3 mr-1 text-slate-400" /> {tx.customerName}
                         </div>
                       ) : tx.supplierName ? (
                         <div className="flex items-center text-sm text-slate-700">
                           <Truck className="w-3 h-3 mr-1 text-slate-400" /> {tx.supplierName}
                         </div>
                       ) : (
                         <span className="text-xs text-slate-400 italic">Passage</span>
                       )}
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600">
                       <div className="max-w-xs truncate" title={tx.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}>
                         {tx.items.length} art. <span className="text-slate-400">({tx.items[0]?.productName}...)</span>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="font-bold text-slate-700 font-mono">
                         {formatCurrency(tx.totalAmount)}
                       </div>
                       {tx.amountPaid !== undefined && tx.amountPaid < (tx.totalAmount - 0.01) && (
                         <div className="text-xs text-red-500 font-medium">
                           Reste: {formatCurrency(tx.totalAmount - tx.amountPaid)}
                         </div>
                       )}
                     </td>
                     <td className="px-6 py-4 text-right">
                        {tx.paymentStatus === 'PAID' ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Soldé</span>
                            {tx.paidAt && (
                               <span className="text-[10px] text-slate-400 mt-1">
                                 {new Date(tx.paidAt).toLocaleDateString()} à {new Date(tx.paidAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                               </span>
                            )}
                          </div>
                        ) : tx.paymentStatus === 'PARTIAL' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">Partiel</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">Non payé</span>
                        )}
                     </td>
                     <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handlePrintInvoice(tx)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Imprimer Facture"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                     </td>
                   </tr>
                 ))}
                 {filteredTransactions.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center">
                       <FileText className="w-12 h-12 mb-3 opacity-20" />
                       Aucune transaction trouvée.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

      {/* NEW TRANSACTION MODAL - FULLY REDESIGNED */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-2 z-50 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-7xl h-full md:h-[95vh] flex flex-col animate-fade-in-up">
            
            {/* 1. HEADER (Compact Fixed) */}
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 flex items-center">
                        {modalMode === 'SALE' ? <TrendingUp className="w-4 h-4 mr-1 text-emerald-600"/> : <TrendingDown className="w-4 h-4 mr-1 text-blue-600"/>}
                        Nouvelle {modalMode === 'SALE' ? 'Vente' : 'Achat'}
                    </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-1 rounded-full hover:bg-red-50 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* 2. BODY (Scrollable Area) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
                
                {/* A. INPUTS ROW (Fixed Top) */}
                <div className="bg-white p-2 border-b border-slate-200 shrink-0 shadow-sm z-20">
                    <div className="flex flex-col md:flex-row gap-2">
                        {/* Client Selector (Compact) */}
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

                        {/* Search Bar + Qty + Add (Compact Row) */}
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
                                {/* DROPDOWN */}
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
                    {/* Selected Item Indicator */}
                    {selectedProductId && (
                        <div className="mt-1 text-[10px] text-indigo-600 font-medium flex items-center bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {inventory.find(i => i.id === selectedProductId)?.name}
                        </div>
                    )}
                </div>

                {/* B. TABLE (Scrollable Middle) */}
                <div className="flex-1 overflow-auto bg-white p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 shadow-sm text-[10px] uppercase font-bold">
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
                    
                    {/* Left: Total Big */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Total Net</span>
                            <span className="text-xl md:text-2xl font-bold text-indigo-700">{formatCurrency(modalTotalBase)}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-300 hidden md:block"></div>
                        <div className="text-xs text-slate-500 hidden md:block">
                            {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Articles
                        </div>
                    </div>

                    {/* Right: Payment Input + Action */}
                    <div className="flex items-center gap-2 w-full md:w-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-100 pr-3">
                            <div className="flex flex-col items-end">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Versement</label>
                                <div className="relative w-24">
                                    <input 
                                        type="number"
                                        className="w-full text-right font-bold text-slate-800 text-sm bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 p-0.5"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder={modalTotalDisplayed.toFixed(0)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Reste</label>
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
    </div>
  );
};
