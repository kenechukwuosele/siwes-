
import { GoogleGenAI, Type } from "@google/genai";

// Fixed: Use process.env.API_KEY directly as specified in the guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLogEntry = async (description: string) => {
  // Removed redundant process.env.API_KEY check as per guidelines (key availability is assumed)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a professional engineering/academic supervisor, analyze this SIWES logbook entry and suggest improvements or highlight technical keywords. 
      Entry: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING, description: "A brief constructive advice to improve the entry." },
            qualityScore: { type: Type.NUMBER, description: "A score from 1-10 on technical detail." },
            technicalKeywords: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Key technical terms found or suggested." 
            }
          },
          required: ["feedback", "qualityScore", "technicalKeywords"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const summarizeWeeklyProgress = async (logs: string[]) => {
    // Removed redundant process.env.API_KEY check as per guidelines
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following daily industrial training logs into a professional weekly progress report (max 3 sentences):
        ${logs.join('\n--- ')}`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Summary Error:", error);
      return "Failed to generate summary.";
    }
};
