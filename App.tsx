
import React, { useState, useRef, useEffect } from 'react';
import { AppState, SermonInput, PipelineStep, LogEntry } from './types';
import { INITIAL_STEPS, SERMON_TYPES, AUDIENCE_TYPES, LENGTH_OPTIONS } from './constants';
import { runAgent } from './services/geminiService';
import PipelineStatus from './components/PipelineStatus';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    input: {
      passage: 'Romans 8:28-30',
      theme: '하나님의 원대한 계획과 신자의 확신',
      audience: '일반 성도',
      length: '30분 (약 4,500자)',
      analysisLevel: 'deep',
      sermonType: '강해 설교'
    },
    steps: INITIAL_STEPS,
    currentStepIndex: 0,
    logs: [],
    isProcessing: false,
    hitlStage: null,
    hitlFeedback: '',
    qualityScore: 0
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, agent: string = 'System', type: LogEntry['type'] = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { timestamp: new Date().toLocaleTimeString(), agent, message, type }]
    }));
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  const updateStep = (index: number, updates: Partial<PipelineStep>) => {
    setState(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], ...updates };
      return { ...prev, steps: newSteps };
    });
  };

  const executePipeline = async (startIndex: number, feedback: string = "") => {
    if (startIndex >= state.steps.length) {
      addLog("전체 파이프라인이 성공적으로 완료되었습니다.", "Orchestrator", "success");
      const score = 4.5 + Math.random() * 0.5;
      setState(prev => ({ ...prev, isProcessing: false, qualityScore: parseFloat(score.toFixed(1)) }));
      return;
    }

    const step = state.steps[startIndex];
    
    if (startIndex === 0 && !feedback && state.hitlStage === null) {
      setState(prev => ({ ...prev, hitlStage: 'HITL-1' }));
      addLog("분석 단계 진입 전 사용자 승인이 필요합니다.", "System", "warning");
      return;
    }

    addLog(`${step.agentName} 가동 중...`, "Orchestrator", "thinking");
    updateStep(startIndex, { status: 'running', thinkingTime: 'calculating...' });

    const context = state.steps.slice(0, startIndex).map(s => `[${s.agentName}]\n${s.result}`).join('\n\n');

    try {
      const result = await runAgent(step, state.input, context, feedback);
      updateStep(startIndex, { status: 'completed', result });
      addLog(`${step.agentName} 작업 완료.`, "Orchestrator", "success");

      if (step.requiresHitl) {
        const stageMap: Record<string, string> = {
          'rhetoric-analyst': 'HITL-2',
          'message-synth': 'HITL-3',
          'outline-architect': 'HITL-4',
          'sermon-reviewer': 'HITL-5'
        };
        const nextStage = stageMap[step.id];
        setState(prev => ({ ...prev, hitlStage: nextStage, currentStepIndex: startIndex }));
        updateStep(startIndex, { status: 'waiting' });
        addLog(`중간 검토 지점(${nextStage})에 도달했습니다.`, "System", "warning");
      } else {
        const nextIdx = startIndex + 1;
        setState(prev => ({ ...prev, currentStepIndex: nextIdx }));
        setTimeout(() => executePipeline(nextIdx), 600);
      }
    } catch (err) {
      addLog(`에러 발생: ${err}`, "System", "error");
      updateStep(startIndex, { status: 'failed' });
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const startPipeline = () => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStepIndex: 0,
      logs: [],
      steps: INITIAL_STEPS.map(s => ({ ...s, status: 'pending', result: undefined })),
      qualityScore: 0
    }));
    addLog("워크플로우를 시작합니다. 세션 초기화 중...", "System");
    setTimeout(() => executePipeline(0), 1000);
  };

  const handleHitlAction = (approved: boolean) => {
    const feedback = state.hitlFeedback;
    setState(prev => ({ ...prev, hitlStage: null, hitlFeedback: '' }));
    
    if (approved) {
      addLog("사용자 승인 완료. 다음 단계로 진행합니다.", "User", "info");
      executePipeline(state.currentStepIndex + 1);
    } else {
      addLog(`수정 요청 수신: ${feedback}`, "User", "warning");
      executePipeline(state.currentStepIndex, feedback);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`파일 저장 완료: ${filename}`, "System", "success");
  };

  const downloadFullReport = () => {
    let report = `# Sermon Research Report: ${state.input.passage}\n`;
    report += `**Theme:** ${state.input.theme}\n`;
    report += `**Audience:** ${state.input.audience}\n`;
    report += `**Type:** ${state.input.sermonType}\n\n`;
    report += `--- \n\n`;

    state.steps.forEach(step => {
      if (step.result) {
        report += `## ${step.agentName} (${step.phase})\n`;
        report += `${step.result}\n\n`;
        report += `---\n\n`;
      }
    });

    handleDownload(report, `Full-Report-${state.input.passage.replace(/\s+/g, '-')}.md`);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Sermon_Manuscript_${state.input.passage.replace(/\s+/g, '_')}`;
    window.print();
    document.title = originalTitle;
    addLog("인쇄 대화상자가 실행되었습니다. 'PDF로 저장'을 선택하십시오.", "System", "info");
  };

  const finalManuscriptStep = state.steps.find(s => s.id === 'sermon-writer');
  const isFinalStepDone = finalManuscriptStep?.status === 'completed';
  const isPipelineComplete = state.steps.filter(s => s.result).length > 0 && !state.isProcessing;
  const hasStarted = state.steps.some(s => s.result !== undefined) || state.isProcessing;

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-300 flex font-sans selection:bg-sky-500/30 overflow-hidden">
      
      {/* Ancient Manuscript Background Layer - Only visible when not started or in background */}
      {!hasStarted && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20 scale-110 blur-[1px]" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507467611118-2d390ee82053?auto=format&fit=crop&q=80&w=2000')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/60 via-transparent to-[#0d1117]" />
          <div className="absolute inset-0 bg-[#0d1117]/40" />
        </div>
      )}

      {/* Left Sidebar */}
      <aside className={`w-72 border-r border-slate-800 flex flex-col bg-[#010409]/95 backdrop-blur-md z-20 no-print transition-transform duration-500 ${!hasStarted ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-amber-500 rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
            <h1 className="text-sm font-black uppercase tracking-tighter text-white">Sermon Main</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">v5.0 Agentic Workflow</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <PipelineStatus steps={state.steps} />
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800 space-y-2">
          {isPipelineComplete && (
            <button 
              onClick={downloadFullReport}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black rounded transition-all uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-500/30 shadow-lg shadow-emerald-900/20"
            >
              <span>📥 Export Full Project</span>
            </button>
          )}
          <button 
            onClick={startPipeline}
            disabled={state.isProcessing}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded transition-all active:scale-95 shadow-lg shadow-amber-900/20"
          >
            {state.isProcessing ? 'PROCESSING...' : 'RUN WORKFLOW'}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Top Header - Hidden in Landing */}
        {hasStarted && (
          <header className="h-14 border-b border-slate-800 bg-[#0d1117]/80 backdrop-blur-md flex items-center justify-between px-6 z-10 no-print">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Target Passage</span>
                <span className="text-xs font-bold text-slate-200">{state.input.passage}</span>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Theme</span>
                <span className="text-xs font-bold text-slate-200 max-w-[200px] truncate">{state.input.theme}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               {state.qualityScore > 0 && (
                 <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                   <span className="text-[9px] font-black text-emerald-500 uppercase">Quality</span>
                   <span className="text-xs font-bold text-emerald-400">{state.qualityScore} / 5.0</span>
                 </div>
               )}
               {isPipelineComplete && (
                 <button 
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-1.5 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider transition-all"
                 >
                   🖨️ PDF Save / Print
                 </button>
               )}
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-transparent print:bg-white print:text-black ${!hasStarted ? 'flex items-center justify-center p-4' : 'p-8 space-y-8'}`}>
          
          {/* Landing Experience */}
          {!hasStarted && (
            <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 no-print">
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2">
                  Divine Wisdom x Artificial Intelligence
                </div>
                <h1 className="text-5xl md:text-6xl font-serif font-black text-white leading-tight">
                  Pipeline <span className="text-amber-500">Sermon</span> Builder
                </h1>
                <p className="text-slate-400 text-lg font-light leading-relaxed">
                  에이전틱 워크플로우를 통한 깊이 있는 성경 연구와 탁월한 설교 작성을 위한 차세대 플랫폼. 15명의 전문 AI 에이전트가 본문을 다각도로 분석합니다.
                </p>
                <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase border border-slate-800 px-3 py-1.5 rounded-lg bg-slate-900/30">
                     <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                     15 Specialized Agents
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase border border-slate-800 px-3 py-1.5 rounded-lg bg-slate-900/30">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                     Deep Greek/Hebrew Analysis
                   </div>
                </div>
              </div>

              {/* Glassmorphism Card */}
              <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <h2 className="text-xl font-serif font-bold text-white mb-6 border-b border-white/5 pb-4">새로운 프로젝트 시작</h2>
                <div className="space-y-5">
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1 tracking-widest group-focus-within:text-amber-500 transition-colors">성경 본문</label>
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all text-slate-100 placeholder:text-slate-700"
                      placeholder="예: 시편 23:1-6"
                      value={state.input.passage}
                      onChange={e => setState(p => ({ ...p, input: { ...p.input, passage: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1 tracking-widest">설교 주제</label>
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all text-slate-100"
                      value={state.input.theme}
                      onChange={e => setState(p => ({ ...p, input: { ...p.input, theme: e.target.value } }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1 tracking-widest">분석 수준</label>
                       <select 
                         className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500/50 text-slate-200"
                         value={state.input.analysisLevel}
                         onChange={e => setState(p => ({ ...p, input: { ...p.input, analysisLevel: e.target.value as any } }))}
                       >
                         <option value="standard">Standard</option>
                         <option value="deep">Deep Analysis</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 ml-1 tracking-widest">설교 유형</label>
                       <select 
                         className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500/50 text-slate-200"
                         value={state.input.sermonType}
                         onChange={e => setState(p => ({ ...p, input: { ...p.input, sermonType: e.target.value } }))}
                       >
                         {SERMON_TYPES.map(t => <option key={t}>{t}</option>)}
                       </select>
                     </div>
                  </div>
                  <button 
                    onClick={startPipeline}
                    className="w-full py-4 mt-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black text-sm rounded-xl transition-all shadow-xl shadow-amber-900/30 active:scale-[0.98] uppercase tracking-widest"
                  >
                    워크플로우 시작하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Running State: Results Display */}
          {hasStarted && (
            <div className="max-w-4xl mx-auto space-y-12 pb-32">
              {state.steps.filter(s => s.result).map((step) => (
                <article key={step.id} className={`group relative animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:border-none print:shadow-none ${step.id !== 'sermon-writer' && 'print:hidden'}`}>
                  <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/50 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity no-print"></div>
                  <header className="mb-4 flex items-center justify-between no-print">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">{step.phase}</span>
                      <h3 className="text-lg font-serif font-bold text-white">{step.agentName}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {step.status === 'completed' && (
                        <button 
                          onClick={() => handleDownload(step.result!, `${step.id}-${state.input.passage.replace(/\s+/g, '-')}.md`)}
                          className="text-[10px] font-bold px-2 py-1 bg-slate-800/50 hover:bg-slate-700 text-slate-400 border border-slate-700/50 rounded transition-colors flex items-center gap-1.5"
                          title="이 부분 저장"
                        >
                          📥 <span className="hidden sm:inline">저장</span>
                        </button>
                      )}
                    </div>
                  </header>
                  <div className="bg-[#161b22]/40 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl print:bg-white print:p-0 print:border-none print:text-black">
                    <div className="prose prose-invert prose-amber max-w-none text-slate-300 leading-relaxed font-light print:text-black print:prose-black">
                      <div dangerouslySetInnerHTML={{ __html: step.result?.replace(/\n/g, '<br/>') || '' }} />
                    </div>
                  </div>
                </article>
              ))}

              {/* FINAL COMPLETION CARD */}
              {isFinalStepDone && (
                <div className="mt-16 p-12 bg-gradient-to-br from-amber-600/10 to-transparent border border-amber-500/30 rounded-[3rem] shadow-2xl no-print animate-in zoom-in duration-700">
                   <div className="flex flex-col items-center text-center space-y-8">
                      <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="max-w-md">
                        <h2 className="text-3xl font-serif font-black text-white mb-3 tracking-tight">여정이 마무리되었습니다</h2>
                        <p className="text-slate-400 text-base">모든 연구 에이전트가 본문을 깊이 있게 분석하고 작성을 완료했습니다. 영감 있는 설교가 되기를 소망합니다.</p>
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl pt-4">
                        <button 
                          onClick={handlePrint}
                          className="w-full py-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-2xl flex flex-col items-center gap-1 transition-all hover:-translate-y-1 shadow-2xl shadow-amber-900/40 active:scale-95"
                        >
                          <span className="text-3xl mb-1">🖨️</span>
                          <span className="text-base font-black uppercase tracking-widest">PDF로 저장 / 인쇄하기</span>
                          <span className="text-xs opacity-70">가장 추천하는 최종 보관 방식</span>
                        </button>

                        <div className="grid grid-cols-2 gap-4 w-full">
                          <button 
                            onClick={() => handleDownload(finalManuscriptStep.result!, `Sermon-Manuscript-${state.input.passage}.md`)}
                            className="py-5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl flex flex-col items-center gap-1 transition-all border border-white/10 backdrop-blur-md"
                          >
                            <span className="text-2xl">📄</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">원고 마크다운 저장</span>
                          </button>

                          <button 
                            onClick={downloadFullReport}
                            className="py-5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl flex flex-col items-center gap-1 transition-all border border-white/10 backdrop-blur-md"
                          >
                            <span className="text-2xl">📚</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">연구 리포트 저장</span>
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Execution Log - Minimize in Landing */}
        {hasStarted && (
          <div className="h-56 bg-[#010409]/95 backdrop-blur-md border-t border-slate-800 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar no-print">
            <div className="flex items-center justify-between mb-3 text-slate-500 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-widest text-[9px]">Pipeline Intelligence Stream</span>
              <span>Gemini-3-Flash Engine Active</span>
            </div>
            <div className="space-y-1">
              {state.logs.map((log, i) => (
                <div key={i} className="flex gap-3 leading-tight animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 w-24 truncate ${
                    log.type === 'error' ? 'text-rose-500' : 
                    log.type === 'success' ? 'text-emerald-500' : 
                    log.type === 'warning' ? 'text-amber-500' : 
                    log.type === 'tool' ? 'text-slate-500 italic' :
                    'text-amber-500'
                  }`}>{log.agent}</span>
                  <span className={`${log.type === 'tool' ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                    {log.type === 'tool' && '↳ '}
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
            <div ref={logEndRef} />
          </div>
        )}

        {/* HITL UI Overlay */}
        {state.hitlStage && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-[#010409]/80 backdrop-blur-xl animate-in fade-in duration-300 no-print">
            <div className="w-full max-w-xl bg-[#1c2128] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10">
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-1.112-2.04l-.054-.09m1.212-15.637l.054.09c.133.232.251.474.355.722M12 3c1.88 0 3.619.518 5.112 1.414m-.404 14.173a10.003 10.003 0 01-1.212 1.563l-.054.09m1.266-15.826A10.014 10.014 0 0121 12c0 1.278-.239 2.5-.675 3.623m-1.554 4.815l-.054.09A10.003 10.003 0 0112 21" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">인간 개입 지점 (HITL)</h2>
                    <p className="text-[11px] text-white/80 font-bold">{state.hitlStage}: {state.steps[state.currentStepIndex]?.agentName || 'Workflow Start'}</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-white/50 bg-black/30 px-3 py-1.5 rounded-full border border-white/10 tracking-[0.2em]">WAITING</div>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed italic font-serif">
                  "{state.hitlStage === 'HITL-1' ? '심층 분석 모드를 가동하기 전 마지막으로 설정을 검토하십시오. 이 시점부터 15명의 에이전트가 독립적인 연구를 시작합니다.' : '에이전트의 중간 분석 결과를 검토해주십시오. 다음 단계의 방향성을 위해 추가 피드백을 주셔도 좋습니다.'}"
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ml-1">에이전트 지시사항 (선택)</label>
                  <textarea 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm h-32 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-slate-200 placeholder:text-slate-700"
                    placeholder="예: 특정 구절에 더 집중해줘, 도입부를 좀 더 부드럽게 바꿔줘 등..."
                    value={state.hitlFeedback}
                    onChange={e => setState(p => ({ ...p, hitlFeedback: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleHitlAction(false)}
                    className="flex-1 py-4 border border-white/10 hover:bg-white/5 rounded-2xl text-xs font-black text-slate-400 transition-all uppercase tracking-widest active:scale-95"
                  >
                    보완 요청
                  </button>
                  <button 
                    onClick={() => handleHitlAction(true)}
                    className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-amber-900/30 uppercase tracking-widest active:scale-95"
                  >
                    승인 및 진행
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global CSS with Enhanced Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;700;900&display=swap');

        :root {
          font-family: 'Inter', sans-serif;
        }

        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @media print {
          @page { margin: 2.5cm; size: A4 portrait; }
          .no-print, header, aside, .h-56, .absolute:not(.hidden) { display: none !important; }
          body, html { background: white !important; color: black !important; overflow: visible !important; height: auto !important; }
          #root { background: white !important; }
          main { display: block !important; overflow: visible !important; height: auto !important; width: 100% !important; padding: 0 !important; margin: 0 !important; background: white !important; }
          .flex-1 { overflow: visible !important; height: auto !important; padding: 0 !important; }
          article { page-break-after: auto; margin: 0 !important; padding: 0 !important; background: white !important; border: none !important; box-shadow: none !important; }
          .prose { color: black !important; font-size: 13pt !important; line-height: 1.7 !important; max-width: none !important; font-family: serif !important; }
          .prose-invert { color: black !important; }
          .prose h1, .prose h2, .prose h3 { color: black !important; margin-top: 1.5em !important; border-bottom: 1px solid #ddd !important; padding-bottom: 0.3em !important; page-break-after: avoid; }
        }
      `}} />
    </div>
  );
};

export default App;
