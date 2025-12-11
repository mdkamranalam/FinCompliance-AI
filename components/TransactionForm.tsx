import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { Send, UploadCloud, Loader2, FileText, Globe, TestTube, Play } from 'lucide-react';

interface TransactionFormProps {
  onSubmit: (tx: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => void;
  onBulkSubmit?: (txs: Omit<Transaction, 'id' | 'status' | 'timestamp'>[]) => void;
  onFetchLive?: () => void;
  isLoading: boolean;
  processingStatus?: string;
}

const TEST_SCENARIOS = {
  structuring: [
    { amount: 980000, currency: 'INR', from_account: 'ACC-8811-IN (Smurf A)', to_account: 'ACC-9900-IN (Main Corp)', receiver_country: 'India', type: 'NEFT', location: 'Delhi' },
    { amount: 950000, currency: 'INR', from_account: 'ACC-8811-IN (Smurf A)', to_account: 'ACC-9900-IN (Main Corp)', receiver_country: 'India', type: 'NEFT', location: 'Delhi' },
    { amount: 990000, currency: 'INR', from_account: 'ACC-8811-IN (Smurf A)', to_account: 'ACC-9900-IN (Main Corp)', receiver_country: 'India', type: 'NEFT', location: 'Delhi' },
    { amount: 920000, currency: 'INR', from_account: 'ACC-8811-IN (Smurf A)', to_account: 'ACC-9900-IN (Main Corp)', receiver_country: 'India', type: 'NEFT', location: 'Delhi' },
    { amount: 960000, currency: 'INR', from_account: 'ACC-8811-IN (Smurf A)', to_account: 'ACC-9900-IN (Main Corp)', receiver_country: 'India', type: 'NEFT', location: 'Delhi' },
  ],
  shell: [
    { amount: 5000000, currency: 'USD', from_account: 'ACC-CORP-US (Mega Ind)', to_account: 'ACC-OFF-001 (Global Shell Holdings)', receiver_country: 'Cayman', type: 'SWIFT', location: 'Mumbai' },
    { amount: 15000, currency: 'USD', from_account: 'ACC-CORP-US (Mega Ind)', to_account: 'ACC-OFF-002 (Trust Services Ltd)', receiver_country: 'BVI', type: 'WIRE', location: 'Mumbai' },
    { amount: 750000, currency: 'EUR', from_account: 'ACC-CORP-US (Mega Ind)', to_account: 'ACC-OFF-003 (Panama Law Firm)', receiver_country: 'Panama', type: 'SWIFT', location: 'Mumbai' },
  ],
  fan_out: [
    { amount: 150000, currency: 'INR', from_account: 'ACC-LAYER-1 (Source)', to_account: 'ACC-MULE-1 (Ramesh)', receiver_country: 'India', type: 'IMPS', location: 'Bangalore' },
    { amount: 145000, currency: 'INR', from_account: 'ACC-LAYER-1 (Source)', to_account: 'ACC-MULE-2 (Suresh)', receiver_country: 'India', type: 'IMPS', location: 'Bangalore' },
    { amount: 160000, currency: 'INR', from_account: 'ACC-LAYER-1 (Source)', to_account: 'ACC-MULE-3 (Mahesh)', receiver_country: 'India', type: 'IMPS', location: 'Bangalore' },
    { amount: 155000, currency: 'INR', from_account: 'ACC-LAYER-1 (Source)', to_account: 'ACC-MULE-4 (Dinesh)', receiver_country: 'India', type: 'IMPS', location: 'Bangalore' },
    { amount: 140000, currency: 'INR', from_account: 'ACC-LAYER-1 (Source)', to_account: 'ACC-MULE-5 (Ganesh)', receiver_country: 'India', type: 'IMPS', location: 'Bangalore' },
  ],
  mixed: [
     { amount: 5000, currency: 'INR', from_account: 'ACC-USER-1 (Alice)', to_account: 'ACC-SHOP-1 (Grocery)', receiver_country: 'India', type: 'UPI', location: 'Pune' },
     { amount: 2500000, currency: 'INR', from_account: 'ACC-USER-2 (Bob)', to_account: 'ACC-OFF-99 (Shell Co)', receiver_country: 'Mauritius', type: 'SWIFT', location: 'Mumbai' }, // High Risk
     { amount: 12000, currency: 'INR', from_account: 'ACC-USER-1 (Alice)', to_account: 'ACC-SHOP-2 (Clothes)', receiver_country: 'India', type: 'UPI', location: 'Pune' },
     { amount: 980000, currency: 'INR', from_account: 'ACC-SMURF-1', to_account: 'ACC-MAIN-1', receiver_country: 'India', type: 'NEFT', location: 'Delhi' }, // Structuring
     { amount: 990000, currency: 'INR', from_account: 'ACC-SMURF-1', to_account: 'ACC-MAIN-1', receiver_country: 'India', type: 'NEFT', location: 'Delhi' }, // Structuring
  ]
};

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, onBulkSubmit, onFetchLive, isLoading, processingStatus }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    amount: 250000,
    currency: 'INR',
    from_account: 'ACC-8892-IN (Rajesh Kumar)',
    to_account: 'ACC-9921-OFF (Offshore Entity)',
    receiver_country: 'Seychelles',
    type: 'SWIFT',
    location: 'Mumbai Branch',
  });
  
  const [selectedScenario, setSelectedScenario] = useState('structuring');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScenarioRun = () => {
    if (!onBulkSubmit) return;
    const scenarioData = TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS];
    if (scenarioData) {
        onBulkSubmit(scenarioData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onBulkSubmit) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Robust CSV Parsing Logic
      const lines = text.split(/\r\n|\n/).map(line => line.trim()).filter(line => line.length > 0);
      
      let headerIndex = -1;
      // Default mapping (Standard Schema: Sender Account, Amount, Currency, Receiver Account, Type, Location, Receiver Country)
      let colMap: Record<string, number> = {
          from_account: 0,
          amount: 1,
          currency: 2,
          to_account: 3,
          type: 4,
          location: 5,
          receiver_country: 6
      };

      // 1. Detect Header Row (Scan first 10 lines)
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const rowLower = lines[i].toLowerCase();
          // Flexible detection: Must have 'amount' and some account identifier to be considered a valid header
          if (rowLower.includes('amount') && (rowLower.includes('sender') || rowLower.includes('from') || rowLower.includes('account'))) {
              headerIndex = i;
              const headers = lines[i].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
              
              colMap = {}; // Reset to build from dynamic headers
              
              headers.forEach((h, idx) => {
                  if (h.includes('sender') || h.includes('from')) colMap.from_account = idx;
                  else if (h.includes('amount')) colMap.amount = idx;
                  else if (h.includes('currency')) colMap.currency = idx;
                  else if (h.includes('country')) colMap.receiver_country = idx; // Prioritize specific country keyword
                  else if (h.includes('receiver') || h.includes('to')) colMap.to_account = idx;
                  else if (h.includes('type')) colMap.type = idx;
                  else if (h.includes('location')) colMap.location = idx;
              });
              break;
          }
      }

      // 2. Determine Data Start Index
      let startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
      
      // Fallback check: If no header found, but row 0 has non-numeric amount at default index, assume it's a header we missed
      if (headerIndex === -1 && lines.length > 0) {
          const parts = lines[0].split(',');
          // Check default amount index (1)
          if (parts.length > 1 && isNaN(parseFloat(parts[1].replace(/[^0-9.-]+/g,"")))) {
             startIndex = 1;
          }
      }

      // 3. Parse Data
      const transactions: Omit<Transaction, 'id' | 'status' | 'timestamp'>[] = lines.slice(startIndex).map(line => {
        const parts = line.split(',').map(s => s.trim());
        
        // Robust getter
        const getVal = (key: string) => {
            const idx = colMap[key];
            if (idx === undefined || idx >= parts.length) return undefined;
            return parts[idx];
        };

        const amountRaw = getVal('amount');
        if (!amountRaw) return null;
        
        const amount = parseFloat(amountRaw.replace(/[^0-9.-]+/g,""));
        if (isNaN(amount)) return null;

        return {
          amount: amount,
          currency: getVal('currency') || 'INR',
          from_account: getVal('from_account') || 'Unknown',
          to_account: getVal('to_account') || 'Unknown',
          receiver_country: getVal('receiver_country') || 'Unknown',
          type: getVal('type') || 'WIRE',
          location: getVal('location') || 'Unknown',
        };
      }).filter((t): t is Omit<Transaction, 'id' | 'status' | 'timestamp'> => t !== null);

      if (transactions.length > 0) {
        onBulkSubmit(transactions);
      } else {
        alert("No valid transactions found. Please ensure CSV has columns like: Amount, Sender, Receiver, Country.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-xl border border-slate-700 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-slate-300">
        <UploadCloud size={20} className="text-accent" />
        <h3 className="font-semibold">Ingest New Transaction</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From Account (Sender)</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.from_account}
            onChange={(e) => setFormData({...formData, from_account: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <input
                type="number"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To Account (Receiver)</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.to_account}
            onChange={(e) => setFormData({...formData, to_account: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                    <option value="SWIFT">SWIFT</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="WIRE">WIRE</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
            </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Receiver Country</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.receiver_country}
            onChange={(e) => setFormData({...formData, receiver_country: e.target.value})}
          >
            <option value="India">India (Domestic)</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Seychelles">Seychelles (High Risk)</option>
            <option value="BVI">British Virgin Islands (High Risk)</option>
            <option value="Cayman">Cayman Islands (High Risk)</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 pt-2">
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Processing</span>
                    </span>
                ) : (
                    <>
                    <Send size={18} />
                    <span>Simulate Ingest</span>
                    </>
                )}
            </button>
            
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={handleFileClick}
                    disabled={isLoading}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                    title="Upload CSV"
                >
                    <FileText size={16} className="text-slate-400" />
                    <span>Bulk CSV</span>
                </button>
                <button
                    type="button"
                    onClick={onFetchLive}
                    disabled={isLoading || !onFetchLive}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                    title="Simulate External API via Oumi"
                >
                    <Globe size={16} className="text-green-400" />
                    <span>Live Feed</span>
                </button>
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
            />
        </div>
      </form>

      {/* Test Scenarios Section */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
           <TestTube size={14} className="text-purple-400" /> Test Scenarios
        </label>
        <div className="flex gap-2">
            <select 
                className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-2 flex-1 focus:outline-none focus:border-accent"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
            >
                <option value="structuring">Structuring / Smurfing</option>
                <option value="shell">Shell Company / Offshore</option>
                <option value="fan_out">Fan-Out (Layering)</option>
                <option value="mixed">Mixed Traffic</option>
            </select>
            <button
                type="button"
                onClick={handleScenarioRun}
                disabled={isLoading}
                className="bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
                <Play size={12} fill="currentColor" />
                Run
            </button>
        </div>
      </div>
      
      <p className="text-xs text-center text-slate-500 mt-auto pt-4">
        Simulates Kestra Workflow Pipeline
      </p>
    </div>
  );
};

export default TransactionForm;