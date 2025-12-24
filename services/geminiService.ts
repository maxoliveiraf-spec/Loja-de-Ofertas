
import { GoogleGenAI, Type } from "@google/genai";

const productSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    category: { type: Type.STRING },
    estimatedPrice: { type: Type.STRING },
    imageSearchTerm: { type: Type.STRING }
  },
  required: ["title", "description", "category", "imageSearchTerm"],
};

/**
 * Enriquece os dados de um produto a partir de uma URL usando o modelo Gemini.
 * A instância do GoogleGenAI é criada dentro da função para garantir o uso da chave de API atual.
 */
export const enrichProductData = async (url: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY não disponível.");
    return {};
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analise este link de produto e gere detalhes de marketing em português: ${url}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: productSchema,
      },
    });
    
    const text = response.text;
    if (!text) return {};
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro no Gemini (enrichProductData):", error);
    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      console.warn("Permissão negada. Verifique se a chave de API tem acesso ao modelo gemini-3-flash-preview.");
    }
    return {};
  }
};

/**
 * Gera um pitch de marketing persuasivo para o produto.
 */
export const generateMarketingPitch = async (productTitle: string, description: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Confira esta oferta incrível selecionada para você!";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Crie um texto curto (máximo 300 caracteres), persuasivo e empolgante para vender este produto: "${productTitle}". 
    Use gatilhos mentais de benefício e prova social. Baseie-se nesta descrição: ${description}. 
    O texto deve ser voltado para convencer o cliente a comprar agora. Responda apenas com o texto de vendas pronto, sem aspas.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Uma oferta imperdível selecionada especialmente para você por nossa equipe de curadores!";
  } catch (error: any) {
    console.error("Erro no Gemini (generateMarketingPitch):", error);
    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      return "Aproveite esta oportunidade única! Produto de alta qualidade com o melhor preço que você vai encontrar hoje.";
    }
    return "Confira esta oferta incrível que separamos hoje para você. Qualidade garantida e o melhor preço do mercado!";
  }
};
