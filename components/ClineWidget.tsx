import React, { useEffect, useState } from 'react';
import { Terminal, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface ClineWidgetProps {
  hasHighRisk: boolean;
  lastTxId: string | null;
  pollingInterval?: number;
}

const ClineWidget: React.FC<ClineWidgetProps> = ({ hasHighRisk, lastTxId, pollingInterval = 3000 }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    // Initial logs
    setLogs(['[monitor_agent.py] Initializing agent...', '[monitor_agent.py] Connecting to PostgreSQL...']);

    const interval = setInterval(() => {
      setIsFetching(true);
      
      // Simulate network latency for the active fetch
      setTimeout(() => {
        setLogs(prev => {
          const newLogs = [...prev];
          if (newLogs.length > 5) newLogs.shift();
          
          if (hasHighRisk && lastTxId) {
              return [...newLogs, `[monitor_agent.py] ALERT: High risk detected on TX #${lastTxId}. Polling DB...`];
          }
          return [...newLogs, `[monitor_agent.py] Polling DB... OK. No anomalies.`];
        });
        setIsFetching(false);
      }, 800); // 800ms fetch duration

    }, pollingInterval);

    return () => clearInterval(interval);
  }, [hasHighRisk, lastTxId, pollingInterval]);

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 bg-black/90 border border-green-500/30 rounded-lg shadow-2xl font-mono text-xs text-green-400 p-3 z-40 backdrop-blur-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-2 border-b border-green-500/20 pb-1">
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span className="font-bold">Cline Agent</span>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 animate-pulse">
               <RefreshCw size={10} className="animate-spin" />
               <span>Fetching</span>
            </span>
          )}
          <div className="flex items-center gap-1">
             <div className={`w-2 h-2 rounded-full ${hasHighRisk ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
             <span className="text-[10px] text-gray-400">monitor_agent.py</span>
          </div>
        </div>
      </div>
      <div className="space-y-1 h-24 overflow-hidden">
        {logs.map((log, i) => (
          <div key={i} className={`truncate ${log.includes('ALERT') ? 'text-red-400 font-bold' : ''}`}>
            <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
            {log}
          </div>
        ))}
      </div>
      {hasHighRisk && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 flex items-start gap-2 animate-pulse">
          <AlertCircle size={16} className="mt-0.5" />
          <div>
            <div className="font-bold">High Risk Detected!</div>
            <div className="text-[10px]">Triggering Kestra workflow...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClineWidget;