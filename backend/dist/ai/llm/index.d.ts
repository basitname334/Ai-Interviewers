/**
 * Single LLM provider export. Prefers Open Router when OPENROUTER_API_KEY is set (role-based interviewer);
 * otherwise uses Ollama for local LLM.
 */
import type { ILLMService } from './types';
export declare function getLLMService(): ILLMService;
export type { ILLMService, LLMMessage, LLMOptions, LLMResponse } from './types';
//# sourceMappingURL=index.d.ts.map