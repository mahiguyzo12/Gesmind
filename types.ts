export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  price: number;
  supplier: string;
  location: string;
  description: string;
  lastUpdated: string;
  createdBy?: string;
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
  SETTINGS = 'SETTINGS',
}

export type CloudProvider = 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'NONE';

export type ThemeMode = 'light' | 'dark';

export interface StoreMetadata {
  id: string;
  name: string;
  logoUrl?: string;
  ownerId: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  city?: string;
  country?: string;
  zipCode?: string;
  phone: string;
  email: string;
  website?: string;

  // Infos Légales & Fiscales
  rccm?: string;
  nif?: string;
  legalStatus?: string;

  logoUrl?: string;
  recoveryKey?: string;
  language: string;
  lastCloudSync?: string;
  cloudProvider?: CloudProvider;
  lastClosingDate?: string;
  githubRepo?: string;
  themeMode?: ThemeMode;
  themeColor?: string;
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
  rate: number;
  symbol: string;
}

export type TransactionType = 'SALE' | 'PURCHASE';
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_MONEY'
  | 'CHECK'
  | 'OTHER';

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  items: TransactionItem[];
  totalAmount: number;
  amountPaid: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod?: PaymentMethod; // Important pour le calcul de caisse
  isLocked?: boolean; // Verrouillage après clôture
  paidAt?: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  sellerId: string; // registerId conceptuel
  sellerName: string;

  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;

  notes?: string;
}

export type ExpenseCategory =
  | 'RENT'
  | 'SALARY'
  | 'UTILITIES'
  | 'TRANSPORT'
  | 'MARKETING'
  | 'TAX'
  | 'MAINTENANCE'
  | 'OTHER';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidBy: string;
}

export type UserRole = 'ADMIN' | 'SELLER' | 'USER';

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  content: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  permissions: string[];
  lastLogin?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  photo?: string;
  jobTitle: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;

  gender?: 'M' | 'F';
  birthDate?: string;
  placeOfBirth?: string;
  residence?: string;
  childrenCount?: number;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };

  baseSalary: number;
  hireDate: string;
  department?: string;

  documents: EmployeeDocument[];
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
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

export type CashMovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'EXPENSE'
  | 'BANK_DEPOSIT';

export interface CashMovement {
  id: string;
  date: string;
  type: CashMovementType;
  amount: number;
  description: string;
  performedBy: string;
}

export interface CashClosing {
  id: string; // Format STRICT: YYYY-MM-DD_registerId
  date: string; // Date de clôture (ISO)
  registerId: string; // ID de la caisse/utilisateur
  closedBy: string; // "user" ou "system"

  // Totaux calculés
  totalSales: number; // Ventes totales

  // Répartition Paiements
  amountCash: number;
  amountMobileMoney: number;
  amountCard: number;

  // Écart de caisse
  cashExpected: number; // Théorique
  cashReal: number; // Saisi par l'utilisateur (ou = expected si auto)
  difference: number; // Real - Expected

  status: 'closed';
  autoClosed: boolean; // True si généré par le système
  comment?: string;

  // Legacy fields compatibility (optional but kept for transition)
  totalCashIn?: number;
  totalCashOut?: number;
  periodStart?: string;
  openingBalance?: number;
  closingBalance?: number;
  totalIn?: number;
  totalOut?: number;
  type?: 'MANUAL' | 'AUTO';
}

export interface RegisterStatus {
  id: string;
  status: 'open' | 'locked';
  lockedUntil?: string; // ISO Date String
  lockedReason?: 'daily_closure' | 'auto_closure';
}

export interface BackupData {
  version: string;
  timestamp: string;
  settings: StoreSettings;
  currency: string;
  inventory: InventoryItem[];
  users: User[];
  employees: Employee[];
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
