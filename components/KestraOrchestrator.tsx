import React from 'react';
import { Database, Zap, Brain, FileText, CheckCircle2, Loader2, Play, Check } from 'lucide-react';

interface KestraOrchestratorProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: 'Ingest (FastAPI)', icon: Database },
  { id: 2, label: 'Rules Engine (80%)', icon: Zap },
  { id: 3, label: 'XGBoost Scoring', icon: Brain },
  { id: 4, label: 'Oumi GenAI', icon: FileText },
  { id: 5, label: 'STR Filed', icon: CheckCircle2 },
];

const KestraOrchestrator: React.FC<KestraOrchestratorProps> = ({ currentStep }) => {
  if (currentStep === 0) return null;

  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100));

  return (
    <div className="w-full bg-secondary/50 border border-slate-700 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <Play size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Kestra Workflow: risk_pipeline.yaml
        </h3>
      </div>
      
      <div className="relative mx-2 md:mx-6">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
        
        {/* Progress Bar Fill */}
        <div 
          className="absolute top-5 left-0 h-1 bg-accent -z-10 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>

        <div className="flex justify-between items-start">
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-3 relative z-10 group cursor-default">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
                    ${isActive 
                      ? 'bg-primary border-accent text-accent shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110' 
                      : isCompleted 
                        ? 'bg-accent border-accent text-white scale-100 shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-600 scale-100'
                    }
                  `}
                >
                  {isActive ? (
                     <Loader2 size={20} className="animate-spin" />
                  ) : isCompleted ? (
                     <Check size={20} strokeWidth={3} />
                  ) : (
                     <step.icon size={18} />
                  )}
                </div>
                <span 
                  className={`
                    text-[10px] md:text-xs font-medium text-center transition-all duration-300 max-w-[80px] leading-tight
                    ${isActive 
                        ? 'text-white translate-y-0 opacity-100 font-semibold' 
                        : isCompleted 
                            ? 'text-accent translate-y-0 opacity-100' 
                            : 'text-slate-600 translate-y-1 opacity-70'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KestraOrchestrator;