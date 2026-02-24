"use strict";
/**
 * AI Evaluation Engine: score answers (relevance, structure, depth), detect red flags,
 * map answers to competencies. Returns structured JSON; used in real time per answer
 * and for final report aggregation. Bias-aware: rubric is in prompts, no demographic inference.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationEngine = exports.EvaluationEngine = void 0;
const llm_1 = require("../../ai/llm");
const prompts_1 = require("../../ai/prompts");
const MAX_SCORE = 10;
class EvaluationEngine {
    async evaluate(input) {
        const llm = (0, llm_1.getLLMService)();
        const system = prompts_1.SYSTEM_PROMPT_EVALUATION;
        const userContent = (0, prompts_1.buildEvaluationPrompt)(input.question, input.answer, input.competencyIds);
        const response = await llm.chat([
            { role: 'system', content: system },
            { role: 'user', content: userContent },
        ], { temperature: 0.3, maxTokens: 256 });
        const parsed = this.parseEvaluationResponse(response.content, input.competencyIds);
        return {
            ...parsed,
            normalizedScore: parsed.score / MAX_SCORE,
        };
    }
    parseEvaluationResponse(raw, competencyIds) {
        try {
            const cleaned = raw.replace(/```json?\s*/g, '').trim();
            const obj = JSON.parse(cleaned);
            const score = Math.min(MAX_SCORE, Math.max(0, Number(obj.score) ?? 0));
            const relevance = Math.min(MAX_SCORE, Math.max(0, Number(obj.relevance) ?? score));
            const structure = Math.min(MAX_SCORE, Math.max(0, Number(obj.structure) ?? score));
            const depth = Math.min(MAX_SCORE, Math.max(0, Number(obj.depth) ?? score));
            const redFlags = Array.isArray(obj.redFlags) ? obj.redFlags : [];
            const feedbackSnippet = typeof obj.feedbackSnippet === 'string' ? obj.feedbackSnippet : '';
            const compIds = Array.isArray(obj.competencyIds) ? obj.competencyIds : competencyIds;
            return {
                score,
                maxScore: MAX_SCORE,
                relevance,
                structure,
                depth,
                competencyIds: compIds,
                redFlags,
                feedbackSnippet,
            };
        }
        catch {
            return {
                score: 0,
                maxScore: MAX_SCORE,
                relevance: 0,
                structure: 0,
                depth: 0,
                competencyIds,
                redFlags: ['Could not parse evaluation'],
                feedbackSnippet: 'Evaluation unavailable.',
            };
        }
    }
}
exports.EvaluationEngine = EvaluationEngine;
exports.evaluationEngine = new EvaluationEngine();
//# sourceMappingURL=EvaluationEngine.js.map