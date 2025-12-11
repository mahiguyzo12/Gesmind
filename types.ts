
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number; // Nouveau: Prix d'achat en Devise de Base (EUR)
  price: number; // Prix de vente en Devise de Base (EUR)
  supplier: string;
  location: string;
  description: string;
  lastUpdated: string;
  createdBy?: string; // ID de l'utilisateur propriétaire du stock
}

export enum ViewState {
  LOGIN = 'LOGIN',
  MENU = 'MENU',
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  COMMERCIAL = 'COMMERCIAL',
  EXPENSES = 'EXPENSES',
  PERSONNEL = 'PERSONNEL', 
  CUSTOMERS = 'CUSTOMERS',
  SUPPLIERS = 'SUPPLIERS',
  TREASURY = 'TREASURY',
  USERS = 'USERS',
  AI_INSIGHTS = 'AI_INSIGHTS',
  SETTINGS = 'SETTINGS'
}

export type CloudProvider = 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'NONE';

export type ThemeMode = 'light' | 'dark';

export interface StoreMetadata {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string; // Base64 string du logo
  recoveryKey?: string; // Clé de secours pour l'admin
  language: string;
  lastCloudSync?: string;
  cloudProvider?: CloudProvider;
  lastClosingDate?: string; // Timestamp de la dernière clôture de caisse
  githubRepo?: string; // Format: "username/repo" pour les mises à jour
  themeMode?: ThemeMode;
  themeColor?: string; // Hex code for primary color
}

export interface AIAnalysisResult {
  summary: string;
  alerts: string[];
  suggestions: string[];
}

export interface GeneratedItemData {
  category: string;
  description: string;
  suggestedPrice: number;
  minQuantitySuggestion: number;
  suggestedSupplier: string;
  suggestedLocation: string;
}

export interface Currency {
  code: string;
  label: string;
  rate: number; // Taux de change par rapport à la devise de base (EUR)
  symbol: string;
}

export type TransactionType = 'SALE' | 'PURCHASE';

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Prix au moment de la transaction (en devise de base)
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  items: TransactionItem[];
  totalAmount: number; // Total en devise de base
  amountPaid: number; // Montant versé par le client/au fournisseur
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'; // Soldé ou non
  paidAt?: string; // Date exacte du solde complet
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  sellerId: string; // ID de l'utilisateur qui a fait la saisie
  sellerName: string;
  
  // Relations optionnelles
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  
  notes?: string;
}

export type ExpenseCategory = 'RENT' | 'SALARY' | 'UTILITIES' | 'TRANSPORT' | 'MARKETING' | 'TAX' | 'MAINTENANCE' | 'OTHER';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // Montant en devise de base
  paidBy: string; // Nom de l'utilisateur qui a enregistré la dépense
}

export type UserRole = 'ADMIN' | 'SELLER' | 'USER';

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string; // 'CONTRACT', 'ID', 'OTHER'
  date: string;
  content: string; // Base64
}

// --- UTILISATEUR (Compte d'accès Application) ---
export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // Code PIN
  avatar?: string;
  email?: string; // Contact direct utilisateur
  phone?: string; // Contact direct utilisateur
  commissionRate?: number; // Pourcentage de commission sur les ventes (lié au compte vendeur)
  permissions: string[]; // Liste des IDs de permission (ex: 'inventory.view', 'inventory.add')
  lastLogin?: string; // Timestamp de la dernière connexion
}

// --- EMPLOYÉ (Ressource Humaine Physique) ---
export interface Employee {
  id: string;
  fullName: string;
  photo?: string; // Photo d'identité
  jobTitle: string; // Intitulé du poste
  phone?: string;
  email?: string;
  address?: string;
  
  // Données Personnelles
  gender?: 'M' | 'F';
  birthDate?: string; // Date de naissance
  residence?: string;
  childrenCount?: number;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  
  // Contact Urgence
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Données Contrat & Paie
  baseSalary: number; // Salaire fixe mensuel
  hireDate: string;
  department?: string; // Rayon / Service
  
  documents: EmployeeDocument[]; // Contrats, CNI, etc.
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number; // Total des achats en devise de base
  lastPurchaseDate?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
}

export type CashMovementType = 'SALE' | 'PURCHASE' | 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE';

export interface CashMovement {
  id: string;
  date: string;
  type: CashMovementType;
  amount: number; // En devise de base
  description: string;
  performedBy: string; // Nom de l'utilisateur
}

export interface CashClosing {
  id: string;
  date: string; // Date de la clôture
  periodStart: string; // Date du début de la période clôturée
  openingBalance: number; // Solde au début de la journée/période
  closingBalance: number; // Solde à la fin
  totalIn: number; // Total Entrées (Ventes + Dépôts)
  totalOut: number; // Total Sorties (Achats + Retraits + Dépenses)
  cashCount?: number; // Montant réel compté (si écart)
  type: 'MANUAL' | 'AUTO';
  closedBy: string; // "Système" ou Nom Admin
}

export interface BackupData {
  version: string;
  timestamp: string;
  settings: StoreSettings;
  currency: string;
  inventory: InventoryItem[];
  users: User[];
  employees: Employee[]; // Backup des employés
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
}

export interface AppUpdate {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
