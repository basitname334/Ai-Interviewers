interface QuestionScore {
    questionId: string;
    question: string;
    answer: string;
    communicationScore: number;
    technicalScore: number;
    relevanceScore: number;
    confidenceScore: number;
    structuredThinkingScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
}
interface OverallScore {
    communicationScore: number;
    technicalScore: number;
    relevanceScore: number;
    confidenceScore: number;
    structuredThinkingScore: number;
    overallScore: number;
    feedback: string;
    questionScores: QuestionScore[];
}
/**
 * Scoring Engine Service
 * Evaluates candidate responses and provides detailed feedback
 */
export declare class ScoringEngineService {
    /**
     * Score a single answer
     */
    scoreAnswer(question: string, answer: string): Promise<QuestionScore>;
    /**
     * Calculate overall interview score
     */
    calculateOverallScore(questionScores: QuestionScore[], transcript: Array<{
        speaker: string;
        text: string;
    }>): Promise<OverallScore>;
    /**
     * Evaluate communication clarity (0-100)
     */
    private evaluateCommunication;
    /**
     * Evaluate answer relevance to question (0-100)
     */
    private evaluateRelevance;
    /**
     * Evaluate confidence level (0-100)
     * Based on text-based sentiment analysis
     */
    private evaluateConfidence;
    /**
     * Evaluate structured thinking (0-100)
     */
    private evaluateStructure;
    /**
     * Calculate average of an array of numbers
     */
    private average;
}
export declare const scoringEngineService: ScoringEngineService;
export {};
//# sourceMappingURL=scoring-engine.service.d.ts.map