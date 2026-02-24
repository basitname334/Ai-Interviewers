import type { ILLMService, LLMMessage, LLMOptions, LLMResponse } from './types';
export declare class OpenAILLMService implements ILLMService {
    private openai;
    constructor();
    chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
    private stubResponse;
}
//# sourceMappingURL=OpenAILLMService.d.ts.map