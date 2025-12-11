
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import { Plus, Trash2, User as UserIcon, Shield, ShieldAlert, Lock, Edit2, Image as ImageIcon, CheckSquare, Square, Clock, Activity, Eye, KeyRound, X, ArrowRight } from 'lucide-react';
import { PERMISSION_CATEGORIES } from '../constants';

interface UsersProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (id: string, user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  onSupervise?: (user: User) => void; // Option 1
  onLoginAs?: (user: User) => void;   // Option 2
}

export const Users: React.FC<UsersProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser, onSupervise, onLoginAs }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Login As Modal State
  const [loginAsUser, setLoginAsUser] = useState<User | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SELLER');
  const [newPin, setNewPin] = useState('');
  const [newCommission, setNewCommission] = useState(0);
  const [newAvatar, setNewAvatar] = useState<string | undefined>(undefined);
  
  // Permission State (String Array of keys like 'inventory.add')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-400" />
        <h2 className="text-2xl font-bold text-slate-700">Accès Refusé</h2>
        <p>Seuls les administrateurs peuvent gérer les utilisateurs.</p>
      </div>
    );
  }

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return { text: 'Jamais', isOnline: false };
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    // Considéré en ligne si activité < 5 min
    const isOnline = diffMins < 5; 
    
    if (isOnline) return { text: 'En ligne', isOnline: true };
    
    return { 
        text: `Le ${date.toLocaleDateString()} à ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 
        isOnline: false 
    };
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const toggleCategory = (catId: string, actions: {id: string}[]) => {
    const allKeys = actions.map(a => `${catId}.${a.id}`);
    const hasAll = allKeys.every(k => selectedPermissions.includes(k));
    
    if (hasAll) {
      // Remove all
      setSelectedPermissions(prev => prev.filter(p => !allKeys.includes(p)));
    } else {
      // Add all (without duplicates)
      setSelectedPermissions(prev => [...new Set([...prev, ...allKeys])]);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewPin('');
    setNewRole('SELLER');
    setNewCommission(0);
    setNewAvatar(undefined);
    // Default permissions for sellers
    setSelectedPermissions(['dashboard.view', 'commercial.view', 'commercial.sale', 'settings.view', 'settings.view_profile']);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setNewName(user.name);
    setNewRole(user.role);
    setNewPin(user.pin);
    setNewCommission(user.commissionRate || 0);
    setNewAvatar(user.avatar);
    setSelectedPermissions(user.permissions || []);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) {
      onDeleteUser(id);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image est trop volumineuse (Max 2Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       setNewAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPin) return;

    // Force basic permissions if role is ADMIN
    let finalPermissions = [...selectedPermissions];
    if (newRole === 'ADMIN') {
        // Ensure Admin has critical permissions if not selected
        if (!finalPermissions.includes('users.view')) finalPermissions.push('users.view');
        if (!finalPermissions.includes('users.manage')) finalPermissions.push('users.manage');
        if (!finalPermissions.includes('settings.view')) finalPermissions.push('settings.view');
    }

    const userData: Partial<User> = {
        name: newName,
        role: newRole,
        pin: newPin,
        commissionRate: newRole === 'SELLER' ? newCommission : 0,
        permissions: finalPermissions,
        avatar: newAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random&color=fff`,
    };

    if (editingId) {
      onUpdateUser(editingId, userData);
    } else {
      const newUser: User = {
        ...userData as User,
        id: `u-${Date.now()}`
      };
      onAddUser(newUser);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  // --- LOGIN AS LOGIC ---
  const handleLoginAsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginAsUser || !onLoginAs) return;
      
      if (loginPin === loginAsUser.pin) {
          onLoginAs(loginAsUser);
          setLoginAsUser(null);
          setLoginPin('');
      } else {
          setLoginError("Code PIN incorrect.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Gestion des Accès Utilisateurs</h2>
          <p className="text-slate-500">Créez des comptes et définissez les permissions détaillées.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium flex items-center shadow-lg shadow-indigo-200 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" /> Nouvel Utilisateur
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => {
          const status = formatLastSeen(user.lastLogin);
          return (
          <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full group relative">
             <div className="absolute top-4 right-4 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1.5 ${status.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-[10px] font-medium ${status.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {status.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
             </div>

             <div className="flex items-start space-x-4 mb-4">
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-2 border-slate-100 object-cover" />
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-lg font-bold text-slate-800 truncate">{user.name}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                        user.role === 'SELLER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                        {user.role === 'ADMIN' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                        {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'SELLER' ? 'Vendeur' : 'Utilisateur'}
                    </span>
                  </div>
                </div>
             </div>
             
             {/* Last Login Info */}
             <div className="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center">
                    {status.isOnline ? <Activity className="w-3 h-3 mr-1.5 text-emerald-500" /> : <Clock className="w-3 h-3 mr-1.5" />}
                    <span>Dernière activité :</span>
                </div>
                <span className="font-medium text-slate-700">{status.text}</span>
             </div>
             
             {/* Admin Actions */}
             {user.id !== currentUser.id && (
                 <div className="flex gap-2 mb-3 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                     <button 
                        onClick={() => onSupervise && onSupervise(user)}
                        className="flex-1 py-1.5 bg-white border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center shadow-sm"
                        title="Superviser (Voir comme)"
                     >
                         <Eye className="w-3 h-3 mr-1.5" /> Superviser
                     </button>
                     <button 
                        onClick={() => { setLoginAsUser(user); setLoginError(''); setLoginPin(''); }}
                        className="flex-1 py-1.5 bg-white border border-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center shadow-sm"
                        title="Connexion (Accès complet)"
                     >
                         <KeyRound className="w-3 h-3 mr-1.5" /> Connecter
                     </button>
                 </div>
             )}
             
             {/* Permissions Summary */}
             <div className="pt-4 border-t border-slate-50 mt-auto">
               <div className="flex justify-end gap-2">
                   <button 
                    onClick={() => openEditModal(user)}
                    className="flex-1 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Modifier
                  </button>
                  {user.id !== currentUser.id && (
                    <button 
                      onClick={() => handleDeleteClick(user.id)}
                      className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
               </div>
             </div>
          </div>
        )})}
      </div>

      {/* LOGIN AS MODAL (Option 2) */}
      {loginAsUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-t-4 border-amber-500">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Connexion en tant que...</h3>
                          <p className="text-sm text-slate-500">Accéder au compte de <span className="font-bold text-amber-600">{loginAsUser.name}</span></p>
                      </div>
                      <button onClick={() => setLoginAsUser(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 mb-4 flex items-start">
                      <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      Vous allez être déconnecté de votre compte administrateur.
                  </div>

                  <form onSubmit={handleLoginAsSubmit}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Code PIN de l'utilisateur</label>
                      <input 
                          type="password"
                          autoFocus
                          maxLength={4}
                          value={loginPin}
                          onChange={(e) => setLoginPin(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-center text-xl tracking-widest focus:ring-2 focus:ring-amber-500/30"
                          placeholder="••••"
                      />
                      
                      {loginError && (
                          <p className="text-red-500 text-xs mt-2 text-center font-bold">{loginError}</p>
                      )}

                      <button 
                          type="submit"
                          className="w-full mt-6 bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-slate-900 transition-colors"
                      >
                          Valider l'accès <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* EDIT MODAL (Existing code...) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 animate-fade-in-up my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
              {editingId ? 'Modifier le compte' : 'Nouveau Compte Utilisateur'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ... (Existing form content remains unchanged) ... */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Identity */}
                  <div className="space-y-4 lg:col-span-1">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center border-b border-indigo-100 pb-2">
                        <UserIcon className="w-4 h-4 mr-1"/> Identifiants
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Pour la connexion"
                        />
                    </div>
                    
                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Avatar (Optionnel)</label>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                {newAvatar ? <img src={newAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-300"/>}
                            </div>
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                            >
                                <ImageIcon className="w-3 h-3 inline mr-1" /> Changer
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Code PIN</label>
                        <input 
                            type="password" 
                            required
                            maxLength={4}
                            pattern="\d{4}"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono tracking-widest"
                            value={newPin}
                            onChange={e => setNewPin(e.target.value)}
                            placeholder="••••"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rôle Système</label>
                            <select 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as UserRole)}
                            >
                            <option value="SELLER">Vendeur</option>
                            <option value="ADMIN">Administrateur</option>
                            <option value="USER">Utilisateur</option>
                            </select>
                        </div>
                    </div>
                    
                    {newRole === 'SELLER' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Commission Vente (%)</label>
                            <input 
                                type="number" 
                                min="0" max="100"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                value={newCommission}
                                onChange={e => setNewCommission(parseFloat(e.target.value))}
                            />
                        </div>
                    )}
                  </div>

                  {/* Right Column: Detailed Permissions */}
                  <div className="lg:col-span-2 bg-slate-50 p-6 rounded-xl border border-slate-100">
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center">
                       <Lock className="w-3 h-3 mr-1" /> Droits d'accès détaillés
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                        {PERMISSION_CATEGORIES.map(category => {
                            const catKeys = category.actions.map(a => `${category.id}.${a.id}`);
                            const allSelected = catKeys.every(k => selectedPermissions.includes(k));
                            
                            return (
                                <div key={category.id} className="bg-white p-4 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                        <div className="flex items-center">
                                            <label className="flex items-center cursor-pointer mr-2" title="Tout cocher dans cette catégorie">
                                                <input 
                                                    type="checkbox"
                                                    className="peer hidden"
                                                    checked={allSelected}
                                                    onChange={() => toggleCategory(category.id, category.actions)}
                                                />
                                                {allSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                                                )}
                                            </label>
                                            <h5 className="font-bold text-slate-800 text-sm">{category.label}</h5>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pl-2">
                                        {category.actions.map(action => {
                                            const permKey = `${category.id}.${action.id}`;
                                            const isChecked = selectedPermissions.includes(permKey);
                                            return (
                                                <label key={permKey} className="flex items-start space-x-2 cursor-pointer group">
                                                    <div className="relative flex items-center pt-0.5">
                                                        <input 
                                                            type="checkbox"
                                                            className="peer hidden"
                                                            checked={isChecked}
                                                            onChange={() => togglePermission(permKey)}
                                                        />
                                                        {isChecked ? (
                                                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                                        {action.label}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                  </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md">
                  {editingId ? 'Mettre à jour' : 'Créer Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
