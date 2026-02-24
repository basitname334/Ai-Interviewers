export declare class LLMService {
    private baseUrl;
    private model;
    private temperature;
    private maxTokens;
    /** False when Ollama has no models; we use fallback replies so the app still works. */
    private modelAvailable;
    constructor();
    /**
     * Check if Ollama is running and ensure the configured model is available.
     * If the configured model is not found, falls back to the first available model.
     * If no models are installed, modelAvailable is set false and we use fallback replies.
     */
    healthCheck(): Promise<boolean>;
    /**
     * Generate a complete response (non-streaming).
     * If no Ollama model is available, returns a fallback reply so the interview can continue.
     */
    generate(prompt: string, context?: number[]): Promise<string>;
    /**
     * Generate a streaming response (token-by-token)
     * Returns an async generator that yields tokens
     */
    generateStream(prompt: string, context?: number[]): AsyncGenerator<string, void, unknown>;
    /**
     * Generate interview question based on context
     */
    generateInterviewQuestion(category: string, difficulty: 'easy' | 'medium' | 'hard', previousAnswers: string[], context?: number[]): Promise<string>;
    /**
     * Generate follow-up question based on candidate's answer
     */
    generateFollowUpQuestion(originalQuestion: string, candidateAnswer: string, context?: number[]): Promise<string>;
    /**
     * Evaluate candidate's answer
     */
    evaluateAnswer(question: string, answer: string, context?: number[]): Promise<{
        score: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
    }>;
    /**
     * Build interview question prompt
     */
    private buildInterviewQuestionPrompt;
    /**
     * Generate interview summary
     */
    generateInterviewSummary(transcript: Array<{
        speaker: string;
        text: string;
    }>, scores: any): Promise<string>;
}
export declare const llmService: LLMService;
//# sourceMappingURL=llm.service.d.ts.map