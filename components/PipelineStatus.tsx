
import React from 'react';
import { PipelineStep, Phase } from '../types';

// Use React.FC for consistent type handling of React components
const StatusIcon: React.FC<{ status: PipelineStep['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed': return <span className="text-emerald-500 font-bold">✓</span>;
    case 'running': return <span className="animate-spin text-sky-500">○</span>;
    case 'waiting': return <span className="text-amber-500 animate-pulse">●</span>;
    case 'failed': return <span className="text-rose-500">!</span>;
    default: return <span className="text-slate-700">·</span>;
  }
};

interface PipelineStatusProps {
  steps: PipelineStep[];
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ steps }) => {
  const phases: Phase[] = ['Research', 'Planning', 'Implementation'];

  return (
    <div className="space-y-6">
      {phases.map(phase => {
        const phaseSteps = steps.filter(s => s.phase === phase);
        const waves = Array.from(new Set(phaseSteps.map(s => s.wave).filter(Boolean)));

        return (
          <div key={phase} className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-1">
              {phase} Phase
            </h4>
            
            {waves.length > 0 ? (
              waves.sort().map(w => (
                <div key={`${phase}-wave-${w}`} className="pl-2 space-y-1">
                  <div className="text-[9px] font-bold text-slate-600 uppercase">Wave {w}</div>
                  {phaseSteps.filter(s => s.wave === w).map(step => (
                    <StepItem key={step.id} step={step} />
                  ))}
                </div>
              ))
            ) : (
              <div className="pl-2 space-y-1">
                {phaseSteps.map(step => (
                  <StepItem key={step.id} step={step} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface StepItemProps {
  step: PipelineStep;
}

// Explicitly using React.FC ensures standard React props like 'key' are recognized by the TypeScript compiler
const StepItem: React.FC<StepItemProps> = ({ step }) => (
  <div className={`flex items-center justify-between py-1 group transition-colors ${
    step.status === 'running' ? 'text-sky-400' : 
    step.status === 'waiting' ? 'text-amber-400' : 
    step.status === 'completed' ? 'text-slate-300' : 'text-slate-600'
  }`}>
    <div className="flex items-center gap-2 overflow-hidden">
      <StatusIcon status={step.status} />
      <span className="text-[11px] truncate font-medium">{step.agentName}</span>
    </div>
    {step.requiresHitl && step.status !== 'completed' && (
      <span className="text-[8px] border border-amber-900/50 text-amber-600 px-1 rounded">HITL</span>
    )}
  </div>
);

export default PipelineStatus;
