import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Employee, Currency, EmployeeDocument } from '../types';
import {
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Banknote,
  User as UserIcon,
  FileText,
  Upload,
  Trash2,
  Eye,
  X,
  Plus,
  Edit2,
  Image as ImageIcon,
  Wallet,
  Baby,
  Home,
  AlertCircle,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';

const DEFAULT_JOB_TITLES = [
  'Directeur Général',
  'Directeur Commercial',
  'Directeur Financier',
  'Directeur RH',
  'Manager',
  "Chef d'équipe",
  'Superviseur',
  'Vendeur',
  'Conseiller Clientèle',
  'Commercial',
  'Caissier',
  'Comptable',
  'Assistant Comptable',
  'Auditeur',
  'Secrétaire',
  'Assistant Administratif',
  'Office Manager',
  'Magasinier',
  'Préparateur de commandes',
  'Logisticien',
  'Responsable Stock',
  'Livreur',
  'Chauffeur',
  'Technicien',
  'Développeur',
  'Ingénieur',
  'Informaticien',
  'Agent de sécurité',
  "Agent d'entretien",
  'Stagiaire',
  'Apprenti',
];

const DEFAULT_DEPARTMENTS = [
  'Direction Générale',
  'Ressources Humaines (RH)',
  'Comptabilité & Finance',
  'Commercial & Vente',
  'Marketing & Communication',
  'Logistique & Approvisionnement',
  'Informatique & Technique (IT)',
  'Service Après-Vente (SAV)',
  'Juridique',
  'Sécurité & Entretien',
];

interface PersonnelProps {
  employees: Employee[];
  currency: Currency;
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (id: string, data: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onPaySalary: (employee: Employee, amount: number, month: string) => void;
}

export const Personnel: React.FC<PersonnelProps> = ({
  employees,
  currency,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onPaySalary,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payEmployee, setPayEmployee] = useState<Employee | null>(null);
  const [payBonus, setPayBonus] = useState(0);
  const [payMonth, setPayMonth] = useState('');

  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [hireDate, setHireDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [residence, setResidence] = useState('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [maritalStatus, setMaritalStatus] = useState<
    'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
  >('SINGLE');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);

  const [selectedEmpForDocs, setSelectedEmpForDocs] = useState<Employee | null>(
    null
  );
  const [newDocType, setNewDocType] = useState('CONTRACT');
  const [newDocName, setNewDocName] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);
  const deptWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        titleWrapperRef.current &&
        !titleWrapperRef.current.contains(event.target as Node)
      ) {
        setShowTitleSuggestions(false);
      }
      if (
        deptWrapperRef.current &&
        !deptWrapperRef.current.contains(event.target as Node)
      ) {
        setShowDeptSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const existingTitles = employees.map((e) => e.jobTitle).filter(Boolean);
    const existingDepts = employees.map((e) => e.department).filter(Boolean);

    return {
      titles: Array.from(
        new Set([...DEFAULT_JOB_TITLES, ...existingTitles])
      ).sort(),
      departments: Array.from(
        new Set([...DEFAULT_DEPARTMENTS, ...existingDepts])
      ).sort(),
    };
  }, [employees]);

  const filteredTitles = suggestions.titles.filter(
    (t) => t && t.toLowerCase().includes(jobTitle.toLowerCase())
  );
  const filteredDepts = suggestions.departments.filter(
    (d) => d && d.toLowerCase().includes(department.toLowerCase())
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
    setFullName('');
    setJobTitle('');
    setDepartment('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBaseSalary(0);
    setHireDate(new Date().toISOString().split('T')[0]);
    setPhoto(undefined);

    setGender('M');
    setBirthDate('');
    setResidence('');
    setChildrenCount(0);
    setMaritalStatus('SINGLE');
    setEmergencyName('');
    setEmergencyRelation('');
    setEmergencyPhone('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingId(emp.id);
    setFullName(emp.fullName);
    setJobTitle(emp.jobTitle);
    setDepartment(emp.department || '');
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setAddress(emp.address || '');
    setBaseSalary(emp.baseSalary);
    setHireDate(emp.hireDate);
    setPhoto(emp.photo);

    setGender(emp.gender || 'M');
    setBirthDate(emp.birthDate || '');
    setResidence(emp.residence || '');
    setChildrenCount(emp.childrenCount || 0);
    setMaritalStatus(emp.maritalStatus || 'SINGLE');
    setEmergencyName(emp.emergencyContact?.name || '');
    setEmergencyRelation(emp.emergencyContact?.relationship || '');
    setEmergencyPhone(emp.emergencyContact?.phone || '');

    setIsModalOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer cet employé ? Son dossier sera effacé.'
      )
    ) {
      onDeleteEmployee(id);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const salaryBase = baseSalary / currency.rate;

    const data: Partial<Employee> = {
      fullName,
      jobTitle,
      department,
      phone,
      email,
      address,
      baseSalary: salaryBase,
      hireDate,
      photo,
      gender,
      birthDate,
      residence,
      childrenCount,
      maritalStatus,
      emergencyContact: {
        name: emergencyName,
        relationship: emergencyRelation,
        phone: emergencyPhone,
      },
    };

    if (editingId) {
      onUpdateEmployee(editingId, data);
    } else {
      const newEmp: Employee = {
        ...(data as Employee),
        id: `emp-${Date.now()}`,
        documents: [],
      };
      onAddEmployee(newEmp);
    }
    setIsModalOpen(false);
  };

  // --- DOCUMENTS LOGIC ---

  const handleUploadDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmpForDocs) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (Max 5Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newDoc: EmployeeDocument = {
        id: `doc-${Date.now()}`,
        name: newDocName || file.name,
        type: newDocType,
        date: new Date().toISOString(),
        content: content,
      };

      const updatedDocs = [...(selectedEmpForDocs.documents || []), newDoc];
      onUpdateEmployee(selectedEmpForDocs.id, { documents: updatedDocs });
      setSelectedEmpForDocs({ ...selectedEmpForDocs, documents: updatedDocs });

      setNewDocName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDoc = (docId: string) => {
    if (!selectedEmpForDocs) return;
    if (window.confirm('Supprimer ce document ?')) {
      const updatedDocs = (selectedEmpForDocs.documents || []).filter(
        (d) => d.id !== docId
      );
      onUpdateEmployee(selectedEmpForDocs.id, { documents: updatedDocs });
      setSelectedEmpForDocs({ ...selectedEmpForDocs, documents: updatedDocs });
    }
  };

  const handleViewDoc = (doc: EmployeeDocument) => {
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${doc.content}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const openPayModal = (emp: Employee) => {
    setPayEmployee(emp);
    setPayBonus(0);
    setPayMonth(selectedMonth);
    setIsPayModalOpen(true);
  };

  const confirmPayment = () => {
    if (!payEmployee) return;

    const salaryDisplayed = payEmployee.baseSalary * currency.rate;
    const total = salaryDisplayed + payBonus;

    onPaySalary(payEmployee, total, payMonth);

    setIsPayModalOpen(false);
    setPayEmployee(null);
    alert(`Salaire de ${payEmployee.fullName} enregistré !`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center">
            <Briefcase className="w-8 h-8 text-indigo-600 mr-3" />
            Gestion des Employés
          </h2>
          <p className="text-slate-500 mt-2">
            Dossiers du personnel et gestion de paie.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <Calendar className="w-5 h-5 text-slate-400 ml-2" />
            <span className="text-sm font-medium text-slate-600 hidden sm:inline">
              Paie du mois :
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none bg-transparent font-bold text-slate-800 focus:ring-0 cursor-pointer"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium flex items-center shadow-lg shadow-indigo-200 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Nouvel Employé
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {employees.map((emp) => {
          return (
            <div
              key={emp.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group relative"
            >
              <div className="p-6 flex items-start space-x-4">
                <div
                  className="relative cursor-pointer"
                  onClick={() => setSelectedEmpForDocs(emp)}
                >
                  <img
                    src={
                      emp.photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=random&color=fff`
                    }
                    alt={emp.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-bold text-slate-800">
                      {emp.fullName}
                    </h3>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-indigo-600 font-medium">
                    {emp.jobTitle}{' '}
                    <span className="text-slate-400 font-normal">
                      • {emp.department || 'Général'}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {emp.phone && (
                      <span className="flex items-center">
                        <Phone className="w-3 h-3 mr-1" /> {emp.phone}
                      </span>
                    )}
                    {emp.hireDate && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" /> Embauche:{' '}
                        {new Date(emp.hireDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEmpForDocs(emp)}
                  className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors flex flex-col items-center text-[10px] font-bold"
                >
                  <FileText className="w-5 h-5 mb-1" />
                  Dossier
                </button>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-bold uppercase">
                    Salaire Fixe
                  </span>
                  <span className="text-xl font-bold text-slate-700">
                    {formatCurrency(emp.baseSalary)}
                  </span>
                </div>

                <button
                  onClick={() => openPayModal(emp)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors shadow-lg shadow-emerald-200"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Payer
                </button>
              </div>
            </div>
          );
        })}

        {employees.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <p>Aucun employé enregistré.</p>
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {isPayModalOpen && payEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Paiement Salaire
                  </h3>
                  <p className="text-xs text-slate-500">
                    {payEmployee.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mois de paie
                </label>
                <input
                  type="month"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800"
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Salaire de Base</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(payEmployee.baseSalary)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Prime / Bonus
                  </span>
                  <div className="relative w-32">
                    <input
                      type="number"
                      min="0"
                      className="w-full px-2 py-1 text-right border border-indigo-200 rounded bg-white font-medium focus:ring-1 focus:ring-indigo-500 text-slate-900"
                      value={payBonus}
                      onChange={(e) =>
                        setPayBonus(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-lg font-bold">
                  <span className="text-indigo-900">Total à Payer</span>
                  <span className="text-emerald-600">
                    {formatCurrency(
                      payEmployee.baseSalary + payBonus / currency.rate
                    )}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Cela créera une dépense et un mouvement de sortie de caisse
                automatiquement.
              </p>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmPayment}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 animate-fade-in-up my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
              {editingId ? 'Modifier la fiche employé' : 'Nouvel Employé'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: Identity & Work */}
                <div className="space-y-6">
                  {/* Identity */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center border-b border-indigo-50 pb-2">
                      <Briefcase className="w-4 h-4 mr-1" /> Identité & Poste
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-900"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Photo
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                          {photo ? (
                            <img
                              src={photo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                        >
                          <ImageIcon className="w-3 h-3 inline mr-1" /> Changer
                        </button>
                        <input
                          type="file"
                          ref={photoInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* CUSTOM COMBOBOX: POSTE */}
                      <div className="relative" ref={titleWrapperRef}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Poste / Titre
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg pr-8 bg-white text-slate-900"
                            value={jobTitle}
                            onChange={(e) => {
                              setJobTitle(e.target.value);
                              setShowTitleSuggestions(true);
                            }}
                            onFocus={() => setShowTitleSuggestions(true)}
                            placeholder="Ex: Magasinier"
                            autoComplete="off"
                          />
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {showTitleSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {filteredTitles.length > 0 ? (
                              filteredTitles.map((t) => (
                                <div
                                  key={t}
                                  onClick={() => {
                                    setJobTitle(t || '');
                                    setShowTitleSuggestions(false);
                                  }}
                                  className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700"
                                >
                                  {t}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">
                                Aucune suggestion (saisie libre)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CUSTOM COMBOBOX: DEPARTEMENT */}
                      <div className="relative" ref={deptWrapperRef}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Département
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg pr-8 bg-white text-slate-900"
                            value={department}
                            onChange={(e) => {
                              setDepartment(e.target.value);
                              setShowDeptSuggestions(true);
                            }}
                            onFocus={() => setShowDeptSuggestions(true)}
                            placeholder="Ex: Logistique"
                            autoComplete="off"
                          />
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {showDeptSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {filteredDepts.length > 0 ? (
                              filteredDepts.map((d) => (
                                <div
                                  key={d}
                                  onClick={() => {
                                    setDepartment(d || '');
                                    setShowDeptSuggestions(false);
                                  }}
                                  className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700"
                                >
                                  {d}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">
                                Aucune suggestion
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RH Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center border-b border-indigo-50 pb-2">
                      <Banknote className="w-4 h-4 mr-1" /> Contrat & Salaire
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Salaire Fixe ({currency.code})
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-lg font-bold bg-white text-slate-900"
                        value={baseSalary}
                        onChange={(e) =>
                          setBaseSalary(parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date d'embauche
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                        value={hireDate}
                        onChange={(e) => setHireDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT: Personal & Emergency */}
                <div className="space-y-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center border-b border-indigo-50 pb-2">
                      <UserIcon className="w-4 h-4 mr-1" /> Infos Personnelles
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Sexe
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                          value={gender}
                          onChange={(e) =>
                            setGender(e.target.value as 'M' | 'F')
                          }
                        >
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date de Naissance
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Situation
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                        value={maritalStatus}
                        onChange={(e) =>
                          setMaritalStatus(e.target.value as any)
                        }
                      >
                        <option value="SINGLE">Célibataire</option>
                        <option value="MARRIED">Marié(e)</option>
                        <option value="DIVORCED">Divorcé(e)</option>
                        <option value="WIDOWED">Veuf/Veuve</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Enfants
                        </label>
                        <div className="relative">
                          <Baby className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                            value={childrenCount}
                            onChange={(e) =>
                              setChildrenCount(parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Lieu d'habitation
                        </label>
                        <div className="relative">
                          <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                            value={residence}
                            onChange={(e) => setResidence(e.target.value)}
                            placeholder="Quartier, Ville"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Téléphone"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
                    <h4 className="text-xs font-bold text-red-600 uppercase flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" /> Contact d'Urgence
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">
                        Nom du contact
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white text-slate-900"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="Nom complet"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-red-800 mb-1">
                          Lien de parenté
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white text-slate-900"
                          value={emergencyRelation}
                          onChange={(e) => setEmergencyRelation(e.target.value)}
                          placeholder="Epouse, Père..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-red-800 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white text-slate-900"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder="Numéro"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md"
                >
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEmpForDocs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 animate-fade-in-up">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <img
                  src={
                    selectedEmpForDocs.photo ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmpForDocs.fullName)}`
                  }
                  className="w-20 h-20 rounded-full object-cover border-4 border-indigo-50"
                />
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {selectedEmpForDocs.fullName}
                  </h3>
                  <p className="text-slate-500 font-medium">
                    {selectedEmpForDocs.jobTitle}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      Embauche:{' '}
                      {new Date(
                        selectedEmpForDocs.hireDate
                      ).toLocaleDateString()}
                    </span>
                    {selectedEmpForDocs.birthDate && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center">
                        <Baby className="w-3 h-3 mr-1" />
                        Né(e) le:{' '}
                        {new Date(
                          selectedEmpForDocs.birthDate
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpForDocs(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                Documents & Pièces Jointes
              </h4>

              {/* List */}
              <div className="space-y-3 mb-6">
                {(selectedEmpForDocs.documents || []).map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-50 p-2 rounded text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          {doc.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {doc.type} • {new Date(doc.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDoc(doc)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!selectedEmpForDocs.documents ||
                  selectedEmpForDocs.documents.length === 0) && (
                  <p className="text-center text-slate-400 text-sm py-4 italic">
                    Aucun document archivé.
                  </p>
                )}
              </div>

              {/* Upload Form */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">
                  Ajouter un document
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"
                  >
                    <option value="CONTRACT">Contrat</option>
                    <option value="ID">Pièce d'identité</option>
                    <option value="CV">CV / Diplôme</option>
                    <option value="RIB">RIB</option>
                    <option value="OTHER">Autre</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Nom du fichier..."
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center hover:bg-slate-900 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Charger
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadDoc}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
