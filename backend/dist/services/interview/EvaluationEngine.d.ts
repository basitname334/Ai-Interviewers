/**
 * AI Evaluation Engine: score answers (relevance, structure, depth), detect red flags,
 * map answers to competencies. Returns structured JSON; used in real time per answer
 * and for final report aggregation. Bias-aware: rubric is in prompts, no demographic inference.
 */
import type { AnswerEvaluation } from '../../types';
export interface EvaluateAnswerInput {
    question: string;
    answer: string;
    competencyIds: string[];
}
export declare class EvaluationEngine {
    evaluate(input: EvaluateAnswerInput): Promise<AnswerEvaluation>;
    private parseEvaluationResponse;
}
export declare const evaluationEngine: EvaluationEngine;
//# sourceMappingURL=EvaluationEngine.d.ts.map