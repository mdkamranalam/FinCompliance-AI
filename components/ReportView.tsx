import React, { useState } from 'react';
import { Transaction, RiskScore, STRReport } from '../types';
import { FileCode, AlertOctagon, Check, Bot, Download, Send, Loader2, CheckCircle, Info, FileDown, Printer, AlertTriangle, Activity, Copy, Terminal, PieChart } from 'lucide-react';

interface ReportViewProps {
  tx: Transaction;
  risk: RiskScore;
  report: STRReport;
  onClose: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ tx, risk, report, onClose }) => {
  const [isFiling, setIsFiling] = useState(false);
  const [filingComplete, setFilingComplete] = useState(report.isFiled);
  const [fiuRef, setFiuRef] = useState<string | null>(
    report.isFiled ? `FIU-${Math.floor(Math.random() * 9000) + 1000}` : null
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = `STR_Report_${tx.id}_${new Date().toISOString().split('T')[0]}`;
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    }, 100);
  };

  const handleDownloadXML = () => {
    const blob = new Blob([report.xmlPayload], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FIU-IND_STR_${tx.id}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileReport = () => {
    if (filingComplete) return;
    setIsFiling(true);
    setTimeout(() => {
        const ref = `FIU-${Math.floor(Math.random() * 9000) + 1000}`;
        setFiuRef(ref);
        setIsFiling(false);
        setFilingComplete(true);
    }, 2000);
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Helper for dynamic risk styling
  const getRiskConfig = (score: number) => {
    if (score >= 80) return { color: 'text-red-500', printColor: 'print:text-red-600', bg: 'bg-red-500', border: 'border-red-500' };
    if (score >= 60) return { color: 'text-orange-500', printColor: 'print:text-orange-600', bg: 'bg-orange-500', border: 'border-orange-500' };
    if (score >= 40) return { color: 'text-yellow-500', printColor: 'print:text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500' };
    return { color: 'text-green-500', printColor: 'print:text-green-600', bg: 'bg-green-500', border: 'border-green-500' };
  };
  
  const riskConfig = getRiskConfig(risk.score);
  const circleRadius = 56;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (risk.score / 100) * circumference;

  return (
    <div 
      id="report-modal-wrapper"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4 print:p-0 print:bg-white print:block print:inset-auto print:static"
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body {
            width: 100%; height: auto !important; margin: 0 !important; padding: 0 !important;
            overflow: visible !important; background-color: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          body * { visibility: hidden; }
          #report-modal-wrapper, #report-modal-wrapper * { visibility: visible; }
          #report-modal-wrapper {
            position: absolute; left: 0; top: 0; width: 100%; min-height: 100%;
            margin: 0; padding: 0; background: white !important; display: block !important;
            z-index: 99999;
          }
          #report-container {
            width: 100% !important; max-width: none !important; box-shadow: none !important;
            border: none !important; border-radius: 0 !important; margin: 0 !important;
            padding: 0 !important; display: block !important; overflow: visible !important;
            height: auto !important;
          }
          .no-print { display: none !important; }
          
          /* Pagination & Layout Control */
          .print-break-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
          .print-break-auto { break-inside: auto !important; page-break-inside: auto !important; }
          .print-expand { max-height: none !important; overflow: visible !important; height: auto !important; white-space: pre-wrap !important; }
          .print-overflow-visible { overflow: visible !important; }
          
          /* Typography & Colors Override */
          .text-slate-300, .text-slate-400, .text-slate-500, .text-white, .text-gray-500 { color: #1f2937 !important; }
          .text-green-400 { color: #15803d !important; }
          .text-red-400, .text-red-500 { color: #b91c1c !important; }
          .text-yellow-400 { color: #b45309 !important; }
          .text-blue-400 { color: #1d4ed8 !important; }
          
          .border-slate-700 { border-color: #e5e7eb !important; }
          .bg-slate-900, .bg-secondary, .bg-slate-800, .bg-slate-950\/30, .bg-\[#0B1120\] { background-color: white !important; }
          .bg-red-500 { background-color: #ef4444 !important; }
        }
      `}</style>

      <div id="report-container" className="bg-secondary w-full max-w-4xl h-full sm:h-[90vh] print:h-auto sm:rounded-2xl border-x-0 sm:border border-slate-700 flex flex-col shadow-2xl overflow-hidden print:overflow-visible print:block print:rounded-none">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 print:bg-white print:border-black print:pb-4 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 print:text-black">
              <AlertOctagon className="text-red-500 print:text-red-600 shrink-0" />
              Suspicious Transaction Report
            </h2>
            <div className="flex flex-col">
                <p className="text-slate-400 text-xs sm:text-sm mt-1 print:text-gray-600">Generated by FinCompliance-AI • Ref: {tx.id}</p>
                <p className="hidden print:block text-xs text-gray-500 font-mono mt-1">CONFIDENTIAL • FIU-IND COMPLIANT</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 no-print">
            <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 text-slate-400 hover:text-accent transition-colors bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
                title="Print or Save as PDF"
            >
                <Printer size={18} />
                <span className="hidden sm:inline font-medium text-sm">Print / PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
                <span className="sm:hidden text-2xl leading-none">&times;</span>
                <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:overflow-visible print:h-auto print:block">
          
          {filingComplete && fiuRef && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 no-print">
                <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={20} />
                <div>
                    <h4 className="text-green-400 font-semibold text-sm">STR Filed Successfully</h4>
                    <p className="text-green-500/80 text-xs mt-1">
                        This report has been officially submitted to the FIU-IND regulatory gateway.
                        <br />
                        Reference ID: <span className="font-mono font-bold text-green-300 select-all">{fiuRef}</span>
                    </p>
                </div>
            </div>
          )}
          
          {/* Transaction Details Section (Schema Compliant) */}
          <div className="bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-700 print:bg-white print:border-gray-300 print:text-black print-break-avoid">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2 flex items-center gap-2 print:text-black print:border-gray-300">
                <Info size={16} className="text-accent print:hidden" />
                Transaction Details (Schema: transactions)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">ID</span>
                    <span className="text-sm font-mono text-white print:text-black">{tx.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">Timestamp</span>
                    <span className="text-sm font-mono text-white print:text-black">{new Date(tx.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">Amount</span>
                    <span className="text-sm font-medium text-white print:text-black">{tx.amount.toLocaleString('en-IN')} {tx.currency}</span>
                  </div>
                   <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">Receiver Country</span>
                    <span className="text-sm font-medium text-white print:text-black">{tx.receiver_country}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">From Account</span>
                    <span className="text-sm font-medium text-white print:text-black truncate block">{tx.from_account}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">To Account</span>
                    <span className="text-sm font-medium text-white print:text-black truncate block">{tx.to_account}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">Type</span>
                    <span className="text-sm font-medium text-white print:text-black">{tx.type}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wide print:text-gray-600">Location</span>
                    <span className="text-sm font-medium text-white print:text-black">{tx.location}</span>
                  </div>
              </div>
          </div>

          {/* Risk Score Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-break-avoid">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 print:bg-white print:border-gray-300 flex flex-col items-center justify-center relative overflow-hidden">
               <p className="text-xs text-slate-500 uppercase font-bold absolute top-4 left-4 print:text-black">Risk Score</p>
               
               <div className="relative w-36 h-36 mt-4">
                  {/* SVG Gauge */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r={circleRadius} stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-800 print:text-gray-200" />
                    <circle cx="72" cy="72" r={circleRadius} stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${riskConfig.color} ${riskConfig.printColor} transition-all duration-1000 ease-out`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${riskConfig.color} ${riskConfig.printColor} print:text-black`}>{risk.score}</span>
                    <span className="text-xs text-slate-500 uppercase font-semibold">/ 100</span>
                  </div>
               </div>
               
               <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold border ${riskConfig.border.replace('border-', 'border-').replace('500', '500/30')} ${riskConfig.bg.replace('bg-', 'bg-').replace('500', '500/10')} ${riskConfig.color} ${riskConfig.printColor} print:border-black print:bg-white`}>
                 {risk.risk_level.toUpperCase()}
               </div>
            </div>

            <div className="sm:col-span-2 bg-slate-900 p-4 rounded-lg border border-slate-700 print:bg-white print:border-gray-300">
              <p className="text-xs text-slate-500 uppercase font-bold mb-3 print:text-black">Scoring Breakdown</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm gap-2">
                   <span className="text-slate-300 print:text-black">RBI Rules Engine</span>
                   <span className="text-yellow-400 font-mono print:text-black font-bold whitespace-nowrap">{risk.breakdown.rules}/100</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                   <span className="text-slate-300 print:text-black truncate">
                     Velocity Check
                     {risk.velocity_count && risk.velocity_count > 1 && (
                       <span className="ml-1 text-xs text-slate-500 font-normal">({risk.velocity_count} detected)</span>
                     )}
                   </span>
                   <span className="text-orange-400 font-mono print:text-black font-bold whitespace-nowrap">{risk.breakdown.velocity}/100</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                   <span className="text-slate-300 print:text-black">XGBoost ML Model</span>
                   <span className="text-purple-400 font-mono print:text-black font-bold whitespace-nowrap">{risk.breakdown.xgboost}/100</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                   <span className="text-slate-300 print:text-black">Oumi (Gemini) LLM</span>
                   <span className="text-pink-400 font-mono print:text-black font-bold whitespace-nowrap">{risk.breakdown.oumi}/100</span>
                </div>
              </div>

              {/* NEW SECTION: Detailed Score Analysis */}
              <div className="mb-4 pt-3 border-t border-slate-700/50 print:border-gray-300">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5 print:text-black">
                     <PieChart size={12} /> Score Composition Analysis
                  </h4>
                  <p className="text-xs text-slate-300 leading-5 print:text-black text-justify">
                    The composite risk score of <strong className="text-white print:text-black">{risk.score}/100</strong> is driven by a weighted aggregation of four engines. 
                    The <strong>Rules Engine</strong> contributed {risk.breakdown.rules} points based on regulatory heuristics (Jurisdiction/Amount). 
                    <strong>Velocity Checks</strong> added {risk.breakdown.velocity} points reflecting transaction frequency. 
                    The <strong>XGBoost Model</strong> assigned a risk probability of {risk.breakdown.xgboost}% based on historical patterns, while 
                    <strong>Oumi AI</strong> assessed the narrative context risk at {risk.breakdown.oumi}/100.
                    {risk.score > 60 && (
                        <span className="block mt-1.5 text-orange-300 print:text-orange-700 font-medium bg-orange-900/10 p-1.5 rounded border border-orange-500/20 print:bg-orange-50 print:border-orange-200">
                           Primary Driver: {
                               risk.breakdown.rules >= Math.max(risk.breakdown.velocity, risk.breakdown.xgboost, risk.breakdown.oumi) ? 'Regulatory Rule Violation' : 
                               risk.breakdown.velocity >= Math.max(risk.breakdown.rules, risk.breakdown.xgboost, risk.breakdown.oumi) ? 'High Transaction Velocity' :
                               risk.breakdown.xgboost >= Math.max(risk.breakdown.rules, risk.breakdown.velocity, risk.breakdown.oumi) ? 'ML Anomaly Detection' :
                               'GenAI Contextual Risk'
                           }
                        </span>
                    )}
                  </p>
              </div>

              {risk.velocity_count && risk.velocity_count > 1 && (
                <div className="mb-4 pt-3 border-t border-slate-700 print:border-gray-300">
                   <div className="flex justify-between items-center mb-2">
                      <p className={`text-xs uppercase font-bold flex items-center gap-1 print:text-black ${risk.velocity_count >= 3 ? 'text-red-400' : 'text-slate-400'}`}>
                         <Activity size={12} className={risk.velocity_count >= 3 ? 'text-red-400' : 'text-blue-400 print:text-black'} />
                         {risk.velocity_count >= 3 ? 'High Velocity Alert' : 'Account Velocity'}
                      </p>
                   </div>
                   <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50 print:bg-white print:border-gray-200">
                       <div className="flex justify-between items-center mb-1">
                           <span className="text-xs text-slate-400 print:text-black">Account</span>
                           <span className="text-xs font-mono text-slate-300 print:text-black truncate max-w-[150px]">{tx.from_account}</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400 print:text-black">Session Frequency</span>
                           <div className="flex items-center gap-2">
                               <div className="flex gap-0.5">
                                   {[...Array(Math.min(5, risk.velocity_count))].map((_, i) => (
                                       <div key={i} className={`w-1.5 h-3 rounded-sm ${risk.velocity_count >= 3 ? 'bg-red-500' : 'bg-accent'} print:bg-black`}></div>
                                   ))}
                                   {risk.velocity_count > 5 && <span className="text-xs text-accent ml-1">+</span>}
                               </div>
                               <span className="text-sm font-bold text-white print:text-black">{risk.velocity_count} Txns</span>
                           </div>
                       </div>
                   </div>
                </div>
              )}

              {risk.reasons && risk.reasons.length > 0 && (
                <div className="pt-3 border-t border-slate-700 print:border-gray-300 animate-in slide-in-from-top-2 fade-in duration-500">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1 print:text-black">
                     <AlertTriangle size={12} className="text-yellow-500 print:text-black" />
                     Identified Risk Factors
                  </p>
                  <ul className="space-y-1">
                    {risk.reasons.map((reason, idx) => (
                      <li key={idx} className="text-xs text-red-400 flex items-start gap-2 print:text-red-700">
                        <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full shrink-0 print:bg-red-700"></span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Oumi Generated Narrative - IMPROVED UI */}
          <div className="group bg-slate-900 rounded-xl border border-slate-700 overflow-hidden print:bg-white print:border-gray-300 print-break-auto print-overflow-visible hover:border-pink-500/30 transition-colors duration-300">
            <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-700 flex justify-between items-center print:bg-gray-100 print:border-gray-300">
               <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                 <Bot size={16} className="text-pink-400 print:text-black" />
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 font-bold print:text-black">
                    Oumi Generated Narrative
                 </span>
               </h3>
               <div className="flex items-center gap-3">
                   <button 
                     onClick={() => copyToClipboard(report.narrative, 'narrative')}
                     className="text-slate-400 hover:text-white transition-colors p-1.5 rounded hover:bg-slate-700 no-print"
                     title="Copy Narrative"
                   >
                     {copiedSection === 'narrative' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                   </button>
                   <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1 print:border-black print:text-black shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                     <Check size={10} /> CodeRabbit Approved
                   </span>
               </div>
            </div>
            <div className="p-5 text-slate-300 text-sm leading-relaxed font-sans bg-slate-900/50 print:text-black print:bg-white text-justify whitespace-pre-line">
              {report.narrative}
            </div>
          </div>

          {/* FIU-IND XML Payload - IMPROVED UI */}
          <div className="group bg-slate-900 rounded-xl border border-slate-700 overflow-hidden print:bg-white print:border-gray-300 print-break-auto print-overflow-visible hover:border-blue-500/30 transition-colors duration-300">
            <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-700 flex justify-between items-center print:bg-gray-100 print:border-gray-300">
               <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                 <Terminal size={16} className="text-blue-400 print:text-blue-600" />
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 font-bold print:text-black">
                    FIU-IND XML Payload
                 </span>
               </h3>
               <div className="flex items-center gap-2 no-print">
                   <button 
                     onClick={() => copyToClipboard(report.xmlPayload, 'xml')}
                     className="text-slate-400 hover:text-white transition-colors p-1.5 rounded hover:bg-slate-700"
                     title="Copy XML"
                   >
                     {copiedSection === 'xml' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                   </button>
                   <button onClick={handleDownloadXML} className="text-[10px] flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded transition-colors border border-slate-600/50">
                      <FileDown size={12} /> Save XML
                   </button>
               </div>
            </div>
            {/* Dark Editor Theme */}
            <div className="relative bg-[#0B1120] print:bg-white">
                <pre className="p-4 text-[11px] leading-6 font-mono text-blue-300 overflow-x-auto print:text-black print-expand custom-scrollbar scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent max-h-80">
                    {report.xmlPayload}
                </pre>
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#0B1120] to-transparent pointer-events-none print:hidden"></div>
            </div>
          </div>
          
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 no-print shrink-0">
          <button 
            onClick={handleDownloadPDF}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          
          <button 
            onClick={handleFileReport}
            disabled={isFiling || filingComplete}
            className={`
                px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
                ${filingComplete 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/50 cursor-default' 
                    : 'bg-accent hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'}
            `}
          >
            {isFiling ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Filing with FIU-IND...</span>
                    <span className="sm:hidden">Filing...</span>
                </>
            ) : filingComplete ? (
                <>
                    <CheckCircle size={16} />
                    <span className="hidden sm:inline">Filed (Ref: #{fiuRef || 'FIU-PENDING'})</span>
                    <span className="sm:hidden">Filed</span>
                </>
            ) : (
                <>
                    <Send size={16} />
                    <span className="hidden sm:inline">File with FIU-IND</span>
                    <span className="sm:hidden">File Report</span>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportView;