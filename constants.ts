
import { PipelineStep } from './types';

export const INITIAL_STEPS: PipelineStep[] = [
  // --- RESEARCH PHASE ---
  // Wave 1: Foundation
  { id: 'original-text', phase: 'Research', wave: 1, agentName: 'Original Text Analyst', description: '원문 어휘 및 문법/구문 분석', requiresHitl: false, status: 'pending' },
  { id: 'manuscript-comp', phase: 'Research', wave: 1, agentName: 'Manuscript Comparator', description: '사본/번역본 비교 및 차이 분석', requiresHitl: false, status: 'pending' },
  { id: 'biblical-geo', phase: 'Research', wave: 1, agentName: 'Biblical Geography Expert', description: '성경 지리 및 도시 구조 분석', requiresHitl: false, status: 'pending' },
  { id: 'hist-cultural', phase: 'Research', wave: 1, agentName: 'Historical-Cultural Expert', description: '역사/문화적 배경 및 시대적 배경', requiresHitl: false, status: 'pending' },
  
  // Wave 2: Deep Structure
  { id: 'struct-analyst', phase: 'Research', wave: 2, agentName: 'Structure Analyst', description: '문단 구분 및 논증 흐름 분석', requiresHitl: false, status: 'pending' },
  { id: 'parallel-passage', phase: 'Research', wave: 2, agentName: 'Parallel Passage Analyst', description: '병행 구절 및 상호 텍스트성 분석', requiresHitl: false, status: 'pending' },
  { id: 'keyword-expert', phase: 'Research', wave: 2, agentName: 'Keyword Expert', description: '핵심 용어 연구 및 신학적 활용', requiresHitl: false, status: 'pending' },

  // Wave 3: Theological Integration
  { id: 'theo-analyst', phase: 'Research', wave: 3, agentName: 'Theological Analyst', description: '신학적 주제 및 그리스도 중심적 분석', requiresHitl: false, status: 'pending' },
  { id: 'literary-analyst', phase: 'Research', wave: 3, agentName: 'Literary Analyst', description: '장르 분석 및 문학적 장치 연구', requiresHitl: false, status: 'pending' },
  { id: 'hist-context', phase: 'Research', wave: 3, agentName: 'Historical Context Analyst', description: '역사적 맥락 및 정경적 맥락 분석', requiresHitl: false, status: 'pending' },

  // Wave 4: Synthesis
  { id: 'rhetoric-analyst', phase: 'Research', wave: 4, agentName: 'Rhetorical Analyst', description: '수사학적 분석 및 설득 전략 연구', requiresHitl: true, status: 'pending' }, // HITL-2

  // --- PLANNING PHASE ---
  { id: 'message-synth', phase: 'Planning', agentName: 'Core Message Architect', description: '핵심 메시지(Big Idea) 및 대지 도출', requiresHitl: true, status: 'pending' }, // HITL-3
  { id: 'outline-architect', phase: 'Planning', agentName: 'Outline Designer', description: '설교 아웃라인 및 흐름 설계', requiresHitl: true, status: 'pending' }, // HITL-4

  // --- IMPLEMENTATION PHASE ---
  { id: 'sermon-writer', phase: 'Implementation', agentName: 'Sermon Script Writer', description: '전문 원고 작성 및 스타일 적용', requiresHitl: false, status: 'pending' },
  { id: 'sermon-reviewer', phase: 'Implementation', agentName: 'Sermon Reviewer', description: '최종 검토 및 품질 평가', requiresHitl: true, status: 'pending' } // HITL-5
];

export const SERMON_TYPES = ['강해 설교', '주제 설교', '적용 설교', '심층 연구'];
export const AUDIENCE_TYPES = ['일반 성도', '새신자/구도자', '신학생/사역자', '청년/학생'];
export const LENGTH_OPTIONS = ['20분 (약 3,000자)', '30분 (약 4,500자)', '40분 (약 6,000자)'];
