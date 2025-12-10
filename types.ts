export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  sender: string;
  receiver: string;
  jurisdiction: string;
  timestamp: string;
  status: 'Pending' | 'Processed' | 'Flagged';
}

export interface RiskAnalysis {
  transactionId: string;
  totalScore: number; // 0 to 1
  rulesScore: number;
  xgBoostScore: number;
  oumiScore: number;
  factors: string[];
  level: RiskLevel;
}

export interface STRReport {
  id: string;
  transactionId: string;
  narrative: string;
  xmlPayload: string;
  generatedAt: string;
  isFiled: boolean;
}

export interface AppState {
  transactions: Transaction[];
  selectedTxId: string | null;
  riskAnalyses: Record<string, RiskAnalysis>;
  reports: Record<string, STRReport>;
  isProcessing: boolean;
  processingStatus: string;
  kestraStep: number; // 0: Idle, 1: Ingest, 2: Rules, 3: ML, 4: AI, 5: Filing, 6: Done
}