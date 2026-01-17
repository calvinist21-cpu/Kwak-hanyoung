
import { GoogleGenAI } from "@google/genai";
import { SermonInput, PipelineStep } from "../types";

// Always use new GoogleGenAI({apiKey: process.env.API_KEY}); directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function runAgent(
  step: PipelineStep, 
  sermonInput: SermonInput, 
  previousResults: string,
  feedback: string = ""
): Promise<string> {
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstructions: Record<string, string> = {
    'Original Text Analyst': "당신은 헬라어와 히브리어 원문 분석 전문가입니다. 본문의 핵심 단어의 어원, 시제, 문법적 구조를 깊이 있게 분석하십시오.",
    'Manuscript Comparator': "당신은 성경 사본학자입니다. 다양한 역본(NIV, NASB, ESV, 개역개정 등)의 차이를 분석하고 신학적 뉘앙스를 추출하십시오.",
    'Biblical Geography Expert': "당신은 성경 지리학자입니다. 사건의 장소, 지형적 특성, 도시 구조가 메시지에 주는 의미를 분석하십시오.",
    'Historical-Cultural Expert': "당신은 성경 역사문화 전문가입니다. 당시의 사회적 관습, 정치적 상황, 종교적 배경을 설명하십시오.",
    'Structure Analyst': "당신은 문장 구조 및 논리 분석 전문가입니다. 본문의 논리적 흐름을 파악하고 단락을 구분하십시오.",
    'Theological Analyst': "당신은 조직신학자입니다. 본문이 계시하는 하나님의 성품과 구속사적 의미를 분석하십시오.",
    'Rhetorical Analyst': "당신은 수사학 전문가입니다. 본문의 설득 전략, 강조점, 청중에게 주는 수사학적 임팩트를 분석하십시오.",
    'Core Message Architect': "당신은 설교 전략가입니다. 연구 결과를 종합하여 하나의 핵심 메시지(Big Idea)와 실천적 적용점을 도출하십시오.",
    'Outline Designer': "당신은 설교 구성 전문가입니다. 도입-전개-결론의 완벽한 밸런스를 갖춘 아웃라인을 설계하십시오.",
    'Sermon Script Writer': "당신은 탁월한 설교 문장가입니다. 정해진 스타일과 대상에 맞춰 감동적이고 논리적인 설교 전문을 작성하십시오.",
    'Sermon Reviewer': "당신은 설교 비평가입니다. 작성된 원고의 신학적 건전성, 문학적 완성도, 적용의 적절성을 평가하고 5점 만점으로 점수를 매기십시오."
  };

  const prompt = `
    수행 과제: ${step.agentName} - ${step.description}
    
    설교 설정:
    - 본문: ${sermonInput.passage}
    - 주제: ${sermonInput.theme}
    - 대상: ${sermonInput.audience}
    - 유형: ${sermonInput.sermonType}
    - 수준: ${sermonInput.analysisLevel}
    
    이전 단계 연구 데이터:
    ${previousResults}
    
    ${feedback ? `사용자 추가 요청 사항: ${feedback}` : ""}
    
    결과물을 마크다운 형식으로 상세히 작성하십시오. 전문적이고 학술적인 톤을 유지하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstructions[step.agentName] || "당신은 파이프라인 설교 빌더의 전문 AI 에이전트입니다.",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    // Access the .text property directly, do not call it as a method.
    return response.text || "결과를 생성하지 못했습니다.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error(`에이전트 ${step.agentName} 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}
