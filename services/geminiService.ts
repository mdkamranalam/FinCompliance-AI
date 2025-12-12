import { GoogleGenerativeAI } from "@google/generative-ai";
import { Transaction } from "../types";

const ai = new GoogleGenerativeAI({ apiKey: process.env.API_KEY });

// Fallback data for when API quota is exceeded (429) or fails
const FALLBACK_LIVE_TRANSACTIONS: Omit<
  Transaction,
  "id" | "status" | "timestamp"
>[] = [
  {
    amount: 875000,
    currency: "INR",
    from_account: "ACC-MOCK-99 (Crypto Exchange)",
    to_account: "ACC-OFF-77 (Shell Entity Ltd)",
    receiver_country: "Cayman Islands",
    type: "SWIFT",
    location: "Mumbai Digital Branch",
  },
  {
    amount: 12500,
    currency: "USD",
    from_account: "ACC-MOCK-55 (Global Tech)",
    to_account: "ACC-SG-22 (Cloud Services)",
    receiver_country: "Singapore",
    type: "WIRE",
    location: "Bangalore Tech Park",
  },
  {
    amount: 45000,
    currency: "INR",
    from_account: "ACC-MOCK-11 (Retail User)",
    to_account: "ACC-IN-33 (Local Utility)",
    receiver_country: "India",
    type: "NEFT",
    location: "Delhi South",
  },
];

// Helper to robustly parse JSON from LLM response
const parseGeminiJson = (text: string) => {
  if (!text) return null;

  // Try to find a JSON array or object pattern within the text
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const cleanText = match ? match[0] : text.trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON. Raw text:", text);
    try {
      const fallbackText = text.replace(/```(?:json)?|```/g, "").trim();
      return JSON.parse(fallbackText);
    } catch (e2) {
      throw e;
    }
  }
};

export const generateSTRAnalysis = async (
  tx: Transaction,
  velocityCount: number = 1
): Promise<{ narrative: string; xml: string }> => {
  const model = "gemini-2.5-flash";

  const prompt = `
    You are Oumi, an AI specialized in generating Financial Intelligence Unit (FIU-IND) compliant Suspicious Transaction Reports (STR) for Indian banking compliance.
    
    Task: Generate a suspicious transaction narrative and a mock XML snippet for the following transaction.
    
    Transaction Details (Schema: transactions table):
    - ID: ${tx.id}
    - Amount: ${tx.amount} ${tx.currency}
    - From Account: ${tx.from_account}
    - To Account: ${tx.to_account}
    - Receiver Country: ${tx.receiver_country}
    - Type: ${tx.type}
    - Location: ${tx.location}
    - Date: ${new Date().toISOString()}
    - Account Velocity: ${velocityCount} transaction(s) from this account in the current session.

    Context & Red Flags to Consider:
    - High-Value Transfers: Transactions > 10 Lakh INR are often scrutinized.
    - Jurisdiction Risk: Transfers to tax havens or high-risk countries (e.g., ${
      tx.receiver_country
    }) require enhanced due diligence.
    - Velocity: Rapid succession of transfers (${velocityCount} detected) indicates potential layering or structuring.
    - Transaction Type Analysis: 
      - SWIFT/WIRE: Check for cross-border anomalies or inconsistencies with stated business.
      - NEFT/RTGS: Check for domestic layering or pass-through accounts.
      - CASH: High risk of placement stage money laundering.

    Requirements:
    1. Narrative: Written in formal Indian English suitable for regulatory submission.
       - FOR HIGH RISK:
         Structure:
         - Introduction: Source of alert (e.g., Rule-based engine, Velocity check).
         - Analysis: Details of the transaction, counterparties, and fund flow analysis.
         - Suspicion Indicators: Explicitly link the observed behavior to money laundering typologies.
           - TYPOLOGY: STRUCTURING / SMURFING
             If multiple small transactions are observed or velocity is high:
             "The pattern of ${velocityCount} transactions in rapid succession suggests **structuring** (smurfing), likely intended to evade regulatory reporting thresholds."
           - TYPOLOGY: ROUND-TRIPPING
             If funds move to tax havens (like ${
               tx.receiver_country
             }) or offshore entities:
             "The transfer to a high-risk jurisdiction (${
               tx.receiver_country
             }) with no apparent underlying trade rationale suggests **round-tripping** or layering, aimed at moving capital out of the country and returning it as foreign investment."
           - TYPOLOGY: LAYERING
             If funds are moved through complex paths or shell-like entities:
             "The immediate movement of funds to an unrelated entity in ${
               tx.receiver_country
             } suggests **layering**, attempting to distance illicit funds from their source."
         - Conclusion: Strong recommendation to file STR based on the identified risks.
       - FOR LOW RISK (Normal Jurisdiction, Low Velocity, Low Amount):
         Structure:
         - Summary: State that the transaction appears consistent with standard business/personal practices.
         - Assessment: Note the absence of high-risk indicators.
         - Conclusion: Recommend "No Suspicion Filed" or "Routine Filing" if applicable, keeping the text brief (under 100 words).
       Keep the tone professional and concise.
    2. XML: A valid XML snippet following the FIU-IND FINnet report format. 
       Structure should roughly follow: <Batch><Report><Transaction>...</Transaction></Report></Batch>.
       Include fields for AccountNumber, Amount, Currency, and SuspicionGrounds.
    3. Output must be strictly valid JSON.
    
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
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return parseGeminiJson(text);
  } catch (error) {
    console.warn(
      "Gemini API Error (likely quota). Using fallback narrative.",
      error
    );
    return {
      narrative: `NOTICE: Automated narrative generation unavailable (API Quota/Error). 
      
      Manual Review Required. 
      Risk Indicators detected by Rules Engine:
      1. Jurisdiction Check: ${tx.receiver_country} 
      2. Transaction Type: ${tx.type}
      3. Velocity Count: ${velocityCount}`,
      xml: `<Transaction><Status>Manual_Review</Status><Reason>API_Quota_Exceeded</Reason><ID>${tx.id}</ID></Transaction>`,
    };
  }
};

export const fetchRealTimeTransactions = async (): Promise<
  Omit<Transaction, "id" | "status" | "timestamp">[]
> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Act as a banking API simulator. Generate 3 realistic financial transaction records for a compliance demo.
    
    Requirements:
    1. Return ONLY a raw JSON array. Do not include markdown formatting.
    2. Schema per object:
       - amount (number)
       - currency (string, e.g., "INR", "USD")
       - from_account (string, e.g., "ACC-xxxx-IN (Name)")
       - to_account (string)
       - receiver_country (string)
       - type (string, e.g., "SWIFT", "NEFT")
       - location (string)
    3. Scenarios:
       - Transaction 1: Normal domestic transfer (India).
       - Transaction 2: High value international transfer to a high-risk jurisdiction (e.g., Seychelles, Cayman Islands, or BVI).
       - Transaction 3: Medium risk transfer or recurring payment.
    4. Ensure all text values are in English and valid JSON strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const parsed = parseGeminiJson(text);
    return parsed || FALLBACK_LIVE_TRANSACTIONS;
  } catch (error) {
    console.warn(
      "Gemini API Error fetching transactions (likely quota). Using Mock Data.",
      error
    );
    return FALLBACK_LIVE_TRANSACTIONS;
  }
};
