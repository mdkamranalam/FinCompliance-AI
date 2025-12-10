import React, { useState } from 'react';
import { Transaction } from '../types';
import { Send, UploadCloud, Loader2 } from 'lucide-react';

interface TransactionFormProps {
  onSubmit: (tx: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => void;
  isLoading: boolean;
  processingStatus?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, isLoading, processingStatus }) => {
  const [formData, setFormData] = useState({
    amount: 250000,
    currency: 'INR',
    sender: 'Rajesh Kumar',
    receiver: 'Offshore Entity Ltd',
    jurisdiction: 'Seychelles',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-secondary p-6 rounded-xl border border-slate-700 h-full">
      <div className="flex items-center gap-2 mb-6 text-slate-300">
        <UploadCloud size={20} className="text-accent" />
        <h3 className="font-semibold">Ingest New Transaction</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Sender Name</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.sender}
            onChange={(e) => setFormData({...formData, sender: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-xs font-medium text-slate-500 mb-1">Receiver</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.receiver}
            onChange={(e) => setFormData({...formData, receiver: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Jurisdiction</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={formData.jurisdiction}
            onChange={(e) => setFormData({...formData, jurisdiction: e.target.value})}
          >
            <option value="India">India (Domestic)</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="Seychelles">Seychelles (High Risk)</option>
            <option value="BVI">British Virgin Islands (High Risk)</option>
            <option value="Cayman">Cayman Islands (High Risk)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
               <Loader2 className="animate-spin" size={16} />
               <span>{processingStatus || 'Processing...'}</span>
            </span>
          ) : (
            <>
              <Send size={16} />
              <span>Simulate Ingest</span>
            </>
          )}
        </button>
        <p className="text-xs text-center text-slate-500 mt-2">
            Triggers Kestra Workflow via FastAPI
        </p>
      </form>
    </div>
  );
};

export default TransactionForm;