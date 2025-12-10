import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, RiskScore, RiskLevel } from '../types';
import { AlertTriangle, ShieldCheck, Activity, Filter, Search, ArrowUpRight, ArrowDownLeft, X, AlertOctagon, ChevronRight, MapPin } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  riskScores: Record<string, RiskScore>;
  onSelectTx: (id: string) => void;
}

const LEVEL_COLORS = {
  [RiskLevel.LOW]: '#10b981', // Green
  [RiskLevel.MEDIUM]: '#f59e0b', // Yellow
  [RiskLevel.HIGH]: '#f97316', // Orange
  [RiskLevel.CRITICAL]: '#ef4444', // Red
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, riskScores, onSelectTx }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const highRiskCount = transactions.filter(t => t.status === 'Flagged').length;
  const processedCount = transactions.filter(t => t.status === 'Processed').length;
  
  const pieData = useMemo(() => {
    const counts = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    Object.values(riskScores).forEach(rs => {
      if (counts[rs.risk_level] !== undefined) {
          counts[rs.risk_level]++;
      }
    });

    return [
      { name: 'Low', value: counts[RiskLevel.LOW], color: LEVEL_COLORS[RiskLevel.LOW] },
      { name: 'Medium', value: counts[RiskLevel.MEDIUM], color: LEVEL_COLORS[RiskLevel.MEDIUM] },
      { name: 'High', value: counts[RiskLevel.HIGH], color: LEVEL_COLORS[RiskLevel.HIGH] },
      { name: 'Critical', value: counts[RiskLevel.CRITICAL], color: LEVEL_COLORS[RiskLevel.CRITICAL] },
    ].filter(d => d.value > 0);
  }, [riskScores]);

  const uniqueCountries = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.receiver_country))).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesStatus = statusFilter === 'All' || tx.status === statusFilter;
      const matchesCountry = countryFilter === 'All' || tx.receiver_country === countryFilter;
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        tx.id.toLowerCase().includes(query) ||
        tx.from_account.toLowerCase().includes(query) ||
        tx.to_account.toLowerCase().includes(query) ||
        tx.receiver_country.toLowerCase().includes(query) ||
        tx.type.toLowerCase().includes(query) ||
        tx.location.toLowerCase().includes(query) ||
        tx.amount.toString().includes(query);

      return matchesStatus && matchesCountry && matchesSearch;
    });
  }, [transactions, statusFilter, countryFilter, searchQuery]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
      {/* KPI Cards */}
      <div className="bg-secondary p-4 md:p-5 rounded-xl border border-slate-700 flex items-center justify-between col-span-1 shadow-sm">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs uppercase font-bold tracking-wider">Total Transactions</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">{transactions.length}</h2>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
          <Activity size={20} className="md:w-6 md:h-6" />
        </div>
      </div>

      <div className="bg-secondary p-4 md:p-5 rounded-xl border border-slate-700 flex items-center justify-between col-span-1 shadow-sm">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs uppercase font-bold tracking-wider">Suspicious Alerts</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">{highRiskCount}</h2>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
          <AlertTriangle size={20} className="md:w-6 md:h-6" />
        </div>
      </div>

      <div className="bg-secondary p-4 md:p-5 rounded-xl border border-slate-700 flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1 shadow-sm">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs uppercase font-bold tracking-wider">Compliance Rate</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            {transactions.length > 0 ? Math.round((processedCount / transactions.length) * 100) : 100}%
          </h2>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
          <ShieldCheck size={20} className="md:w-6 md:h-6" />
        </div>
      </div>

      {/* Charts */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-secondary p-4 md:p-5 rounded-xl border border-slate-700 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          Live Transaction Volume
        </h3>
        <div className="h-40 md:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transactions.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="id" 
                stroke="#94a3b8" 
                tick={{fontSize: 10}} 
                tickFormatter={(val) => val.split('-')[1]} 
                tickLine={false}
              />
              <YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
                cursor={{ fill: '#334155', opacity: 0.2 }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-secondary p-4 md:p-5 rounded-xl border border-slate-700 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Risk Level Breakdown</h3>
        <div className="h-40 md:h-48 flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-secondary rounded-xl border border-slate-700 overflow-hidden shadow-sm">
        {/* Header with Filters */}
        <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/20">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                Recent Transactions
                <span className="text-xs font-normal text-slate-500 ml-1">({filteredTransactions.length})</span>
              </h3>
              <span className="text-[10px] md:text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded whitespace-nowrap border border-slate-700 md:hidden">
                Live
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                  <input
                    type="text"
                    placeholder="Search Sender or Receiver Account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-accent placeholder-slate-600 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

               <div className="flex gap-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
                  >
                    <option value="All">All Status</option>
                    <option value="Processed">Processed</option>
                    <option value="Flagged">Flagged</option>
                    <option value="Pending">Pending</option>
                  </select>

                  <select 
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
               </div>
            </div>
        </div>

        {/* Desktop Table View (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-800/50 text-xs uppercase font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold tracking-wider">ID</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Receiver Country</th>
                <th className="px-4 py-3 font-semibold tracking-wider">From Account</th>
                <th className="px-4 py-3 font-semibold tracking-wider">To Account</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Type</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Amount</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Risk Level</th>
                <th className="px-4 py-3 text-right font-semibold tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[...filteredTransactions].reverse().map((tx) => {
                const risk = riskScores[tx.id];
                const riskLevel = risk ? risk.risk_level : (tx.status === 'Flagged' ? RiskLevel.HIGH : RiskLevel.LOW);
                
                return (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs opacity-70 group-hover:opacity-100">
                    {tx.id}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 ${['Seychelles', 'BVI', 'Cayman'].includes(tx.receiver_country) ? 'text-red-400 font-semibold' : ''} text-xs`}>
                       {tx.receiver_country}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-[150px]">
                    <div className="flex items-center gap-1.5">
                        <ArrowUpRight size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate">{tx.from_account}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-[150px]">
                    <div className="flex items-center gap-1.5">
                        <ArrowDownLeft size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate">{tx.to_account}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {tx.type}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: tx.currency, maximumSignificantDigits: 10 }).format(tx.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {tx.status === 'Flagged' && <AlertOctagon size={14} className="text-red-500" />}
                        <span className={`
                        px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap inline-block border
                        ${riskLevel === RiskLevel.CRITICAL ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                            riskLevel === RiskLevel.HIGH ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            riskLevel === RiskLevel.MEDIUM ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-green-500/10 text-green-400 border-green-500/20'}
                        `}>
                        {riskLevel.toUpperCase()}
                        </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => onSelectTx(tx.id)}
                      className="text-accent hover:text-blue-400 text-xs font-medium whitespace-nowrap transition-colors hover:underline decoration-blue-500/30 underline-offset-4"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              )})}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (Visible on Mobile) */}
        <div className="md:hidden flex flex-col divide-y divide-slate-700/50">
           {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No transactions match your filters.
              </div>
           ) : (
             [...filteredTransactions].reverse().map(tx => {
                const risk = riskScores[tx.id];
                const riskLevel = risk ? risk.risk_level : (tx.status === 'Flagged' ? RiskLevel.HIGH : RiskLevel.LOW);
                const isHighRisk = riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;

                return (
                  <div key={tx.id} className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors active:bg-slate-800/50" onClick={() => onSelectTx(tx.id)}>
                     {/* Top Row: ID & Status/Risk */}
                     <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-0.5">{tx.id}</span>
                           <span className="text-lg font-bold text-white">
                             {new Intl.NumberFormat('en-IN', { style: 'currency', currency: tx.currency }).format(tx.amount)}
                           </span>
                        </div>
                        <span className={`
                            px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1
                            ${riskLevel === RiskLevel.CRITICAL ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                riskLevel === RiskLevel.HIGH ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                riskLevel === RiskLevel.MEDIUM ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'bg-green-500/10 text-green-400 border-green-500/20'}
                        `}>
                            {isHighRisk && <AlertOctagon size={10} />}
                            {riskLevel.toUpperCase()}
                        </span>
                     </div>

                     {/* Middle Row: Accounts */}
                     <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <ArrowUpRight size={14} className="text-slate-500 shrink-0" />
                           <span className="text-xs text-slate-300 truncate">{tx.from_account}</span>
                        </div>
                        <div className="w-full h-px bg-slate-800/50"></div>
                        <div className="flex items-center gap-2 overflow-hidden">
                           <ArrowDownLeft size={14} className="text-slate-500 shrink-0" />
                           <span className="text-xs text-slate-300 truncate">{tx.to_account}</span>
                        </div>
                     </div>

                     {/* Bottom Row: Meta & Action */}
                     <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1 text-slate-400">
                              <MapPin size={12} />
                              <span className={`text-xs ${['Seychelles', 'BVI', 'Cayman'].includes(tx.receiver_country) ? 'text-red-400 font-medium' : ''}`}>
                                {tx.receiver_country}
                              </span>
                           </div>
                           <span className="text-slate-600 text-[10px]">•</span>
                           <span className="text-xs text-slate-500 font-mono">{tx.type}</span>
                        </div>
                        
                        <button className="flex items-center gap-1 text-accent text-xs font-medium">
                           Details <ChevronRight size={14} />
                        </button>
                     </div>
                  </div>
                );
             })
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;