/**
 * Interview Session Engine: create, start, end sessions and maintain state in Redis.
 * State is the source of truth during the interview; PostgreSQL stores persistence
 * (interview row, report) for reporting and audit. Designed for thousands of
 * concurrent sessions via Redis and minimal DB writes during the session.
 */
import type { InterviewState, InterviewPhase, InterviewReport, Turn, DifficultyLevel, ScheduledCustomQuestion } from '../../types';
export interface StartInterviewInput {
    candidateId: string;
    role: 'technical' | 'behavioral' | 'sales' | 'customer_success';
    positionId?: string;
    resumeContext?: string;
    preferredDifficulty?: DifficultyLevel;
    customQuestions?: ScheduledCustomQuestion[];
    focusAreas?: string;
    durationMinutes?: number;
}
export interface StartInterviewResult {
    interviewId: string;
    state: InterviewState;
}
export declare class InterviewSessionService {
    /**
     * Create a new interview and persist to DB; create Redis session with initial state.
     * Phase starts at intro. Client can then call getState and begin the conversation.
     */
    start(input: StartInterviewInput): Promise<StartInterviewResult>;
    /**
     * Load session state from Redis. Returns null if session expired or not found.
     */
    getState(interviewId: string): Promise<InterviewState | null>;
    /**
     * Update session state in Redis (e.g. after each turn). TTL is refreshed.
     */
    setState(interviewId: string, state: InterviewState): Promise<void>;
    /**
     * Append a turn and optionally update phase/topicCoverage/difficulty.
     * Used by the conversation flow after each Q&A pair.
     */
    appendTurn(interviewId: string, turn: Turn, updates?: Partial<Pick<InterviewState, 'phase' | 'topicCoverage' | 'currentDifficulty' | 'approximateTokens'>>): Promise<InterviewState | null>;
    /**
     * End the interview: persist end time in DB, optionally store final report,
     * and clear or retain Redis state (we retain for a while for report generation).
     */
    end(interviewId: string, report?: InterviewReport): Promise<boolean>;
    /**
     * Get list of phases in order (for strategy engine).
     */
    getPhaseOrder(): InterviewPhase[];
}
export declare const interviewSessionService: InterviewSessionService;
//# sourceMappingURL=InterviewSessionService.d.ts.map