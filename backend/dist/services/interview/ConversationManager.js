"use strict";
/**
 * Conversation Manager: stores full Q&A history, summarizes older context when
 * token limit approaches, and enforces turn-based flow. All context passed to
 * the LLM goes through this so we stay within token budgets at scale.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationManager = exports.ConversationManager = void 0;
const uuid_1 = require("uuid");
const config_1 = require("../../config");
const CHARS_PER_TOKEN_ESTIMATE = 4;
const MAX_TOKENS = config_1.config.ai.maxContextTokens;
const SUMMARIZE_THRESHOLD = Math.floor(MAX_TOKENS * 0.75);
class ConversationManager {
    /**
     * Estimate token count from string length (conservative).
     */
    estimateTokens(text) {
        return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
    }
    /**
     * Build context for the next LLM call: recent turns + optional summary of older.
     * When approximateTokens from state exceeds SUMMARIZE_THRESHOLD, we would
     * call a summarizer and set priorSummary; here we stub that and just trim
     * to last N turns to stay under budget.
     */
    buildContext(state) {
        const turns = state.turns;
        let totalTokens = state.approximateTokens || 0;
        const messages = [];
        let priorSummary;
        if (totalTokens > SUMMARIZE_THRESHOLD && turns.length > 10) {
            priorSummary = 'Earlier in the interview, the candidate answered several questions. The following is a brief summary: [Summarization would be inserted here by a background job or inline summarizer].';
            totalTokens = this.estimateTokens(priorSummary);
            const recentTurns = turns.slice(-12);
            for (const t of recentTurns) {
                const role = t.role === 'ai' ? 'assistant' : 'user';
                messages.push({ role, content: t.content });
                totalTokens += this.estimateTokens(t.content);
            }
        }
        else {
            for (const t of turns) {
                const role = t.role === 'ai' ? 'assistant' : 'user';
                messages.push({ role, content: t.content });
                totalTokens += this.estimateTokens(t.content);
            }
        }
        return { messages, priorSummary, approximateTokens: totalTokens };
    }
    /**
     * Create a new turn object. Used by the interviewer flow when recording Q&A.
     */
    createTurn(role, content, meta) {
        return {
            id: (0, uuid_1.v4)(),
            role,
            content,
            timestamp: new Date().toISOString(),
            questionId: meta?.questionId,
            evaluation: meta?.evaluation,
            codingStarterCode: meta?.codingStarterCode,
            codingLanguage: meta?.codingLanguage,
            isCodingQuestion: meta?.isCodingQuestion,
        };
    }
    /**
     * Enforce turn order: next speaker must be the opposite of last turn.
     * Returns true if it's the candidate's turn (to speak), false if AI's.
     */
    nextSpeaker(turns) {
        if (turns.length === 0)
            return 'ai';
        const last = turns[turns.length - 1];
        return last.role === 'ai' ? 'candidate' : 'ai';
    }
    /**
     * Check if the last turn was from the candidate (so we can evaluate and then ask next question).
     */
    lastTurnWasCandidate(turns) {
        return turns.length > 0 && turns[turns.length - 1].role === 'candidate';
    }
}
exports.ConversationManager = ConversationManager;
exports.conversationManager = new ConversationManager();
//# sourceMappingURL=ConversationManager.js.map