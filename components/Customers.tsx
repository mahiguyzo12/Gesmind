import React, { useState } from 'react';
import { Customer, Currency } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  X,
  Save,
  ShoppingBag,
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (id: string, customer: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  currency: Currency;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'XOF' ? 0 : 2,
      maximumFractionDigits: currency.code === 'XOF' ? 0 : 2,
    }).format(amount * currency.rate);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.'
      )
    ) {
      onDeleteCustomer(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingId) {
      onUpdateCustomer(editingId, {
        name,
        phone,
        email,
        address,
        notes,
      });
    } else {
      const newCustomer: Customer = {
        id: `c-${Date.now()}`,
        name,
        phone,
        email,
        address,
        notes,
        totalSpent: 0,
      };
      onAddCustomer(newCustomer);
    }
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Gestion Clients</h2>
          <p className="text-slate-500">
            Base de données clients et historique.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center shadow-lg shadow-indigo-200 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" /> Nouveau Client
        </button>
      </header>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
        <Search className="text-slate-400 w-5 h-5 mr-3" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone ou email..."
          className="flex-1 outline-none text-slate-700 placeholder-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {customer.name}
                  </h3>
                  <span className="inline-flex items-center text-xs text-slate-500">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Total:{' '}
                    <span className="font-semibold text-indigo-600 ml-1">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(customer)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(customer.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center text-slate-600">
                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                {customer.phone || (
                  <span className="text-slate-300 italic">Non renseigné</span>
                )}
              </div>
              <div className="flex items-center text-slate-600">
                <Mail className="w-4 h-4 mr-2 text-slate-400" />
                {customer.email || (
                  <span className="text-slate-300 italic">Non renseigné</span>
                )}
              </div>
              <div className="flex items-start text-slate-600">
                <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                <span className="flex-1">
                  {customer.address || (
                    <span className="text-slate-300 italic">Non renseigné</span>
                  )}
                </span>
              </div>
              {customer.notes && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                  <FileText className="w-3 h-3 inline mr-1 mb-0.5" />
                  {customer.notes}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun client trouvé.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up my-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Modifier le client' : 'Nouveau client'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@mail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Adresse
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none h-20"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresse postale..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes internes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none h-20 bg-amber-50 border-amber-200"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Préférences, historique, etc..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
