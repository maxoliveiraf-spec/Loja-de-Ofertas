
import { GoogleGenAI, Type } from "@google/genai";

// Definindo o schema conforme Type do @google/genai
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
 * A instância do GoogleGenAI é criada dentro da função para garantir o uso da chave de API atual do ambiente.
 */
export const enrichProductData = async (url: string) => {
  try {
    // Usando a chave de API diretamente do ambiente process.env.API_KEY conforme diretrizes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analise este link de produto e gere detalhes de marketing em português: ${url}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: productSchema,
      },
    });
    
    // Acessando a propriedade .text (não é um método) e removendo espaços desnecessários
    const text = response.text?.trim();
    if (!text) return {};
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro no Gemini (enrichProductData):", error);
    return {};
  }
};

/**
 * Gera um pitch de marketing persuasivo para o produto.
 */
export const generateMarketingPitch = async (productTitle: string, description: string) => {
  try {
    // Usando a chave de API diretamente do ambiente process.env.API_KEY conforme diretrizes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Crie um texto curto (máximo 300 caracteres), persuasivo e empolgante para vender este produto: "${productTitle}". 
    Use gatilhos mentais de benefício e prova social. Baseie-se nesta descrição: ${description}. 
    O texto deve ser voltado para convencer o cliente a comprar agora. Responda apenas com o texto de vendas pronto, sem aspas.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    // Acessando a propriedade .text diretamente para o conteúdo gerado
    return response.text || "Confira esta oferta incrível selecionada para você!";
  } catch (error: any) {
    console.error("Erro no Gemini (generateMarketingPitch):", error);
    return "Confira esta oferta incrível que separamos hoje para você. Qualidade garantida e o melhor preço do mercado!";
  }
};
