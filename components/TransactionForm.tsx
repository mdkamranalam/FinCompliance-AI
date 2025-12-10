import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { Send, UploadCloud, Loader2, FileText, Globe } from 'lucide-react';

interface TransactionFormProps {
  onSubmit: (tx: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => void;
  onBulkSubmit?: (txs: Omit<Transaction, 'id' | 'status' | 'timestamp'>[]) => void;
  onFetchLive?: () => void;
  isLoading: boolean;
  processingStatus?: string;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onBulkSubmit) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV based on provided schema: 
      // Header: Sender Account,Amount,Currency,Receiver Account,Type,Location,Receiver Country
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Determine start index based on header presence
      const hasHeader = lines[0].toLowerCase().includes('sender account');
      const dataRows = hasHeader ? lines.slice(1) : lines;

      const transactions: Omit<Transaction, 'id' | 'status' | 'timestamp'>[] = dataRows.map(line => {
        const parts = line.split(',').map(s => s.trim());
        
        // Ensure we have enough columns (7 columns in schema)
        if (parts.length < 7) return null;

        const [from_account, amount, currency, to_account, type, location, receiver_country] = parts;
        
        return {
          amount: parseFloat(amount) || 0,
          currency: currency || 'INR',
          from_account: from_account || 'Unknown',
          to_account: to_account || 'Unknown',
          receiver_country: receiver_country || 'Unknown',
          type: type || 'WIRE',
          location: location || 'Unknown',
        };
      }).filter((t): t is Omit<Transaction, 'id' | 'status' | 'timestamp'> => t !== null);

      if (transactions.length > 0) {
        onBulkSubmit(transactions);
      } else {
        alert("No valid transactions found in CSV. Please ensure format matches: Sender Account, Amount, Currency, Receiver Account, Type, Location, Receiver Country");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-xl border border-slate-700 h-full">
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
        
        <p className="text-xs text-center text-slate-500 mt-2">
            Triggers Kestra Workflow via FastAPI
        </p>
      </form>
    </div>
  );
};

export default TransactionForm;