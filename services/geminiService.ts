import { GoogleGenerativeAI } from "@google/generative-ai";
import { InventoryItem, GeneratedItemData, Currency } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeStock = async (inventory: InventoryItem[], currency: Currency): Promise<any> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante. Vérifiez la configuration du build.");

  try {
    const inventorySummary = JSON.stringify(inventory.map(item => ({
      name: item.name,
      qty: item.quantity,
      min: item.minQuantity,
      price_unit: Math.round(item.price * currency.rate),
      total_val: Math.round(item.price * item.quantity * currency.rate),
      cat: item.category,
      supplier: item.supplier
    })));

    const prompt = `
        Analyse cette liste de stock (JSON) et fournis un rapport de gestion stratégique.
        La devise actuelle est : ${currency.label} (${currency.code}).
        Tous les montants fournis dans le JSON sont déjà convertis en ${currency.code}.
        
        Identifie les risques de rupture, les surstocks potentiels et donne des conseils pour optimiser la valeur du stock.
        Prends en compte la diversité des fournisseurs si mentionnés.
        
        RÉPONDS UNIQUEMENT AVEC UN OBJET JSON VALIDE suivant ce schéma, sans markdown (pas de \`\`\`json) :
        {
          "summary": "Résumé global de l'état du stock avec mention de la valeur totale",
          "alerts": ["Liste des alertes (rupture, stock bas, etc.)"],
          "suggestions": ["Conseils pour optimiser le stock"]
        }
        
        Données: ${inventorySummary}
      `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Erreur Gemini Analysis:", error);
    throw new Error(error.message || "Erreur lors de l'analyse IA");
  }
};

export const generateItemDetails = async (itemName: string): Promise<GeneratedItemData> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante.");

  try {
    const prompt = `
      Génère des données de stock réalistes pour un produit nommé : \\"${itemName}\\".
      
      RÉPONDS UNIQUEMENT AVEC UN OBJET JSON VALIDE suivant ce schéma, sans markdown :
      {
        "category": "Catégorie estimée",
        "description": "Description courte marketing",
        "suggestedPrice": 0.00,
        "minQuantitySuggestion": 5,
        "suggestedSupplier": "Nom fournisseur suggéré",
        "suggestedLocation": "Emplacement type suggéré"
      }
      Note: suggestedPrice doit être un nombre en EUROS.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Erreur Gemini Generation:", error);
    throw new Error(error.message || "Erreur génération détails");
  }
};

export const generateStoreLogo = async (storeName: string, description?: string, referenceImageBase64?: string): Promise<string> => {
    // This is a simplified version to avoid compilation issues.
    const initial = storeName ? storeName.substring(0, 1).toUpperCase() : 'G';
    const staticLogo = '<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="100" rx="15" ry="15" fill="#4CAF50" />' +
        '<text x="50" y="55" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">' + initial + '</text>' +
        '</svg>';
    return Promise.resolve(staticLogo);
};
