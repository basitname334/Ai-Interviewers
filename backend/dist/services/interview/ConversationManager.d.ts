/**
 * Conversation Manager: stores full Q&A history, summarizes older context when
 * token limit approaches, and enforces turn-based flow. All context passed to
 * the LLM goes through this so we stay within token budgets at scale.
 */
import type { InterviewState, Turn } from '../../types';
export interface ConversationContext {
    /** Recent turns (and optionally a summary of older turns) for the LLM */
    messages: {
        role: 'assistant' | 'user';
        content: string;
    }[];
    /** If set, prepend this to system/context so model knows what was summarized */
    priorSummary?: string;
    approximateTokens: number;
}
export declare class ConversationManager {
    /**
     * Estimate token count from string length (conservative).
     */
    estimateTokens(text: string): number;
    /**
     * Build context for the next LLM call: recent turns + optional summary of older.
     * When approximateTokens from state exceeds SUMMARIZE_THRESHOLD, we would
     * call a summarizer and set priorSummary; here we stub that and just trim
     * to last N turns to stay under budget.
     */
    buildContext(state: InterviewState): ConversationContext;
    /**
     * Create a new turn object. Used by the interviewer flow when recording Q&A.
     */
    createTurn(role: 'ai' | 'candidate', content: string, meta?: {
        questionId?: string;
        evaluation?: Turn['evaluation'];
        codingStarterCode?: string | null;
        codingLanguage?: string | null;
        isCodingQuestion?: boolean;
    }): Turn;
    /**
     * Enforce turn order: next speaker must be the opposite of last turn.
     * Returns true if it's the candidate's turn (to speak), false if AI's.
     */
    nextSpeaker(turns: Turn[]): 'ai' | 'candidate';
    /**
     * Check if the last turn was from the candidate (so we can evaluate and then ask next question).
     */
    lastTurnWasCandidate(turns: Turn[]): boolean;
}
export declare const conversationManager: ConversationManager;
//# sourceMappingURL=ConversationManager.d.ts.map