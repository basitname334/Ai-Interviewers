"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAILLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config");
class OpenAILLMService {
    openai = null;
    constructor() {
        if (config_1.config.ai.openaiApiKey) {
            this.openai = new openai_1.default({
                apiKey: config_1.config.ai.openaiApiKey,
            });
        }
    }
    async chat(messages, options) {
        const temperature = options?.temperature ?? config_1.config.ai.defaultTemperature;
        const model = 'gpt-4o'; // High quality default
        if (!this.openai) {
            return this.stubResponse(messages, temperature);
        }
        try {
            const completion = await this.openai.chat.completions.create({
                model,
                messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature,
                max_tokens: options?.maxTokens ?? 1024,
                response_format: { type: 'json_object' }, // Ensure structured output
            });
            const content = completion.choices[0]?.message?.content ?? '';
            return {
                content,
                usage: {
                    promptTokens: completion.usage?.prompt_tokens ?? 0,
                    completionTokens: completion.usage?.completion_tokens ?? 0,
                },
            };
        }
        catch (error) {
            console.error('OpenAI LLM Error:', error);
            return this.stubResponse(messages, temperature);
        }
    }
    stubResponse(messages, temperature) {
        return {
            content: JSON.stringify({
                reply: 'Thank you for that. Could you elaborate a bit more on your experience in that situation?',
                intent: 'follow_up',
                suggestedNextPhase: null,
            }),
            usage: { promptTokens: 100, completionTokens: 30 },
        };
    }
}
exports.OpenAILLMService = OpenAILLMService;
//# sourceMappingURL=OpenAILLMService.js.map