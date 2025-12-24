import { GoogleGenAI } from "@google/genai";

const productSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    estimatedPrice: { type: "string" },
    imageSearchTerm: { type: "string" }
  },
  required: ["title", "description", "category", "imageSearchTerm"],
};

export const enrichProductData = async (url: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API_KEY não disponível.");
    return {};
  }

  try {
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-ignore
        responseSchema: productSchema,
      },
    });

    const prompt = `Analise este link de produto e gere detalhes de marketing em português: ${url}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) return {};
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro no Gemini (enrichProductData):", error);
    return {};
  }
};

export const generateMarketingPitch = async (productTitle: string, description: string) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return "Confira esta oferta incrível selecionada para você!";

  try {
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Crie um texto curto (máximo 300 caracteres), persuasivo e empolgante para vender este produto: "${productTitle}". 
    Use gatilhos mentais de benefício e prova social. Baseie-se nesta descrição: ${description}. 
    O texto deve ser voltado para convencer o cliente a comprar agora. Responda apenas com o texto de vendas pronto, sem aspas.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Uma oferta imperdível selecionada especialmente para você por nossa equipe de curadores!";
  } catch (error: any) {
    console.error("Erro no Gemini (generateMarketingPitch):", error);
    return "Confira esta oferta incrível que separamos hoje para você. Qualidade garantida e o melhor preço do mercado!";
  }
};
