import React, { useState } from 'react';
import { InventoryItem, Currency, User, Supplier } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Loader2,
  Save,
  X,
  MapPin,
  Truck,
  Hash,
  Download,
  Package,
  TrendingUp,
  Calculator,
  Eye,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  File,
  Shield,
} from 'lucide-react';
import { CATEGORIES } from '../constants';
import { generateItemDetails } from '../services/geminiService';

interface InventoryTableProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updatedItem: Partial<InventoryItem>) => void;
  currency: Currency;
  currentUser?: User;
  suppliers?: Supplier[];
  supervisionTarget?: User | null;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  currency,
  currentUser,
  suppliers = [],
  supervisionTarget,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Form State
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0]);
  const [itemQuantity, setItemQuantity] = useState(0);
  const [itemMin, setItemMin] = useState(5);
  const [itemPurchasePrice, setItemPurchasePrice] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemDesc, setItemDesc] = useState('');
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemLocation, setItemLocation] = useState('');

  // PERMISSIONS CHECK
  const isAdmin = currentUser?.role === 'ADMIN';
  const canAdd = currentUser?.permissions.includes('inventory.add');
  const canEdit = currentUser?.permissions.includes('inventory.edit');
  const canDelete = currentUser?.permissions.includes('inventory.delete');
  const canViewProfit = currentUser?.permissions.includes(
    'inventory.view_profit'
  );

  // --- STRICT DATA FILTERING ---
  const isSupervision = !!supervisionTarget;
  const targetId = supervisionTarget ? supervisionTarget.id : currentUser?.id;

  const accessibleItems =
    isAdmin && !isSupervision
      ? items
      : items.filter((item) => item.createdBy === targetId);

  const filteredItems = accessibleItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculs Financiers Globaux (Basés sur la vue filtrée)
  const totalPurchaseValue =
    filteredItems.reduce(
      (acc, item) => acc + (item.purchasePrice || 0) * item.quantity,
      0
    ) * currency.rate;
  const totalPotentialProfit =
    filteredItems.reduce((acc, item) => {
      const margin = item.price - (item.purchasePrice || 0);
      return acc + margin * item.quantity;
    }, 0) * currency.rate;

  const resetForm = () => {
    setItemName('');
    setItemSku('');
    setItemCategory(CATEGORIES[0]);
    setItemQuantity(0);
    setItemMin(5);
    setItemPurchasePrice(0);
    setItemPrice(0);
    setItemDesc('');
    setItemSupplier('');
    setItemLocation('');
    setEditingId(null);
  };

  const openAddModal = () => {
    if (!canAdd) return;
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    if (!canEdit) return;
    if (!isAdmin && item.createdBy !== currentUser?.id) return;

    setEditingId(item.id);
    setItemName(item.name);
    setItemSku(item.sku);
    setItemCategory(item.category);
    setItemQuantity(item.quantity);
    setItemMin(item.minQuantity);
    setItemPurchasePrice(
      parseFloat(((item.purchasePrice || 0) * currency.rate).toFixed(2))
    );
    setItemPrice(parseFloat((item.price * currency.rate).toFixed(2)));
    setItemDesc(item.description);
    setItemSupplier(item.supplier);
    setItemLocation(item.location);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (!canDelete) return;
    if (
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.'
      )
    ) {
      onDeleteItem(id);
    }
  };

  const handleSmartFill = async () => {
    if (!itemName.trim()) return;
    setIsGenerating(true);
    try {
      const details = await generateItemDetails(itemName);
      if (details) {
        setItemCategory(details.category || CATEGORIES[0]);
        setItemDesc(details.description || '');
        const suggestedSelling =
          parseFloat((details.suggestedPrice * currency.rate).toFixed(2)) || 0;
        setItemPrice(suggestedSelling);
        setItemPurchasePrice(parseFloat((suggestedSelling * 0.7).toFixed(2)));
        setItemMin(details.minQuantitySuggestion || 5);
        setItemLocation(details.suggestedLocation || '');
      }
    } catch (error) {
      console.error('Failed to generate details', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const baseSellingPrice = itemPrice / currency.rate;
    const basePurchasePrice = itemPurchasePrice / currency.rate;

    if (editingId && canEdit) {
      onUpdateItem(editingId, {
        name: itemName,
        sku: itemSku,
        category: itemCategory,
        quantity: itemQuantity,
        minQuantity: itemMin,
        purchasePrice: basePurchasePrice,
        price: baseSellingPrice,
        description: itemDesc,
        supplier: itemSupplier,
        location: itemLocation,
        lastUpdated: new Date().toISOString(),
      });
    } else if (canAdd) {
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        name: itemName,
        sku: itemSku || `SKU-${Date.now()}`,
        category: itemCategory,
        quantity: itemQuantity,
        minQuantity: itemMin,
        purchasePrice: basePurchasePrice,
        price: baseSellingPrice,
        supplier: itemSupplier || 'N/A',
        location: itemLocation || 'N/A',
        description: itemDesc,
        lastUpdated: new Date().toISOString(),
        createdBy: currentUser?.id,
      };
      onAddItem(newItem);
    }
    setIsModalOpen(false);
    resetForm();
  };

  // --- EXPORT FUNCTIONS ---

  const handleExportCSV = () => {
    const headers = [
      'Nom',
      'SKU',
      'Catégorie',
      'Quantité',
      `Prix Achat (${currency.code})`,
      `Prix Vente (${currency.code})`,
      'Fournisseur',
      'Emplacement',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      item.sku,
      item.category,
      item.quantity,
      ((item.purchasePrice || 0) * currency.rate).toFixed(2),
      (item.price * currency.rate).toFixed(2),
      `"${item.supplier.replace(/"/g, '""')}"`,
      `"${item.location.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Add Byte Order Mark for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff', csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    downloadFile(
      blob,
      `inventaire_${new Date().toISOString().split('T')[0]}.csv`
    );
    setIsExportMenuOpen(false);
  };

  const handleExportTXT = () => {
    let txtContent = `RAPPORT D'INVENTAIRE - ${new Date().toLocaleDateString()}\n`;
    txtContent += `Généré par Gesmind\n`;
    txtContent += `=================================================\n\n`;

    filteredItems.forEach((item) => {
      txtContent += `Produit: ${item.name} (${item.sku})\n`;
      txtContent += `Catégorie: ${item.category} | Stock: ${item.quantity}\n`;
      txtContent += `Prix Vente: ${(item.price * currency.rate).toFixed(2)} ${currency.code}\n`;
      txtContent += `Fournisseur: ${item.supplier} | Emplacement: ${item.location}\n`;
      txtContent += `-------------------------------------------------\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    downloadFile(
      blob,
      `inventaire_${new Date().toISOString().split('T')[0]}.txt`
    );
    setIsExportMenuOpen(false);
  };

  const handleExportWord = () => {
    const tableRows = filteredItems
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.sku}</td>
        <td>${item.category}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${(item.price * currency.rate).toFixed(2)} ${currency.code}</td>
        <td>${item.supplier}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Inventaire Export</title>
        <style>
          body { font-family: 'Arial', sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          td { border: 1px solid #d1d5db; padding: 8px; }
          h1 { color: #4f46e5; }
        </style>
      </head>
      <body>
        <h1>Liste des Stocks</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Ref</th>
              <th>Catégorie</th>
              <th>Qté</th>
              <th>Prix</th>
              <th>Fournisseur</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    downloadFile(
      blob,
      `inventaire_${new Date().toISOString().split('T')[0]}.doc`
    );
    setIsExportMenuOpen(false);
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculs pour le modal
  const unitMargin = itemPrice - itemPurchasePrice;
  const totalBatchPurchase = itemPurchasePrice * itemQuantity;
  const totalBatchSale = itemPrice * itemQuantity;
  const totalBatchMargin = totalBatchSale - totalBatchPurchase;

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[85vh]">
      {/* Backdrop for Menu closing */}
      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setIsExportMenuOpen(false)}
        ></div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            Liste des Stocks
            {isSupervision ? (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center">
                <Eye className="w-3 h-3 mr-1" /> Supervision:{' '}
                {supervisionTarget?.name}
              </span>
            ) : (
              !isAdmin && (
                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 flex items-center">
                  <Shield className="w-3 h-3 mr-1" /> Personnel
                </span>
              )
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* EXPORT DROPDOWN */}
          <div className="relative z-30">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium flex items-center transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline mr-1">Exporter</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 hover:text-emerald-700 flex items-center transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                  <span className="text-sm font-medium">Excel (.csv)</span>
                </button>
                <button
                  onClick={handleExportWord}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors border-t border-slate-50"
                >
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="text-sm font-medium">Word (.doc)</span>
                </button>
                <button
                  onClick={handleExportTXT}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 hover:text-slate-700 flex items-center transition-colors border-t border-slate-50"
                >
                  <File className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="text-sm font-medium">Texte (.txt)</span>
                </button>
              </div>
            )}
          </div>

          {canAdd && (
            <button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium flex items-center shadow-md shadow-indigo-200 transition-all hover:scale-105 text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Ajouter produit</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          )}
        </div>
      </header>

      {/* Summary Cards */}
      {canViewProfit && (
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Valeur Achat Totale
              </p>
              <p className="text-base font-bold text-slate-700">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: currency.code,
                }).format(totalPurchaseValue)}
              </p>
            </div>
            <div className="bg-blue-50 p-1.5 rounded-md">
              <Package className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Bénéfice Potentiel
              </p>
              <p className="text-base font-bold text-emerald-600">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: currency.code,
                }).format(totalPotentialProfit)}
              </p>
            </div>
            <div className="bg-emerald-50 p-1.5 rounded-md">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-100 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={
              isAdmin && !isSupervision
                ? 'Rechercher un produit...'
                : 'Rechercher dans le stock...'
            }
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <Filter className="text-slate-400 w-4 h-4 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tout
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-[60vh]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                  Produit
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                  Stock
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right bg-slate-50">
                  Prix Achat
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right bg-slate-50">
                  Prix Vente
                </th>
                {canViewProfit && (
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right bg-slate-50">
                    Bénéfice Unitaire
                  </th>
                )}
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right bg-slate-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const margin =
                  (item.price - (item.purchasePrice || 0)) * currency.rate;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono mb-1">
                          {item.sku}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 w-fit">
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${item.quantity <= item.minQuantity ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
                        ></div>
                        <span
                          className={`font-bold ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}
                        >
                          {item.quantity}
                        </span>
                      </div>
                      {item.quantity <= item.minQuantity && (
                        <span className="text-[10px] text-red-500 font-medium block mt-0.5">
                          Stock Faible
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-500">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: currency.code,
                      }).format((item.purchasePrice || 0) * currency.rate)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm text-slate-700">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: currency.code,
                      }).format(item.price * currency.rate)}
                    </td>
                    {canViewProfit && (
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold">
                        <span
                          className={
                            margin >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }
                        >
                          {margin > 0 ? '+' : ''}
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: currency.code,
                          }).format(margin)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-slate-400 italic">
                          Lecture seule
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={canViewProfit ? 6 : 5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun produit trouvé.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal (Existing Code kept same but uses handleSubmit which now adds createdBy) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-up my-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId
                  ? 'Modifier le produit'
                  : 'Ajouter un nouveau produit'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Smart Fill Section */}
              {!editingId && (
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden">
                  <div className="relative z-10">
                    <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center">
                      <Loader2
                        className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`}
                      />
                      Remplissage Automatique IA
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: iPhone 15 Pro Max 256Go..."
                        className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleSmartFill}
                        disabled={!itemName || isGenerating}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70"
                      >
                        {isGenerating ? 'Génération...' : 'Auto-remplir'}
                      </button>
                    </div>
                    <p className="text-xs text-indigo-600 mt-2">
                      Entrez un nom et laissez Gemini générer la catégorie, le
                      prix estimé, la description et l'emplacement.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom du produit
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <Hash className="w-3 h-3 mr-1" /> SKU / Référence
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      value={itemSku}
                      onChange={(e) => setItemSku(e.target.value)}
                      placeholder="AUTO-GEN si vide"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Catégorie
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <Truck className="w-3 h-3 mr-1" /> Fournisseur
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      value={itemSupplier}
                      onChange={(e) => setItemSupplier(e.target.value)}
                    >
                      <option value="">-- Sélectionner --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      <option value="Autre">Autre / Inconnu</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Quantité
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        value={itemQuantity}
                        onChange={(e) =>
                          setItemQuantity(parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Min. Alerte
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        value={itemMin}
                        onChange={(e) =>
                          setItemMin(parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Prix Achat Unitaire
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm pr-6"
                          value={itemPurchasePrice}
                          onChange={(e) =>
                            setItemPurchasePrice(
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {currency.code}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-600 mb-1">
                        Prix Vente Unitaire
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 border border-indigo-200 rounded-md text-sm font-bold text-indigo-700 pr-6"
                          value={itemPrice}
                          onChange={(e) =>
                            setItemPrice(parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-400">
                          {currency.code}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Marge unitaire :</span>
                      <span
                        className={`font-bold ${unitMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {unitMargin >= 0 ? '+' : ''}
                        {unitMargin.toFixed(2)} {currency.code}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> Emplacement
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      value={itemLocation}
                      onChange={(e) => setItemLocation(e.target.value)}
                      placeholder="Ex: Rayon A, Etagère 2"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Global Calculation Section */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                  <Calculator className="w-3 h-3 mr-1" /> Valeurs Totales du Lot
                  ({itemQuantity} unités)
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-slate-500 text-xs mb-1">
                      Achat Global
                    </span>
                    <span className="font-bold text-slate-700">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: currency.code,
                      }).format(totalBatchPurchase)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-indigo-500 text-xs mb-1">
                      Vente Global
                    </span>
                    <span className="font-bold text-indigo-700">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: currency.code,
                      }).format(totalBatchSale)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-emerald-600 text-xs mb-1">
                      Bénéfice Global
                    </span>
                    <span
                      className={`font-bold ${totalBatchMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {totalBatchMargin >= 0 ? '+' : ''}
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: currency.code,
                      }).format(totalBatchMargin)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg h-24 resize-none"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId
                    ? 'Enregistrer les modifications'
                    : 'Ajouter au stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
