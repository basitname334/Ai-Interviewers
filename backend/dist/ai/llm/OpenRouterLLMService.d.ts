import type { ILLMService, LLMMessage, LLMOptions, LLMResponse } from './types';
/**
 * LLM service using Open Router (https://openrouter.ai).
 * OpenAI-compatible API; used for role-based interviewer questions when OPENROUTER_API_KEY is set.
 */
export declare class OpenRouterLLMService implements ILLMService {
    private client;
    private authErrorLogged;
    private requestErrorLogged;
    private timeoutErrorLogged;
    constructor();
    private fallbackResponse;
    chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}
//# sourceMappingURL=OpenRouterLLMService.d.ts.map