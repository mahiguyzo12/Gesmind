
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InventoryItem, GeneratedItemData, Currency } from "../types";

// Initialisation avec la librairie standard et la clé injectée via Vite
// La clé est définie dans vite.config.ts (process.env.API_KEY)
const genAI = new GoogleGenerativeAI(process.env.API_KEY as string);

/**
 * Analyzes the current inventory to provide insights, alerts, and suggestions.
 */
export const analyzeStock = async (inventory: InventoryItem[], currency: Currency): Promise<any> => {
  try {
    // Utilisation du modèle gemini-2.5-flash, plus récent et recommandé
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert prices to selected currency for the prompt context
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Nettoyage au cas où le modèle renvoie quand même du markdown
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erreur Gemini Analysis:", error);
    throw error;
  }
};

/**
 * Generates details (category, description, price estimate) for a new item name.
 */
export const generateItemDetails = async (itemName: string): Promise<GeneratedItemData> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Génère des données de stock réalistes pour un produit nommé : "${itemName}".
      
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erreur Gemini Generation:", error);
    throw error;
  }
};

/**
 * Generates an SVG Logo based on the store name and optional description.
 */
export const generateStoreLogo = async (storeName: string, description?: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const userDesc = description ? `Style/Description souhaitée : "${description}".` : "Style : Moderne, Minimaliste, Professionnel.";

    const prompt = `
      Crée un logo vectoriel SVG pour une entreprise nommée "${storeName}".
      
      Instructions de design :
      1. ${userDesc}
      2. Inclus le nom "${storeName}" ou ses initiales de manière artistique si pertinent pour le style.
      3. Utilise des couleurs professionnelles sur fond transparent.
      4. Dimensions: viewBox="0 0 200 200".
      5. Le SVG doit être simple et propre.
      
      RÉPONDS UNIQUEMENT AVEC LE CODE SVG BRUT. Pas de markdown (pas de \`\`\`), pas de texte avant ou après. Juste <svg>...</svg>.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let svgText = response.text();

    // Nettoyage agressif du markdown
    svgText = svgText.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
    
    // Vérification basique
    if (!svgText.startsWith('<svg')) {
       const startIndex = svgText.indexOf('<svg');
       const endIndex = svgText.lastIndexOf('</svg>');
       if (startIndex !== -1 && endIndex !== -1) {
         svgText = svgText.substring(startIndex, endIndex + 6);
       }
    }

    return svgText;
  } catch (error) {
    console.error("Erreur Gemini Logo Generation:", error);
    throw error;
  }
};
