interface Question {
    id: string;
    text: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    askedAt: Date;
}
interface Answer {
    questionId: string;
    text: string;
    answeredAt: Date;
    duration: number;
}
interface InterviewSession {
    id: string;
    category: string;
    currentQuestion: Question | null;
    questions: Question[];
    answers: Answer[];
    startedAt: Date;
    endedAt?: Date;
    status: 'active' | 'completed' | 'timeout';
    context?: number[];
}
/**
 * Interview Engine Service
 * Manages interview flow, question progression, and session state
 */
export declare class InterviewEngineService {
    private sessions;
    private minQuestions;
    private maxQuestions;
    private maxDuration;
    private maxSilence;
    constructor();
    /**
     * Start a new interview session
     */
    startInterview(sessionId: string, category?: string): Promise<{
        greeting: string;
        firstQuestion: string;
    }>;
    /**
     * Get next question based on interview progression
     */
    getNextQuestion(sessionId: string, forceDifficulty?: 'easy' | 'medium' | 'hard'): Promise<string>;
    /**
     * Process candidate's answer
     */
    processAnswer(sessionId: string, answerText: string, duration: number): Promise<{
        feedback?: string;
        nextQuestion?: string;
        followUp?: string;
        shouldEnd: boolean;
    }>;
    /**
     * Handle silence timeout
     */
    handleSilenceTimeout(sessionId: string): void;
    /**
     * Get interview session
     */
    getSession(sessionId: string): InterviewSession | undefined;
    /**
     * End interview manually
     */
    endInterview(sessionId: string): Promise<string>;
    /**
     * Determine difficulty based on progression
     */
    private determineDifficulty;
    /**
     * Decide if we should ask a follow-up question
     */
    private shouldAskFollowUp;
    /**
     * Check if interview should end
     */
    private shouldEndInterview;
    /**
     * Generate greeting message
     */
    private generateGreeting;
    /**
     * Generate final feedback
     */
    private generateFinalFeedback;
    /**
     * Cleanup old sessions
     */
    cleanupOldSessions(maxAge?: number): void;
}
export declare const interviewEngineService: InterviewEngineService;
export {};
//# sourceMappingURL=interview-engine.service.d.ts.map