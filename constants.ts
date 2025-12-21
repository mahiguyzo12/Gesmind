import {
  InventoryItem,
  Currency,
  Transaction,
  User,
  CashMovement,
  Customer,
  Supplier,
} from './types';

// SCHEMA DES PERMISSIONS
export const PERMISSION_CATEGORIES = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    actions: [{ id: 'view', label: 'Voir le Dashboard' }],
  },
  {
    id: 'inventory',
    label: 'Stocks (Inventaire)',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'add', label: 'Ajouter Produit' },
      { id: 'edit', label: 'Modifier Produit' },
      { id: 'delete', label: 'Supprimer Produit' },
      { id: 'view_profit', label: 'Voir Marges & Prix Achat' },
    ],
  },
  {
    id: 'commercial',
    label: 'Ventes/Achats',
    actions: [
      { id: 'view', label: 'Voir Historique' },
      { id: 'sale', label: 'Saisir Vente' },
      { id: 'purchase', label: 'Saisir Achat' },
      { id: 'delete', label: 'Supprimer Transaction' },
    ],
  },
  {
    id: 'expenses',
    label: 'Dépenses',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'manage', label: 'Gérer Dépenses' },
    ],
  },
  {
    id: 'treasury',
    label: 'Trésorerie',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'manage', label: 'Mouvements & Clôture' },
    ],
  },
  {
    id: 'customers',
    label: 'Clients',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'manage', label: 'Ajouter/Modifier' },
    ],
  },
  {
    id: 'suppliers',
    label: 'Fournisseurs',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'manage', label: 'Ajouter/Modifier' },
    ],
  },
  {
    id: 'personnel',
    label: 'Personnel (RH)',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'manage', label: 'Gérer & Payer' },
    ],
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'manage', label: 'Créer/Modifier Comptes' },
    ],
  },
  {
    id: 'ai',
    label: 'Assistant IA',
    actions: [{ id: 'view', label: 'Utiliser' }],
  },
  {
    id: 'settings',
    label: 'Paramètres',
    actions: [
      { id: 'view', label: 'Accès Menu' },
      { id: 'view_profile', label: 'Mon Profil' },
      { id: 'view_store', label: 'Config Boutique & IA' },
      { id: 'view_data', label: 'Cloud & Sauvegardes' },
    ],
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'MacBook Pro 16"',
    sku: 'APP-MBP-16-M3',
    category: 'Électronique',
    quantity: 12,
    minQuantity: 5,
    purchasePrice: 2000,
    price: 2499,
    supplier: 'Apple Distribution',
    location: 'Rayon A-12',
    description: 'Ordinateur portable haute performance Apple M3 Pro',
    lastUpdated: '2023-10-25',
  },
  {
    id: '2',
    name: 'Chaise Ergonomique Herman',
    sku: 'HER-AERON-B',
    category: 'Mobilier',
    quantity: 3,
    minQuantity: 10,
    purchasePrice: 800,
    price: 1200,
    supplier: 'Office Comfort Ltd',
    location: 'Entrepôt B',
    description: 'Chaise de bureau ergonomique premium',
    lastUpdated: '2023-10-20',
  },
  {
    id: '3',
    name: 'Écran Dell UltraSharp 27"',
    sku: 'DEL-U2723QE',
    category: 'Électronique',
    quantity: 45,
    minQuantity: 15,
    purchasePrice: 300,
    price: 450,
    supplier: 'TechWholesale',
    location: 'Rayon A-04',
    description: 'Moniteur 4K USB-C pour professionnels',
    lastUpdated: '2023-10-26',
  },
  {
    id: '4',
    name: 'Clavier Mécanique Sans Fil',
    sku: 'LOG-MX-MECH',
    category: 'Accessoires',
    quantity: 8,
    minQuantity: 20,
    purchasePrice: 80,
    price: 129,
    supplier: 'Peripherals Plus',
    location: 'Rayon C-02',
    description: 'Clavier compact switchs tactiles',
    lastUpdated: '2023-10-15',
  },
  {
    id: '5',
    name: 'Bureau Assis-Debout',
    sku: 'FLX-DSP-160',
    category: 'Mobilier',
    quantity: 15,
    minQuantity: 5,
    purchasePrice: 400,
    price: 650,
    supplier: 'Office Comfort Ltd',
    location: 'Entrepôt B',
    description: 'Bureau motorisé ajustable en hauteur',
    lastUpdated: '2023-10-22',
  },
];

export const CATEGORIES = [
  'Électronique',
  'Mobilier',
  'Accessoires',
  'Bureautique',
  'Réseau',
  'Autre',
];

export const CURRENCIES: Record<string, Currency> = {
  // Europe
  EUR: { code: 'EUR', label: 'Euro', symbol: '€', rate: 1 },
  GBP: { code: 'GBP', label: 'Livre Sterling', symbol: '£', rate: 0.85 },
  CHF: { code: 'CHF', label: 'Franc Suisse', symbol: 'CHF', rate: 0.95 },
  SEK: { code: 'SEK', label: 'Couronne Suédoise', symbol: 'kr', rate: 11.2 },
  NOK: { code: 'NOK', label: 'Couronne Norvégienne', symbol: 'kr', rate: 11.4 },
  DKK: { code: 'DKK', label: 'Couronne Danoise', symbol: 'kr', rate: 7.45 },
  PLN: { code: 'PLN', label: 'Złoty Polonais', symbol: 'zł', rate: 4.3 },
  HUF: { code: 'HUF', label: 'Forint Hongrois', symbol: 'Ft', rate: 385 },
  CZK: { code: 'CZK', label: 'Couronne Tchèque', symbol: 'Kč', rate: 24.5 },
  RON: { code: 'RON', label: 'Leu Roumain', symbol: 'lei', rate: 4.97 },
  RUB: { code: 'RUB', label: 'Rouble Russe', symbol: '₽', rate: 98.5 },
  TRY: { code: 'TRY', label: 'Lire Turque', symbol: '₺', rate: 33.5 },

  // Amériques
  USD: { code: 'USD', label: 'Dollar Américain', symbol: '$', rate: 1.08 },
  CAD: { code: 'CAD', label: 'Dollar Canadien', symbol: 'CA$', rate: 1.48 },
  MXN: { code: 'MXN', label: 'Peso Mexicain', symbol: 'Mex$', rate: 18.5 },
  BRL: { code: 'BRL', label: 'Réal Brésilien', symbol: 'R$', rate: 5.35 },
  ARS: { code: 'ARS', label: 'Peso Argentin', symbol: '$', rate: 900 },
  CLP: { code: 'CLP', label: 'Peso Chilien', symbol: '$', rate: 990 },
  COP: { code: 'COP', label: 'Peso Colombien', symbol: '$', rate: 4200 },
  PEN: { code: 'PEN', label: 'Sol Péruvien', symbol: 'S/', rate: 4.05 },

  // Asie & Pacifique
  CNY: { code: 'CNY', label: 'Yuan Chinois', symbol: '¥', rate: 7.8 },
  JPY: { code: 'JPY', label: 'Yen Japonais', symbol: '¥', rate: 163 },
  INR: { code: 'INR', label: 'Roupie Indienne', symbol: '₹', rate: 90 },
  KRW: { code: 'KRW', label: 'Won Sud-Coréen', symbol: '₩', rate: 1450 },
  AUD: { code: 'AUD', label: 'Dollar Australien', symbol: 'A$', rate: 1.65 },
  NZD: {
    code: 'NZD',
    label: 'Dollar Néo-Zélandais',
    symbol: 'NZ$',
    rate: 1.78,
  },
  SGD: { code: 'SGD', label: 'Dollar de Singapour', symbol: 'S$', rate: 1.45 },
  HKD: { code: 'HKD', label: 'Dollar de Hong Kong', symbol: 'HK$', rate: 8.45 },
  IDR: { code: 'IDR', label: 'Roupie Indonésienne', symbol: 'Rp', rate: 17000 },
  MYR: { code: 'MYR', label: 'Ringgit Malaisien', symbol: 'RM', rate: 5.15 },
  PHP: { code: 'PHP', label: 'Peso Philippin', symbol: '₱', rate: 60.5 },
  THB: { code: 'THB', label: 'Baht Thaïlandais', symbol: '฿', rate: 39.5 },
  VND: { code: 'VND', label: 'Dong Vietnamien', symbol: '₫', rate: 26500 },

  // Afrique & Moyen-Orient
  XOF: {
    code: 'XOF',
    label: 'Franc CFA (UEMOA)',
    symbol: 'F CFA',
    rate: 655.957,
  },
  XAF: {
    code: 'XAF',
    label: 'Franc CFA (CEMAC)',
    symbol: 'F CFA',
    rate: 655.957,
  },
  MAD: { code: 'MAD', label: 'Dirham Marocain', symbol: 'DH', rate: 10.8 },
  DZD: { code: 'DZD', label: 'Dinar Algérien', symbol: 'DA', rate: 145 },
  TND: { code: 'TND', label: 'Dinar Tunisien', symbol: 'DT', rate: 3.35 },
  EGP: { code: 'EGP', label: 'Livre Égyptienne', symbol: 'E£', rate: 33.5 },
  NGN: { code: 'NGN', label: 'Naira Nigérian', symbol: '₦', rate: 1600 },
  ZAR: { code: 'ZAR', label: 'Rand Sud-Africain', symbol: 'R', rate: 20.5 },
  KES: { code: 'KES', label: 'Shilling Kényan', symbol: 'KSh', rate: 145 },
  GHS: { code: 'GHS', label: 'Cedi Ghanéen', symbol: 'GH₵', rate: 13.5 },
  AED: { code: 'AED', label: 'Dirham EAU', symbol: 'dh', rate: 4.0 },
  SAR: { code: 'SAR', label: 'Riyal Saoudien', symbol: '﷼', rate: 4.05 },
  ILS: { code: 'ILS', label: 'Shekel Israélien', symbol: '₪', rate: 4.0 },
};

export const THEME_COLORS = [
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { id: 'emerald', label: 'Émeraude', hex: '#059669' },
  { id: 'blue', label: 'Azur', hex: '#2563eb' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'amber', label: 'Ambre', hex: '#d97706' },
  { id: 'slate', label: 'Graphite', hex: '#475569' },
];

// Helper pour générer toutes les permissions pour l'admin
const getAllPermissions = () => {
  const all: string[] = [];
  PERMISSION_CATEGORIES.forEach((cat) => {
    cat.actions.forEach((act) => {
      all.push(`${cat.id}.${act.id}`);
    });
  });
  return all;
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Administrateur',
    role: 'ADMIN',
    pin: '0000',
    avatar:
      'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff',
    commissionRate: 0,
    permissions: getAllPermissions(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'u2',
    name: 'Vendeur John',
    role: 'SELLER',
    pin: '1234',
    avatar: 'https://ui-avatars.com/api/?name=John&background=10b981&color=fff',
    commissionRate: 5,
    permissions: [
      'dashboard.view',
      'inventory.view',
      'commercial.view',
      'commercial.sale',
      'customers.view',
      'customers.manage',
      'settings.view',
      'settings.view_profile',
    ],
    lastLogin: '2023-10-28T09:30:00',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Alice Dupont',
    phone: '06 12 34 56 78',
    email: 'alice@email.com',
    address: '12 Rue de la Paix, Paris',
    totalSpent: 1250,
    lastPurchaseDate: '2023-10-25',
    notes: 'Client VIP, préfère les produits Apple',
  },
  {
    id: 'c2',
    name: 'Entreprise XYZ',
    phone: '01 98 76 54 32',
    email: 'contact@xyz.com',
    address: 'Zone Industrielle Nord',
    totalSpent: 5000,
    lastPurchaseDate: '2023-10-10',
    notes: 'Paiement à 30 jours',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    name: 'Apple Distribution',
    contactName: 'Marc Henri',
    phone: '+1 555-0100',
    email: 'b2b@apple.com',
    address: 'Cupertino, CA',
    notes: 'Fournisseur principal IT',
  },
  {
    id: 's2',
    name: 'Office Comfort Ltd',
    contactName: 'Sophie Bureau',
    phone: '04 56 78 90 12',
    email: 'sales@officecomfort.com',
    address: 'Lyon, France',
    notes: 'Livraison le vendredi uniquement',
  },
  {
    id: 's3',
    name: 'TechWholesale',
    contactName: 'Jean Grossiste',
    phone: '01 02 03 04 05',
    email: 'contact@techwholesale.com',
    address: 'Paris, France',
    notes: 'Grossiste généraliste',
  },
  {
    id: 's4',
    name: 'Peripherals Plus',
    contactName: 'Marie Claire',
    phone: '06 00 00 00 00',
    email: 'marie@peripherals.com',
    address: 'Bordeaux, France',
    notes: 'Accessoires',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'T-1001',
    type: 'SALE',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // Il y a 30 mins
    status: 'COMPLETED',
    totalAmount: 2949,
    amountPaid: 2949,
    paymentStatus: 'PAID',
    sellerId: 'u2',
    sellerName: 'Vendeur John',
    customerId: 'c1',
    customerName: 'Alice Dupont',
    items: [
      {
        productId: '1',
        productName: 'MacBook Pro 16"',
        quantity: 1,
        unitPrice: 2499,
      },
      {
        productId: '3',
        productName: 'Écran Dell UltraSharp 27"',
        quantity: 1,
        unitPrice: 450,
      },
    ],
  },
  {
    id: 'T-1002',
    type: 'PURCHASE',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Hier
    status: 'COMPLETED',
    totalAmount: 6000,
    amountPaid: 6000,
    paymentStatus: 'PAID',
    sellerId: 'u1',
    sellerName: 'Administrateur',
    supplierId: 's2',
    supplierName: 'Office Comfort Ltd',
    items: [
      {
        productId: '2',
        productName: 'Chaise Ergonomique Herman',
        quantity: 5,
        unitPrice: 1200,
      },
    ],
  },
];

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [
  {
    id: 'm1',
    date: '2023-10-26T09:00:00',
    type: 'DEPOSIT',
    amount: 5000,
    description: 'Fond de caisse initial',
    performedBy: 'Administrateur',
  },
  {
    id: 'm2',
    date: '2023-10-27T14:15:00',
    type: 'PURCHASE',
    amount: 6000,
    description: 'Achat Stock (Ref T-1002)',
    performedBy: 'Administrateur',
  },
  {
    id: 'm3',
    date: '2023-10-28T10:30:00',
    type: 'SALE',
    amount: 2949,
    description: 'Vente (Ref T-1001)',
    performedBy: 'Vendeur John',
  },
];
