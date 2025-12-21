
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// Initialize Gemini Client
// Using process.env.API_KEY as strictly required by the environment for stable connection
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for structured product data
const productSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A catchy, short product title in Portuguese (max 50 chars).",
    },
    description: {
      type: Type.STRING,
      description: "A persuasive marketing description in Portuguese (max 150 chars).",
    },
    category: {
      type: Type.STRING,
      description: "The general category of the product (e.g., Eletrônicos, Casa, Moda).",
    },
    estimatedPrice: {
      type: Type.STRING,
      description: "An estimated price range or value if inferable from the URL type (e.g., 'R$ 100 - R$ 200'), otherwise leave empty.",
    },
    imageSearchTerm: {
      type: Type.STRING,
      description: "A simple English keyword to search for a representative stock image (e.g., 'smartphone', 'running shoes').",
    }
  },
  required: ["title", "description", "category", "imageSearchTerm"],
};

export const enrichProductData = async (url: string) => {
  try {
    const prompt = `Analyze this affiliate link or product URL and generate marketing details for a dropshipping store: ${url}. 
    Since you cannot browse the live web, infer the product details based on the URL structure or potential product ID. 
    If the URL is generic, make a best guess based on typical items sold on Amazon/Mercado Livre.`;

    // Updated to gemini-3-flash-preview as per the task type (Basic Text)
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: productSchema,
      },
    });

    // Access .text property directly (not a method) as per guidelines
    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error enriching product:", error);
    throw error;
  }
};
