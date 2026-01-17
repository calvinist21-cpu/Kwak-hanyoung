
export type Phase = 'Research' | 'Planning' | 'Implementation' | 'Review';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting';

export interface SermonInput {
  passage: string;
  theme: string;
  audience: string;
  length: string;
  analysisLevel: 'standard' | 'deep';
  sermonType: string;
}

export interface PipelineStep {
  id: string;
  phase: Phase;
  wave?: number;
  agentName: string;
  description: string;
  requiresHitl: boolean;
  status: StepStatus;
  result?: string;
  toolsUsed?: string[];
  thinkingTime?: string;
}

export interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'tool' | 'thinking';
}

export interface AppState {
  input: SermonInput;
  steps: PipelineStep[];
  currentStepIndex: number;
  logs: LogEntry[];
  isProcessing: boolean;
  hitlStage: string | null;
  hitlFeedback: string;
  qualityScore: number;
}
