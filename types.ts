export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

// Aligned with 'transactions' table schema
export interface Transaction {
  id: string; // Using string to maintain "TX-1001" format for demo, corresponds to 'id' (int) in DB
  amount: number;
  currency: string; // UI helper, assumed part of amount or separate
  from_account: string; // Schema: from_account
  to_account: string;   // Schema: to_account
  type: string;         // Schema: type (e.g., WIRE, NEFT)
  location: string;     // Schema: location
  receiver_country: string; // Schema: receiver_country
  timestamp: string;
  status: 'Pending' | 'Processed' | 'Flagged'; // UI State
}

// Aligned with 'risk_scores' table schema
export interface RiskScore {
  transaction_id: string;
  score: number; // Schema: score (int 0-100)
  risk_level: RiskLevel; // Schema: risk_level
  explanation: string; // Schema: explanation
  reasons: string[]; // Schema: reasons
  
  // UI Breakdown (Transient state, not necessarily in risk_scores table but needed for visualization)
  breakdown: {
    rules: number;
    velocity: number;
    xgboost: number;
    oumi: number;
  };
}

// Aligned with 'str_reports' table schema
export interface STRReport {
  id: string;
  transaction_id: string;
  narrative: string; // Schema: grounds_of_suspicion
  xmlPayload: string; // Helper for FIU XML
  generatedAt: string;
  isFiled: boolean; // Schema: status (string)
}

export interface AppState {
  transactions: Transaction[];
  selectedTxId: string | null;
  riskScores: Record<string, RiskScore>;
  reports: Record<string, STRReport>;
  isProcessing: boolean;
  processingStatus: string;
  kestraStep: number;
}