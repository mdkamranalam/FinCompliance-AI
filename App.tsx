import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import KestraOrchestrator from './components/KestraOrchestrator';
import ClineWidget from './components/ClineWidget';
import ReportView from './components/ReportView';
import { Transaction, AppState, RiskScore, STRReport, RiskLevel, RiskConfig } from './types';
import { generateSTRAnalysis, fetchRealTimeTransactions } from './services/geminiService';
import { LayoutDashboard, Github, Layers } from 'lucide-react';

const INITIAL_TRANSACTIONS: Transaction[] = [
  // { 
  //     id: 'TX-1001', 
  //     amount: 50000, 
  //     currency: 'INR', 
  //     from_account: 'ACC-8892-IN (Amit Sharma)', 
  //     to_account: 'ACC-1123-IN (Local Vendors)', 
  //     receiver_country: 'India', 
  //     type: 'NEFT', 
  //     location: 'Delhi Branch',
  //     timestamp: new Date().toISOString(), 
  //     status: 'Processed' 
  // },
  // { 
  //     id: 'TX-1002', 
  //     amount: 120000, 
  //     currency: 'INR', 
  //     from_account: 'ACC-4432-US (Tech Corp)', 
  //     to_account: 'ACC-9988-US (Cloud Services)', 
  //     receiver_country: 'USA', 
  //     type: 'WIRE', 
  //     location: 'Bangalore Branch',
  //     timestamp: new Date().toISOString(), 
  //     status: 'Processed' 
  // },
];

const INITIAL_RISK_SCORES: Record<string, RiskScore> = {
  'TX-1001': {
    transaction_id: 'TX-1001',
    score: 12,
    risk_level: RiskLevel.LOW,
    explanation: 'Standard domestic transfer',
    reasons: [],
    breakdown: { rules: 10, velocity: 10, xgboost: 10, oumi: 5 }
  },
  'TX-1002': {
    transaction_id: 'TX-1002',
    score: 25,
    risk_level: RiskLevel.LOW,
    explanation: 'Verified international vendor payment',
    reasons: [],
    breakdown: { rules: 15, velocity: 10, xgboost: 20, oumi: 5 }
  }
};

const INITIAL_REPORTS: Record<string, STRReport> = {
    'TX-1001': {
        id: 'STR-TX-1001',
        transaction_id: 'TX-1001',
        narrative: 'No suspicious activity detected. Routine domestic transaction.',
        xmlPayload: '<Transaction><Status>Clean</Status></Transaction>',
        generatedAt: new Date().toISOString(),
        isFiled: false
    },
    'TX-1002': {
        id: 'STR-TX-1002',
        transaction_id: 'TX-1002',
        narrative: 'No suspicious activity detected. Verified commercial entity.',
        xmlPayload: '<Transaction><Status>Clean</Status></Transaction>',
        generatedAt: new Date().toISOString(),
        isFiled: false
    }
};

const DEFAULT_RISK_CONFIG: RiskConfig = {
  highRiskJurisdictions: ['Seychelles', 'BVI', 'Cayman', 'Mauritius', 'High Risk'],
  jurisdictionScoreHigh: 95,
  jurisdictionScoreLow: 10,
  velocityThresholds: {
    critical: { count: 5, score: 95 },
    high: { count: 3, score: 80 },
    medium: { count: 2, score: 40 }
  },
  linkedSeriesBoost: 20,
  linkedSeriesMinScore: 75,
  highVelocityThreshold: 80,
  highRiskThreshold: 60,
  weights: {
    rules: 0.4,
    velocity: 0.3,
    xgboost: 0.15,
    oumi: 0.15
  },
  riskLevelThresholds: {
    critical: 80,
    high: 60,
    medium: 40
  }
};

function App() {
  const [state, setState] = useState<AppState>({
    transactions: INITIAL_TRANSACTIONS,
    selectedTxId: null,
    riskScores: INITIAL_RISK_SCORES,
    reports: INITIAL_REPORTS,
    isProcessing: false,
    processingStatus: '',
    kestraStep: 0,
    riskConfig: DEFAULT_RISK_CONFIG
  });

  // Helper to determine Risk Level based on score
  const determineRiskLevel = (score: number): RiskLevel => {
      const { riskLevelThresholds } = state.riskConfig;
      if (score >= riskLevelThresholds.critical) return RiskLevel.CRITICAL;
      if (score >= riskLevelThresholds.high) return RiskLevel.HIGH;
      if (score >= riskLevelThresholds.medium) return RiskLevel.MEDIUM;
      return RiskLevel.LOW;
  };

  // Helper to run risk logic efficiently
  const runRiskPipeline = async (
      txData: Omit<Transaction, 'id' | 'status' | 'timestamp'>, 
      existingTxs: Transaction[],
      velocityOverride?: number
  ) => {
      const config = state.riskConfig;

      // 1. Prepare Transaction
      const newTxId = `TX-${1000 + existingTxs.length + 1}`;
      const newTx: Transaction = {
          ...txData,
          id: newTxId,
          timestamp: new Date().toISOString(),
          status: 'Pending'
      };

      // 2. Risk Logic
      // Robust check for High Risk Jurisdictions
      const isHighRiskJurisdiction = config.highRiskJurisdictions.some(k => newTx.receiver_country.includes(k));
      
      // Check for Structuring (Amounts just below reporting thresholds, e.g., 9-10 Lakh INR)
      const isStructuring = newTx.amount >= 900000 && newTx.amount < 1000000;
      
      let rulesScore = 10;
      if (isHighRiskJurisdiction) {
          rulesScore = config.jurisdictionScoreHigh;
      } else if (isStructuring) {
          rulesScore = 85; // High rule score for structuring attempts
      } else {
          rulesScore = config.jurisdictionScoreLow;
      }
      
      // Velocity Calculation Logic
      
      // A. General Sender Velocity (Session count)
      const senderTxCount = velocityOverride ?? (existingTxs.filter(t => t.from_account === newTx.from_account).length + 1);
      
      // B. Specific Beneficiary Velocity (Same Sender -> Same Receiver count)
      // Detects patterns like splitting payments to the same entity
      const sameReceiverCount = existingTxs.filter(t => t.from_account === newTx.from_account && t.to_account === newTx.to_account).length + 1;

      // C. Sequential/Burst Check
      // Checks if the immediate previous transaction was from the same sender
      const lastTx = existingTxs.length > 0 ? existingTxs[existingTxs.length - 1] : null;
      const isLinkedSeries = lastTx && lastTx.from_account === newTx.from_account;
      
      // "Burst" mode: Immediate repeat to the exact same receiver
      const isBurst = isLinkedSeries && lastTx?.to_account === newTx.to_account;

      let velocityScore = 10; // Default Low
      
      // Base Score from Frequency
      if (senderTxCount >= config.velocityThresholds.critical.count) {
          velocityScore = config.velocityThresholds.critical.score; 
      } else if (senderTxCount >= config.velocityThresholds.high.count) {
          velocityScore = config.velocityThresholds.high.score; 
      } else if (senderTxCount >= config.velocityThresholds.medium.count) {
          velocityScore = config.velocityThresholds.medium.score; 
      }
      
      // Modifiers for Targeted Velocity
      if (sameReceiverCount > 1) {
          velocityScore += (sameReceiverCount * 5); // Add penalty for repeating target
      }
      
      if (isBurst) {
          velocityScore += 25; // High penalty for rapid sequential transfers to same target (Burst)
      } else if (isLinkedSeries) {
          velocityScore += 10; // Moderate penalty for sequential usage (different target)
      }

      // Cap at 100
      velocityScore = Math.min(100, velocityScore);
      const isHighVelocity = velocityScore >= config.highVelocityThreshold;
      
      // --- Improved Scoring Simulation for Bulk Data ---
      const isRoundAmount = newTx.amount % 10000 === 0 && newTx.amount > 50000;
      const isHighValue = newTx.amount > 1000000; // > 10L INR
      
      // Expanded keyword list for shell/offshore entities
      const shellKeywords = ['offshore', 'shell', 'holdings', 'trust', 'consulting', 'global', 'investments', 'capital', 'partners', 'fund'];
      const hasShellKeyword = shellKeywords.some(kw => newTx.to_account.toLowerCase().includes(kw));

      // XGBoost (Anomaly Detection Model) Simulation
      // Factors: Unexpected high value, round numbers, velocity spikes, jurisdiction
      let calculatedXgBoost = 15; // Baseline
      if (isHighValue) calculatedXgBoost += 20; 
      if (isRoundAmount) calculatedXgBoost += 15;
      if (isHighVelocity) calculatedXgBoost += 35; // Correlation with velocity
      if (isHighRiskJurisdiction) calculatedXgBoost += 10;
      if (isLinkedSeries) calculatedXgBoost += 15;
      const xgBoostScore = Math.min(99, calculatedXgBoost); // Cap at 99
      
      // Oumi (GenAI Contextual Model) Simulation
      // Factors: Narrative risk (Country), Structuring patterns (Velocity), Name screening
      let calculatedOumi = 10; // Baseline
      if (isHighRiskJurisdiction) calculatedOumi += 40; // High confidence on jurisdiction
      if (hasShellKeyword) calculatedOumi += 30; // Contextual name risk
      if (isStructuring) calculatedOumi += 40; // Intent detection
      if (isHighVelocity && isRoundAmount) calculatedOumi += 25; // Machine-like behavior pattern
      if (newTx.type === 'CASH' || newTx.type === 'CRYPTO') calculatedOumi += 20; // Channel risk

      const oumiScore = Math.min(99, calculatedOumi); // Cap at 99

      // Weighted Score Calculation
      const totalScore = Math.round(
          (rulesScore * config.weights.rules) + 
          (velocityScore * config.weights.velocity) + 
          (xgBoostScore * config.weights.xgboost) + 
          (oumiScore * config.weights.oumi)
      );
      
      // Determine Levels
      const riskLevel = determineRiskLevel(totalScore);
      const isHighRisk = totalScore >= config.highRiskThreshold; // Flag High and Critical

      // Enhanced Narrative Generation
      let narrative = "";
      if (isHighRisk) {
          const riskFactors = [];
          if (isHighRiskJurisdiction) riskFactors.push(`destination jurisdiction (${newTx.receiver_country})`);
          if (isHighVelocity) riskFactors.push(`transaction velocity (${senderTxCount} in session)`);
          if (isLinkedSeries) riskFactors.push("linked transaction pattern");
          if (newTx.amount > 1000000) riskFactors.push("high value amount (>10L)");
          if (isStructuring) riskFactors.push("potential structuring (amount just below threshold)");
          if (hasShellKeyword) riskFactors.push("high risk counterparty keyword");

          let typology = "Layering / Round-Tripping";
          if (isStructuring || (isHighVelocity && newTx.amount < 50000)) typology = "Structuring (Smurfing)";
          if (hasShellKeyword && isHighRiskJurisdiction) typology = "Shell Company Operations";

          narrative = `**Automated Risk Assessment (Batch Mode)**\n\n` +
                      `**Analysis**:\n` +
                      `This transaction (ID: ${newTxId}) was flagged by the Kestra Rules Engine with a risk score of ${totalScore}/100 (${riskLevel}). ` +
                      `The primary risk drivers identified are: ${riskFactors.join(", ")}.\n\n` +
                      `**Typology Indicators**:\n` +
                      `The observed activity matches patterns associated with **${typology}**. ` +
                      `${isStructuring ? `The amount (${newTx.amount}) is just below the mandatory reporting threshold of 10 Lakhs, strongly indicating an attempt to evade detection.` : ''} ` +
                      `${hasShellKeyword ? `The beneficiary name contains keywords ('${shellKeywords.find(k => newTx.to_account.toLowerCase().includes(k))}') often associated with shell entities.` : ''} ` +
                      `${isHighRiskJurisdiction ? `Funds are moving to a high-risk jurisdiction (${newTx.receiver_country}) which requires enhanced due diligence.` : ''} ` +
                      `${isHighVelocity ? `Rapid succession of transfers from ${newTx.from_account} suggests an attempt to evade velocity limits.` : ''}\n\n` +
                      `**Conclusion**:\n` +
                      `Due to the convergence of these risk factors, this transaction is marked as suspicious and an STR has been auto-generated for FIU-IND filing.`;
      } else {
          narrative = `**Routine Transaction Report**\n\n` +
                      `Analysis confirms this transaction matches standard commercial profiles. ` +
                      `Jurisdiction (${newTx.receiver_country}) and velocity (${senderTxCount}) are within acceptable risk appetites. ` +
                      `No AML red flags detected. Status: Cleared.`;
      }

      // Enhanced XML Generation for Bulk/Auto-generated reports
      const xmlPayload = `
<Batch>
  <Report>
    <ReportType>STR</ReportType>
    <Transaction>
      <TransactionID>${newTxId}</TransactionID>
      <TransactionDate>${newTx.timestamp}</TransactionDate>
      <TransactionType>${newTx.type}</TransactionType>
      <Amount currency="${newTx.currency}">${newTx.amount}</Amount>
      <Originator>
        <Account>${newTx.from_account}</Account>
        <BranchLocation>${newTx.location}</BranchLocation>
      </Originator>
      <Beneficiary>
        <Account>${newTx.to_account}</Account>
        <Country>${newTx.receiver_country}</Country>
      </Beneficiary>
      <RiskAssessment>
        <Score>${totalScore}</Score>
        <RiskLevel>${riskLevel}</RiskLevel>
        <VelocityCount>${senderTxCount}</VelocityCount>
        <RiskIndicators>
          ${isHighRiskJurisdiction ? '<Indicator>High Risk Jurisdiction</Indicator>' : ''}
          ${isHighVelocity ? '<Indicator>High Velocity</Indicator>' : ''}
          ${isStructuring ? '<Indicator>Structuring / Smurfing</Indicator>' : ''}
          ${hasShellKeyword ? '<Indicator>Shell Company Suspected</Indicator>' : ''}
        </RiskIndicators>
      </RiskAssessment>
      <SuspicionDetails>
        <Summary>${isHighRisk ? 'Suspicious pattern detected matching money laundering typologies.' : 'Routine transaction.'}</Summary>
      </SuspicionDetails>
    </Transaction>
  </Report>
</Batch>`.trim();

      let aiResult = { 
          narrative: narrative, 
          xml: xmlPayload
      };

      const reasons = [];
      if (isHighRiskJurisdiction) reasons.push(`High Risk Jurisdiction (${newTx.receiver_country})`);
      
      // Improved Velocity Breakdown in Reasons
      if (isHighVelocity) {
         if (senderTxCount >= config.velocityThresholds.critical.count) reasons.push(`Critical Velocity (${senderTxCount} txns)`);
         else reasons.push(`High Velocity Alert (${senderTxCount} txns)`);
      }
      if (sameReceiverCount >= 3) reasons.push(`Repeated Beneficiary (${sameReceiverCount}x to ${newTx.to_account.split(' ')[0]})`);
      if (isBurst) reasons.push('Rapid Burst Transfer Detected');
      
      if (isStructuring) reasons.push('Potential Structuring (<10L INR)');
      if (hasShellKeyword) reasons.push('Shell Company Indicators in Name');
      if (newTx.amount > 1000000) reasons.push('High Value Transaction (> 10L)');

      // Generate a dynamic and detailed explanation
      let explanation = "";
      if (isHighRisk) {
        // Detailed high risk explanation
        const drivers = [];
        if (rulesScore > 50) drivers.push("Rules (Regulatory)");
        if (velocityScore > 50) drivers.push("Velocity (Frequency)");
        if (xgBoostScore > 60) drivers.push("XGBoost (Anomaly)");
        if (oumiScore > 60) drivers.push("Oumi AI (Context)");
        
        explanation = `High Risk flagged (Score: ${totalScore}). Primary drivers: ${drivers.join(", ")}. This transaction deviates significantly from the user's standard profile and matches known ML typologies.`;
      } else if (riskLevel === RiskLevel.MEDIUM) {
         explanation = `Moderate risk (${totalScore}/100) identified due to ${reasons.length > 0 ? reasons[0] : 'unusual activity'}. Requires enhanced monitoring but does not meet automatic filing thresholds.`;
      } else {
         explanation = `Low risk transaction. Cleared by Rules Engine (Score: ${rulesScore}) and ML Model (Score: ${xgBoostScore}). No anomalies detected in velocity or jurisdiction.`;
      }

      const riskScore: RiskScore = {
          transaction_id: newTx.id,
          score: totalScore,
          risk_level: riskLevel,
          explanation: explanation,
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
          processingStatus: `[Kestra] Triggering execution: bulk_csv_ingest (${txsData.length} records)...`,
          kestraStep: 1 
      }));

      // Simulate Kestra startup overhead
      await new Promise(r => setTimeout(r, 1000));

      const BATCH_SIZE = 5;
      let currentTxs = [...state.transactions];
      let processedCount = 0;
      const newRiskScores: Record<string, RiskScore> = {};
      const newReports: Record<string, STRReport> = {};
      
      const senderVelocityMap = new Map<string, number>();
      currentTxs.forEach(tx => {
          senderVelocityMap.set(tx.from_account, (senderVelocityMap.get(tx.from_account) || 0) + 1);
      });

      for (let i = 0; i < txsData.length; i += BATCH_SIZE) {
          const batch = txsData.slice(i, i + BATCH_SIZE);
          const batchNewTxs: Transaction[] = [];

          // Kestra Step 2: Rules Engine
          setState(prev => ({ 
            ...prev, 
            kestraStep: 2, 
            processingStatus: `[Kestra] Task: rules_engine | Batch ${Math.ceil((i + 1) / BATCH_SIZE)} processing...` 
          }));
          await new Promise(r => setTimeout(r, 300));

          for (const txData of batch) {
              const currentCount = senderVelocityMap.get(txData.from_account) || 0;
              const newVelocityCount = currentCount + 1;
              senderVelocityMap.set(txData.from_account, newVelocityCount);

              // Pass accumulated transactions to properly detect linked series and generate correct IDs
              const result = await runRiskPipeline(txData, [...currentTxs, ...batchNewTxs], newVelocityCount);
              
              batchNewTxs.push(result.newTx);
              newRiskScores[result.newTx.id] = result.riskScore;
              newReports[result.newTx.id] = result.strReport;
          }

          // Kestra Step 3 & 4: Scoring & AI (Simulated for batch)
          setState(prev => ({ 
              ...prev, 
              kestraStep: 3, 
              processingStatus: `[Kestra] Task: xgboost_scoring | Scoring ${batch.length} records...` 
          }));
          await new Promise(r => setTimeout(r, 300));

          setState(prev => ({ 
              ...prev, 
              kestraStep: 4, 
              processingStatus: `[Kestra] Task: oumi_narrative_gen | Generating reports...` 
          }));
          await new Promise(r => setTimeout(r, 200));

          currentTxs = [...currentTxs, ...batchNewTxs];
          processedCount += batch.length;

          // Update State with batch results
          setState(prev => ({
              ...prev,
              transactions: currentTxs,
              riskScores: { ...prev.riskScores, ...newRiskScores },
              reports: { ...prev.reports, ...newReports },
              processingStatus: `[Kestra] Progress: ${processedCount}/${txsData.length} records processed.`
          }));
      }

      setState(prev => ({
          ...prev,
          isProcessing: false,
          processingStatus: '[Kestra] Workflow execution: SUCCESS',
          kestraStep: 6 
      }));
  };

  const handleFetchLive = async () => {
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      processingStatus: 'Oumi Agent connecting to External API (SWIFT/NEFT Gateway)...',
      kestraStep: 1 
    }));

    const liveTxs = await fetchRealTimeTransactions();
    
    if (liveTxs.length > 0) {
      await handleBulkIngest(liveTxs);
    } else {
       setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        processingStatus: 'Failed to fetch live data.',
        kestraStep: 0 
      }));
    }
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
    
    // Risk Calculation (Using runRiskPipeline logic within handleIngest context efficiently)
    // Calculate velocity for this specific single ingest
    const senderTxCount = state.transactions.filter(t => t.from_account === newTx.from_account).length + 1;
    
    // Reuse the pipeline function to ensure consistent scoring logic
    const result = await runRiskPipeline(txData, state.transactions, senderTxCount);
    
    // Recalculate component scores for local variables (used for consistency in logic) if needed, 
    // but we can rely on result.riskScore for the actual stored object.
    const riskScore = result.riskScore;
    const strReport = result.strReport;

    // Step 4: Oumi/Gemini AI
    await new Promise(r => setTimeout(r, 1000));
    setState(prev => ({ ...prev, kestraStep: 4, processingStatus: 'Generating Oumi Narrative...' }));
    
    // Default to the enhanced narrative from pipeline
    let aiResult = { narrative: strReport.narrative, xml: strReport.xmlPayload };
    
    const isHighRisk = riskScore.risk_level === RiskLevel.HIGH || riskScore.risk_level === RiskLevel.CRITICAL;

    // For single ingest, we can afford to hit the real API for high risk cases to get even better uniqueness
    if (isHighRisk) {
        aiResult = await generateSTRAnalysis(newTx, senderTxCount);
        // Update report with AI result if fetched
        strReport.narrative = aiResult.narrative;
        strReport.xmlPayload = aiResult.xml;
    }

    // Step 5: Filing
    try {
        setState(prev => ({ ...prev, kestraStep: 5, processingStatus: 'Auto-filing STR with FIU-IND...' }));
        await new Promise(r => setTimeout(r, 1500));
        
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
                kestraStep: 6
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
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">POWERED BY CLINE • KESTRA • OUMI • VERCEL</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://github.com/mdkamranalam/FinCompliance-AI" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                <Github size={18} />
                <span className="hidden sm:inline">Repo</span>
             </a>
             <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">System Online</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        
        {/* Kestra Orchestration Visualization */}
        <KestraOrchestrator currentStep={state.kestraStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          
          {/* Main Dashboard Area */}
          <div className="lg:col-span-2 space-y-8">
             <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-white">Live Monitoring Dashboard</h2>
             </div>
             <Dashboard 
                transactions={state.transactions} 
                riskScores={state.riskScores}
                onSelectTx={(id) => setState(prev => ({ ...prev, selectedTxId: id }))} 
             />
          </div>

          {/* Ingestion Panel */}
          <div className="lg:col-span-1">
             <TransactionForm 
                onSubmit={handleIngest} 
                onBulkSubmit={handleBulkIngest}
                onFetchLive={handleFetchLive}
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