import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import KestraOrchestrator from './components/KestraOrchestrator';
import ClineWidget from './components/ClineWidget';
import ReportView from './components/ReportView';
import { Transaction, AppState, RiskScore, STRReport, RiskLevel } from './types';
import { generateSTRAnalysis } from './services/geminiService';
import { LayoutDashboard, Github, Layers } from 'lucide-react';

const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
      id: 'TX-1001', 
      amount: 50000, 
      currency: 'INR', 
      from_account: 'ACC-8892-IN (Amit Sharma)', 
      to_account: 'ACC-1123-IN (Local Vendors)', 
      receiver_country: 'India', 
      type: 'NEFT',
      location: 'Delhi Branch',
      timestamp: new Date().toISOString(), 
      status: 'Processed' 
  },
  { 
      id: 'TX-1002', 
      amount: 120000, 
      currency: 'INR', 
      from_account: 'ACC-4432-US (Tech Corp)', 
      to_account: 'ACC-9988-US (Cloud Services)', 
      receiver_country: 'USA', 
      type: 'WIRE',
      location: 'Bangalore Branch',
      timestamp: new Date().toISOString(), 
      status: 'Processed' 
  },
];

function App() {
  const [state, setState] = useState<AppState>({
    transactions: INITIAL_TRANSACTIONS,
    selectedTxId: null,
    riskScores: {},
    reports: {},
    isProcessing: false,
    processingStatus: '',
    kestraStep: 0,
  });

  // Helper to run risk logic without UI delays (for bulk operations or re-use)
  const runRiskPipeline = async (txData: Omit<Transaction, 'id' | 'status' | 'timestamp'>, existingTxs: Transaction[]) => {
      // 1. Prepare Transaction
      const newTxId = `TX-${1000 + existingTxs.length + 1}`;
      const newTx: Transaction = {
          ...txData,
          id: newTxId,
          timestamp: new Date().toISOString(),
          status: 'Pending'
      };

      // 2. Risk Logic (Same rules as handleIngest)
      // Logic: If Seychelles/BVI -> High Risk
      const isHighRiskJurisdiction = ['Seychelles', 'BVI', 'Cayman'].includes(newTx.receiver_country);
      const rulesScore = isHighRiskJurisdiction ? 95 : 10;
      
      const senderTxCount = existingTxs.filter(t => t.from_account === newTx.from_account).length + 1;
      
      let velocityScore = 10;
      if (senderTxCount >= 5) {
          velocityScore = 95; 
      } else if (senderTxCount >= 3) {
          velocityScore = 80;
      } else if (senderTxCount === 2) {
          velocityScore = 40;
      }

      const isHighVelocity = velocityScore >= 80;
      const xgBoostScore = (isHighRiskJurisdiction || isHighVelocity) ? 92 : 15;
      
      const isHighRisk = isHighRiskJurisdiction || isHighVelocity;

      let aiResult = { narrative: "Bulk processed transaction.", xml: `<Transaction id="${newTxId}" />` };
      
      // In bulk mode, we might skip actual AI call for speed, or call it for flagged items.
      // For this implementation, we'll try to generate it for flagged items but gracefully fallback.
      if (isHighRisk) {
          try {
             aiResult = await generateSTRAnalysis(newTx, senderTxCount);
          } catch (e) { console.warn("AI Gen failed in bulk", e); }
      }
      
      const oumiScore = isHighRisk ? 98 : 5;
      const totalScore = Math.round((rulesScore * 0.5) + (velocityScore * 0.3) + (xgBoostScore * 0.1) + (oumiScore * 0.1));

      const reasons = [];
      if (isHighRiskJurisdiction) reasons.push('High Risk Jurisdiction (RBI List)');
      if (isHighVelocity) reasons.push(`High Velocity Alert (${senderTxCount} recent txns)`);
      if (newTx.amount > 1000000) reasons.push('High Value Transaction (> 10L)');

      const riskScore: RiskScore = {
          transaction_id: newTx.id,
          score: totalScore,
          risk_level: totalScore > 70 ? RiskLevel.CRITICAL : RiskLevel.LOW,
          explanation: "Auto-generated risk assessment based on schema rules.",
          reasons: reasons,
          velocity_count: senderTxCount,
          breakdown: {
              rules: rulesScore,
              velocity: velocityScore,
              xgboost: xgBoostScore,
              oumi: oumiScore
          }
      };

      const strReport: STRReport = {
          id: `STR-${newTx.id}`,
          transaction_id: newTx.id,
          narrative: aiResult.narrative,
          xmlPayload: aiResult.xml,
          generatedAt: new Date().toISOString(),
          isFiled: isHighRisk
      };

      return { newTx: { ...newTx, status: isHighRisk ? 'Flagged' : 'Processed' } as Transaction, riskScore, strReport };
  };

  const handleBulkIngest = async (txsData: Omit<Transaction, 'id' | 'status' | 'timestamp'>[]) => {
      setState(prev => ({ 
          ...prev, 
          isProcessing: true,
          processingStatus: `Bulk Ingesting ${txsData.length} transactions via FastAPI...`,
          kestraStep: 1 
      }));

      // Simulate slight delay for bulk ingestion start
      await new Promise(r => setTimeout(r, 1000));
      
      // Process all transactions sequentially to maintain state/ID consistency
      let currentTxs = [...state.transactions];
      const newRiskScores: Record<string, RiskScore> = {};
      const newReports: Record<string, STRReport> = {};

      for (const txData of txsData) {
          const result = await runRiskPipeline(txData, currentTxs);
          currentTxs.push(result.newTx);
          newRiskScores[result.newTx.id] = result.riskScore;
          newReports[result.newTx.id] = result.strReport;
      }

      // Update State in one go
      setState(prev => ({
          ...prev,
          transactions: currentTxs,
          riskScores: { ...prev.riskScores, ...newRiskScores },
          reports: { ...prev.reports, ...newReports },
          isProcessing: false,
          processingStatus: '',
          kestraStep: 6 // Jump to complete
      }));
  };

  const handleIngest = async (txData: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => {
    // 1. Ingest
    const newTx: Transaction = {
      ...txData,
      id: `TX-${1000 + state.transactions.length + 1}`,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };

    setState(prev => ({ 
        ...prev, 
        isProcessing: true,
        processingStatus: 'Ingesting via FastAPI...',
        kestraStep: 1, 
        transactions: [...prev.transactions, newTx] 
    }));

    // Step 2: Rules Engine
    await new Promise(r => setTimeout(r, 1500));
    setState(prev => ({ ...prev, kestraStep: 2, processingStatus: 'Running RBI Rules Engine & Velocity Checks...' }));

    // Step 3: ML Scoring
    await new Promise(r => setTimeout(r, 1500));
    setState(prev => ({ ...prev, kestraStep: 3, processingStatus: 'Calculating XGBoost Risk Score...' }));
    
    // Logic: If Seychelles/BVI -> High Risk
    const isHighRiskJurisdiction = ['Seychelles', 'BVI', 'Cayman'].includes(newTx.receiver_country);
    const rulesScore = isHighRiskJurisdiction ? 95 : 10; // 0-100
    
    // -------------------------------------------------------------------------
    // VELOCITY FEATURE IMPLEMENTATION
    // -------------------------------------------------------------------------
    // Calculate Velocity: Count existing transactions from this sender in the current session
    const senderTxCount = state.transactions.filter(t => t.from_account === newTx.from_account).length + 1;
    
    // Assign Velocity Risk Score based on frequency thresholds
    let velocityScore = 10; // Default Low
    if (senderTxCount >= 5) {
        velocityScore = 95; // Critical: High frequency/spam behavior
    } else if (senderTxCount >= 3) {
        velocityScore = 80; // High: Unusual frequency
    } else if (senderTxCount === 2) {
        velocityScore = 40; // Medium: Recurring
    }

    // Determine if velocity contributes to high risk
    const isHighVelocity = velocityScore >= 80;

    // ML Score Simulation
    const xgBoostScore = (isHighRiskJurisdiction || isHighVelocity) ? 92 : 15;
    
    // Step 4: Oumi/Gemini AI
    await new Promise(r => setTimeout(r, 1000));
    setState(prev => ({ ...prev, kestraStep: 4, processingStatus: 'Generating Oumi Narrative...' }));
    
    let aiResult = { narrative: "Standard commercial transaction.", xml: "<Transaction>...</Transaction>" };
    
    // Trigger High Risk Flag if either Jurisdiction or Velocity is critical
    const isHighRisk = isHighRiskJurisdiction || isHighVelocity;

    // Only call AI if medium/high risk to save tokens, or if explicit demo request
    if (isHighRisk) {
        aiResult = await generateSTRAnalysis(newTx, senderTxCount);
    }

    const oumiScore = isHighRisk ? 98 : 5;
    
    // Weighted Score Calculation
    // Rules (50%) + Velocity (30%) + ML (10%) + Oumi (10%)
    const totalScore = Math.round((rulesScore * 0.5) + (velocityScore * 0.3) + (xgBoostScore * 0.1) + (oumiScore * 0.1));

    const reasons = [];
    if (isHighRiskJurisdiction) reasons.push('High Risk Jurisdiction (RBI List)');
    if (isHighVelocity) reasons.push(`High Velocity Alert (${senderTxCount} recent txns)`);
    if (newTx.amount > 1000000) reasons.push('High Value Transaction (> 10L)');

    const riskScore: RiskScore = {
        transaction_id: newTx.id,
        score: totalScore,
        risk_level: totalScore > 70 ? RiskLevel.CRITICAL : RiskLevel.LOW,
        explanation: "Auto-generated risk assessment based on schema rules.",
        reasons: reasons,
        velocity_count: senderTxCount,
        breakdown: {
            rules: rulesScore,
            velocity: velocityScore,
            xgboost: xgBoostScore,
            oumi: oumiScore
        }
    };

    const strReport: STRReport = {
        id: `STR-${newTx.id}`,
        transaction_id: newTx.id,
        narrative: aiResult.narrative,
        xmlPayload: aiResult.xml,
        generatedAt: new Date().toISOString(),
        isFiled: isHighRisk
    };

    // Step 5: Filing (Simulate API Call to FIU)
    try {
        setState(prev => ({ ...prev, kestraStep: 5, processingStatus: 'Auto-filing STR with FIU-IND...' }));
        await new Promise(r => setTimeout(r, 1500));
        
        // Finalize: Step 6 (Done)
        setState(prev => {
            const updatedTxs = prev.transactions.map(t => 
                t.id === newTx.id ? { ...t, status: isHighRisk ? 'Flagged' : 'Processed' } as Transaction : t
            );
            return {
                ...prev,
                transactions: updatedTxs,
                riskScores: { ...prev.riskScores, [newTx.id]: riskScore },
                reports: { ...prev.reports, [newTx.id]: strReport },
                isProcessing: false,
                processingStatus: '',
                kestraStep: 6 // Workflow Complete
            };
        });
    } catch (error) {
        console.error("Workflow failed", error);
        setState(prev => ({ ...prev, isProcessing: false, processingStatus: 'Error', kestraStep: 0 }));
    }
  };

  const selectedTx = state.selectedTxId ? state.transactions.find(t => t.id === state.selectedTxId) : null;
  const hasHighRisk = state.transactions.some(t => t.status === 'Flagged');
  const lastHighRiskTx = [...state.transactions].reverse().find(t => t.status === 'Flagged');

  return (
    <div className="min-h-screen bg-primary text-slate-200 pb-20">
      {/* Header */}
      <header className="bg-secondary/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent/20 p-2 rounded-lg">
               <Layers className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">FinCompliance-AI</h1>
              <p className="text-[10px] text-slate-400 font-mono">POWERED BY CLINE • KESTRA • OUMI • VERCEL</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                <Github size={18} />
                <span>Repo</span>
             </a>
             <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">System Online</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Kestra Orchestration Visualization */}
        <KestraOrchestrator currentStep={state.kestraStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Dashboard Area */}
          <div className="lg:col-span-2 space-y-8">
             <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-white">Live Monitoring Dashboard</h2>
             </div>
             <Dashboard 
                transactions={state.transactions} 
                onSelectTx={(id) => setState(prev => ({ ...prev, selectedTxId: id }))} 
             />
          </div>

          {/* Ingestion Panel */}
          <div className="lg:col-span-1">
             <TransactionForm 
                onSubmit={handleIngest} 
                onBulkSubmit={handleBulkIngest}
                isLoading={state.isProcessing} 
                processingStatus={state.processingStatus}
             />
             
             {/* Sponsor Badges */}
             <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-secondary p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 font-bold mb-1">DEPLOYMENT</span>
                    <span className="text-white font-bold flex items-center gap-1">▲ Vercel</span>
                </div>
                <div className="bg-secondary p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 font-bold mb-1">CODE REVIEW</span>
                    <span className="text-orange-400 font-bold flex items-center gap-1">🐰 CodeRabbit</span>
                </div>
             </div>
          </div>

        </div>
      </main>

      {/* Overlays */}
      {selectedTx && state.riskScores[selectedTx.id] && state.reports[selectedTx.id] && (
        <ReportView 
          tx={selectedTx} 
          risk={state.riskScores[selectedTx.id]}
          report={state.reports[selectedTx.id]}
          onClose={() => setState(prev => ({ ...prev, selectedTxId: null }))}
        />
      )}

      {/* Floating Agents */}
      <ClineWidget hasHighRisk={hasHighRisk} lastTxId={lastHighRiskTx?.id || null} />
    </div>
  );
}

export default App;