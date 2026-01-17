
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InventoryItem, GeneratedItemData, Currency } from "../types";

// Initialisation avec la nouvelle librairie @google/generative-ai
// La clé est définie dans vite.config.ts (process.env.API_KEY)
const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenerativeAI(API_KEY);

/**
 * Analyzes the current inventory to provide insights, alerts, and suggestions.
 */
export const analyzeStock = async (inventory: InventoryItem[], currency: Currency): Promise<any> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante. Vérifiez la configuration du build.");

  try {
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

    // Utilisation de la nouvelle syntaxe avec getGenerativeModel
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    // Accès au contenu de la réponse
    const text = response.response.text() || "";
    
    // Nettoyage au cas où le modèle renvoie quand même du markdown
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Erreur Gemini Analysis:", error);
    throw new Error(error.message || "Erreur lors de l'analyse IA");
  }
};

/**
 * Generates details (category, description, price estimate) for a new item name.
 */
export const generateItemDetails = async (itemName: string): Promise<GeneratedItemData> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante.");

  try {
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

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    const text = response.response.text() || "";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Erreur Gemini Generation:", error);
    throw new Error(error.message || "Erreur génération détails");
  }
};

/**
 * Generates an SVG Logo based on the store name and optional description.
 * Now supports an optional reference image for style transfer/inspiration.
 */
export const generateStoreLogo = async (storeName: string, description?: string, referenceImageBase64?: string): Promise<string> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante.");

  try {
    const userDesc = description ? `Style/Description souhaitée : "${description}".` : "Style : Moderne, Minimaliste, Professionnel.";

    let promptText = `
      Tu es un expert en design de logo vectoriel (SVG).
      Crée un logo pour une entreprise nommée "${storeName}".
      
      Instructions de design :
      1. ${userDesc}
      2. Le logo doit être vectoriel (SVG), simple, iconique et professionnel.
      3. Dimensions: viewBox="0 0 512 512".
      4. Utilise des couleurs attrayantes.
      5. IMPORTANT: Retourne SEULEMENT le code XML du <svg>. Pas de balises markdown (\`\`\`xml ou \`\`\`svg), pas de texte introductif.
      
      Code SVG :
    `;

    let contentParts: any[] = [{ text: promptText }];

    if (referenceImageBase64) {
        // Extraction du format base64 pur et du mimeType
        const parts = referenceImageBase64.split(',');
        const base64Data = parts[1] || referenceImageBase64;
        
        let mimeType = 'image/jpeg'; // Default
        if (parts[0].includes(':')) {
            mimeType = parts[0].split(':')[1].split(';')[0];
        }

        promptText += "\n\nInspire-toi de l'image fournie.";

        // Ajout de l'image comme partie du contenu pour le modèle multimodal
        contentParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
    }

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(contentParts);

    let svgText = response.response.text() || "";

    // Nettoyage robuste pour extraire uniquement le bloc <svg>...</svg>
    const svgStart = svgText.indexOf('<svg');
    const svgEnd = svgText.lastIndexOf('</svg>');

    if (svgStart !== -1 && svgEnd !== -1) {
        svgText = svgText.substring(svgStart, svgEnd + 6);
    } else {
        // Fallback nettoyage markdown classique
        svgText = svgText.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
    }
    
    // Vérification basique
    if (!svgText.includes('<svg')) {
       throw new Error("Le modèle n'a pas généré de code SVG valide.");
    }

    return svgText;
  } catch (error: any) {
    console.error("Erreur Gemini Logo Generation:", error);
    throw new Error(error.message || "Erreur de génération du logo");
  }
};
