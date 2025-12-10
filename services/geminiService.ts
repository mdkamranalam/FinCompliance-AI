import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSTRAnalysis = async (tx: Transaction): Promise<{ narrative: string; xml: string }> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    You are Oumi, an AI specialized in generating Financial Intelligence Unit (FIU-IND) compliant Suspicious Transaction Reports (STR) for Indian banking compliance.
    
    Task: Generate a suspicious transaction narrative and a mock XML snippet for the following transaction.
    
    Transaction Details:
    - ID: ${tx.id}
    - Amount: ${tx.amount} ${tx.currency}
    - Sender: ${tx.sender}
    - Receiver: ${tx.receiver}
    - Jurisdiction: ${tx.jurisdiction}
    - Date: ${new Date().toISOString()}

    Requirements:
    1. Narrative: Written in formal Indian English, highlighting the risk factors (e.g., high-risk jurisdiction, round-tripping suspicion). Keep it under 150 words.
    2. XML: A small valid XML snippet following the FIU-IND report format (just the main transaction node).
    
    Output Format (JSON):
    {
      "narrative": "...",
      "xml": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating STR:", error);
    return {
      narrative: "Error generating narrative via Oumi/Gemini. Please check API connection.",
      xml: "<Error>Could not generate XML</Error>"
    };
  }
};