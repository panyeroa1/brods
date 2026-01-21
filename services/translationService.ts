
import { GoogleGenAI } from "@google/genai";

export const translateText = async (
  text: string, 
  targetLang: string, 
  sourceLang: string,
  forceOffline: boolean = false
): Promise<{ text: string; isOffline: boolean }> => {
  if (!text.trim()) return { text: "", isOffline: false };

  const isActuallyOffline = forceOffline || !navigator.onLine;
  if (isActuallyOffline) {
    return { text: `[Offline] ${text}`, isOffline: true };
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate to ${targetLang} (source is roughly ${sourceLang}): "${text}"`,
      config: {
        temperature: 0.1,
        systemInstruction: "You are a specialized real-time translation module. Output ONLY the translated text accurately. Maintain the tone and nuances. No quotes, no preamble.",
      }
    });

    return { 
      text: response.text?.trim() || text, 
      isOffline: false 
    };
  } catch (error) {
    console.error("Translation Error:", error);
    return { text, isOffline: true };
  }
};
