/**
 * AI Interviewer Orchestrator: ties together session, conversation, question
 * strategy, LLM, and evaluation. One entry point for "get next AI reply" and
 * "submit candidate answer". Ensures turn-based flow, evaluates answers, and
 * selects next question (or follow-up). Designed so the API and Socket.io
 * handlers only need to call this instead of each service separately.
 */
import type { InterviewState, InterviewReport } from '../../types';
export interface SubmitAnswerInput {
    interviewId: string;
    answerText: string;
}
export interface SubmitAnswerResult {
    success: boolean;
    state: InterviewState | null;
    nextReply?: string;
    evaluation?: {
        score: number;
        maxScore: number;
    };
    report?: InterviewReport;
}
export interface GetNextReplyInput {
    interviewId: string;
    /** Optional: force move to next phase (e.g. after wrap_up question) */
    forceNextPhase?: boolean;
}
export interface GetNextReplyResult {
    success: boolean;
    state: InterviewState | null;
    reply: string;
    questionId?: string;
    phase?: string;
}
export declare class AIInterviewerOrchestrator {
    private roleLabel;
    private withGreetingIfFirstTurn;
    /**
     * Submit candidate answer: evaluate it, append turns, decide follow-up vs next
     * question, and return next AI reply. If interview is at end, generate report.
     */
    submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult>;
    /**
     * Get the next AI reply (e.g. first greeting or after phase change). Does not
     * append a candidate turn; use this for "start interview" or when advancing phase.
     */
    getNextReply(input: GetNextReplyInput): Promise<GetNextReplyResult>;
    private getNextReplyInternal;
    /**
     * Generate report for a completed interview (e.g. from GET /report/:id).
     */
    getReport(interviewId: string): Promise<InterviewReport | null>;
}
export declare const aiInterviewerOrchestrator: AIInterviewerOrchestrator;
//# sourceMappingURL=AIInterviewerOrchestrator.d.ts.map