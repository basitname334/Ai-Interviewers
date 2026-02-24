/**
 * Question Strategy Engine: role-based question selection, difficulty scaling,
 * follow-up logic, and topic coverage. Loads from question_templates (admin-added)
 * with fallback to in-memory demo bank.
 */
import type { InterviewState, InterviewPhase, InterviewRole, DifficultyLevel, QuestionTemplate } from '../../types';
export interface NextQuestionInput {
    state: InterviewState;
    requestFollowUp?: boolean;
    forceNextPhase?: boolean;
}
export interface NextQuestionResult {
    questionText: string;
    questionId: string;
    phase: InterviewPhase;
    difficulty: DifficultyLevel;
    competencyIds: string[];
    isFollowUp: boolean;
    /** When true, interviewer should show coding prompt / starter code */
    isCodingQuestion?: boolean;
    starterCode?: string | null;
    language?: string | null;
}
/** Fallback when no questions in DB. Exposed for evaluation engine. */
export declare const DEMO_QUESTIONS: QuestionTemplate[];
export declare class QuestionStrategyEngine {
    private fallbackQuestionFor;
    private getPhaseOrder;
    private nextPhase;
    /** Load questions for role/phase from DB; fallback to DEMO_QUESTIONS. */
    private getQuestionsForRoleAndPhase;
    getNextQuestion(input: NextQuestionInput): Promise<NextQuestionResult | null>;
    getCompetencyIdsForQuestionId(questionId: string, role?: InterviewRole): string[];
    getFirstQuestion(role: InterviewRole): Promise<NextQuestionResult | null>;
}
export declare const questionStrategyEngine: QuestionStrategyEngine;
//# sourceMappingURL=QuestionStrategyEngine.d.ts.map