
// Dictionnaire de traduction
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    // Auth & Setup
    login_title: "Connexion",
    login_subtitle: "Veuillez vous identifier pour continuer",
    username: "Utilisateur",
    password: "Mot de passe",
    confirm_password: "Confirmer le mot de passe",
    login_button: "Se connecter",
    login_error: "Identifiants incorrects.",
    login_secure: "Connexion sécurisée...",
    no_store: "Aucune entreprise n'est configurée.",
    create_first_store: "Créer ma première entreprise",
    join_store: "Rejoindre une entreprise",
    join_with_id: "Rejoindre avec un ID",
    or: "OU",
    create_new_store: "Créer une nouvelle entreprise",
    cloud_login: "Connexion Cloud / Restauration",
    back: "Retour",
    
    // Auth Form Fields
    field_email: "Email",
    field_phone: "Téléphone",
    field_otp: "Code de vérification",
    btn_send_code: "Envoyer Code",
    btn_verify: "Vérifier",
    btn_google: "Continuer avec Google",
    btn_email: "Email",
    btn_phone: "Téléphone",
    msg_code_sent: "Code SMS envoyé !",
    msg_verified: "Vérifié !",
    msg_google_connected: "Google connecté !",
    
    // Forgot Password
    forgot_password: "Mot de passe oublié ?",
    forgot_title: "Réinitialisation",
    forgot_desc: "Entrez votre email pour recevoir un lien.",
    btn_reset_link: "Envoyer le lien",
    back_to_login: "Retour à la connexion",
    reset_sent: "Email envoyé ! Vérifiez vos spams.",

    // Create Store Wizard
    setup_title: "Configuration Complète",
    section_personal: "Informations Personnelles (Admin)",
    section_company: "Informations de l'Entreprise",
    section_logo: "Identité Visuelle (Logo)",
    section_security: "Informations de Connexion",
    
    label_name: "Nom",
    label_firstname: "Prénom",
    label_dob: "Date de Naissance",
    label_pob: "Lieu de Naissance",
    label_address: "Lieu d'habitation",
    label_zip: "Code Postal",
    
    label_company_full: "Nom Complet / Raison Sociale",
    label_company_short: "Nom Abrégé (Affichage)",
    label_rccm: "Registre Commerce (RCCM)",
    label_nif: "NIF / Numéro Fiscal",
    label_city: "Localisation / Ville",
    
    label_logo_prompt: "Description pour l'IA (Console)",
    btn_generate_logo: "Générer Logo IA",
    btn_import: "Importer",
    
    label_username_login: "Nom d'utilisateur (Login)",
    label_pin: "Mot de passe / PIN",
    msg_account_detected: "Compte Cloud détecté",
    msg_account_linked: "Vous êtes connecté. L'entreprise sera liée à ce compte.",
    
    btn_create_start: "Créer et Démarrer",
    
    // Join Store
    title_join: "Rejoindre une entreprise",
    label_store_id: "ID de l'entreprise",
    btn_search: "Rechercher",
    msg_store_found: "Entreprise trouvée !",
    btn_confirm_join: "Confirmer",
    
    // Cloud Setup
    cloud_setup_title: "Sauvegarde & Synchro",
    cloud_setup_subtitle: "Connectez-vous pour sécuriser vos données.",
    config_required: "Configuration Requise",
    config_paste_json: "Collez ici votre 'firebaseConfig' (JSON)",
    btn_save_connect: "Sauvegarder & Connecter",
    btn_offline: "Ou continuer en mode Hors Ligne (Local)",
    sec_check_title: "Sécurisez votre compte",
    sec_check_subtitle: "Ajoutez une méthode de récupération.",
    add_phone: "Ajouter un téléphone",
    add_email: "Ajouter un Email",
    link_sent: "Lien envoyé !",
    
    // Menu & App
    menu_dashboard: "Tableau de bord",
    menu_dashboard_desc: "Vue d'ensemble",
    menu_inventory: "Stocks",
    menu_inventory_desc: "Produits",
    menu_commercial: "Ventes/Achats",
    menu_commercial_desc: "Facturation",
    menu_expenses: "Dépenses",
    menu_expenses_desc: "Charges & Frais",
    menu_treasury: "Trésorerie",
    menu_treasury_desc: "Caisse",
    menu_customers: "Clients",
    menu_customers_desc: "Fidélité",
    menu_suppliers: "Fournisseurs",
    menu_suppliers_desc: "Achats",
    menu_personnel: "Personnel",
    menu_personnel_desc: "RH & Paie",
    menu_users: "Utilisateurs",
    menu_users_desc: "Gestion",
    menu_ai: "IA",
    menu_ai_desc: "Assistant",
    menu_settings: "Paramètres",
    menu_settings_desc: "Config",
    logout: "Se déconnecter",
    hello: "Bonjour",

    // Header
    back_menu: "Menu",
    
    // Settings
    settings_title: "Paramètres",
    settings_subtitle: "Gérez votre profil personnel, la configuration de l'entreprise et vos sauvegardes.",
    tab_profile: "Mon Profil",
    tab_store: "Boutique & IA",
    tab_data: "Cloud & Data",
    
    edit_profile: "Modifier mes informations",
    connected_account: "Compte connecté",
    save_profile: "Sauvegarder mon profil",
    profile_saved: "Profil mis à jour !",
    
    general_config: "Configuration Générale",
    appearance: "Apparence",
    light: "Clair",
    dark: "Sombre",
    primary_color: "Couleur Principale",
    company_logo: "Logo de l'entreprise",
    load_logo: "Charger un logo",
    remove: "Supprimer",
    ai_active: "Intelligence Artificielle Activée",
    ai_ready: "Le moteur Gemini AI est configuré et prêt à l'emploi.",
    currency_lang: "Devise & Langue",
    company_details: "Coordonnées de l'entreprise",
    address: "Adresse complète",
    phone: "Téléphone",
    email: "Email",
    update_btn: "Mettre à jour",
    settings_saved: "Paramètres enregistrés !",
    
    cloud_sync: "Synchronisation Cloud",
    local_backup: "Sauvegardes Locales",
    export_json: "Exporter JSON",
    import_json: "Importer JSON",
    save: "Sauvegarder",
    active: "Actif"
  },
  en: {
    // Auth & Setup
    login_title: "Login",
    login_subtitle: "Please identify yourself to continue",
    username: "Username",
    password: "Password",
    confirm_password: "Confirm Password",
    login_button: "Sign In",
    login_error: "Incorrect credentials.",
    login_secure: "Secure login...",
    no_store: "No company configured.",
    create_first_store: "Create my first company",
    join_store: "Join a company",
    join_with_id: "Join with ID",
    or: "OR",
    create_new_store: "Create new company",
    cloud_login: "Cloud Login / Restore",
    back: "Back",
    
    // Auth Form Fields
    field_email: "Email",
    field_phone: "Phone",
    field_otp: "Verification Code",
    btn_send_code: "Send Code",
    btn_verify: "Verify",
    btn_google: "Continue with Google",
    btn_email: "Email",
    btn_phone: "Phone",
    msg_code_sent: "SMS Code sent!",
    msg_verified: "Verified!",
    msg_google_connected: "Google connected!",
    
    // Forgot Password
    forgot_password: "Forgot password?",
    forgot_title: "Reset Password",
    forgot_desc: "Enter your email to receive a link.",
    btn_reset_link: "Send Link",
    back_to_login: "Back to Login",
    reset_sent: "Email sent! Check your spam.",

    // Create Store Wizard
    setup_title: "Full Configuration",
    section_personal: "Personal Info (Admin)",
    section_company: "Company Information",
    section_logo: "Visual Identity (Logo)",
    section_security: "Login Credentials",
    
    label_name: "Last Name",
    label_firstname: "First Name",
    label_dob: "Date of Birth",
    label_pob: "Place of Birth",
    label_address: "Home Address",
    label_zip: "Zip Code",
    
    label_company_full: "Full Company Name",
    label_company_short: "Short Name (Display)",
    label_rccm: "Registration No (RCCM)",
    label_nif: "Tax ID (NIF)",
    label_city: "City / Location",
    
    label_logo_prompt: "AI Description (Console)",
    btn_generate_logo: "Generate AI Logo",
    btn_import: "Import",
    
    label_username_login: "Username (Login)",
    label_pin: "Password / PIN",
    msg_account_detected: "Cloud Account Detected",
    msg_account_linked: "You are connected. The company will be linked to this account.",
    
    btn_create_start: "Create and Start",
    
    // Join Store
    title_join: "Join a Company",
    label_store_id: "Company ID",
    btn_search: "Search",
    msg_store_found: "Company Found!",
    btn_confirm_join: "Confirm",
    
    // Cloud Setup
    cloud_setup_title: "Backup & Sync",
    cloud_setup_subtitle: "Login to secure your data.",
    config_required: "Configuration Required",
    config_paste_json: "Paste your 'firebaseConfig' (JSON) here",
    btn_save_connect: "Save & Connect",
    btn_offline: "Or continue Offline (Local)",
    sec_check_title: "Secure your account",
    sec_check_subtitle: "Add a recovery method.",
    add_phone: "Add Phone",
    add_email: "Add Email",
    link_sent: "Link sent!",
    
    // Menu
    menu_dashboard: "Dashboard",
    menu_dashboard_desc: "Overview",
    menu_inventory: "Inventory",
    menu_inventory_desc: "Products",
    menu_commercial: "Sales/Purchases",
    menu_commercial_desc: "Billing",
    menu_expenses: "Expenses",
    menu_expenses_desc: "Costs",
    menu_treasury: "Treasury",
    menu_treasury_desc: "Cash Flow",
    menu_customers: "Customers",
    menu_customers_desc: "Loyalty",
    menu_suppliers: "Suppliers",
    menu_suppliers_desc: "Purchasing",
    menu_personnel: "Personnel",
    menu_personnel_desc: "HR & Payroll",
    menu_users: "Users",
    menu_users_desc: "Access",
    menu_ai: "AI",
    menu_ai_desc: "Assistant",
    menu_settings: "Settings",
    menu_settings_desc: "Config",
    logout: "Logout",
    hello: "Hello",

    // Header
    back_menu: "Menu",
    
    // Settings
    settings_title: "Settings",
    settings_subtitle: "Manage your profile, company configuration and backups.",
    tab_profile: "My Profile",
    tab_store: "Store & AI",
    tab_data: "Cloud & Data",
    
    edit_profile: "Edit Information",
    connected_account: "Connected Account",
    save_profile: "Save Profile",
    profile_saved: "Profile updated!",
    
    general_config: "General Configuration",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    primary_color: "Primary Color",
    company_logo: "Company Logo",
    load_logo: "Upload Logo",
    remove: "Remove",
    ai_active: "Artificial Intelligence Active",
    ai_ready: "Gemini AI engine is ready.",
    currency_lang: "Currency & Language",
    company_details: "Company Details",
    address: "Full Address",
    phone: "Phone",
    email: "Email",
    update_btn: "Update",
    settings_saved: "Settings saved!",
    
    cloud_sync: "Cloud Synchronization",
    local_backup: "Local Backups",
    export_json: "Export JSON",
    import_json: "Import JSON",
    save: "Save",
    active: "Active"
  }
};

// Helper function
export const getTranslation = (lang: string, key: string): string => {
  const language = TRANSLATIONS[lang] ? lang : 'fr';
  // Fallback to English if key missing in target language, then key itself
  return TRANSLATIONS[language][key] || TRANSLATIONS['en'][key] || key;
};
