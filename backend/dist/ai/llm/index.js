"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMService = getLLMService;
const config_1 = require("../../config");
const llm_service_1 = require("../../services/llm.service");
const OpenRouterLLMService_1 = require("./OpenRouterLLMService");
// Wrapper to match the existing interface when using Ollama
class OllamaLLMServiceWrapper {
    async chat(messages, options) {
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const response = await llm_service_1.llmService.generate(prompt);
        return { content: response };
    }
}
let instance = null;
function getLLMService() {
    if (!instance) {
        if (config_1.config.ai.openRouterApiKey) {
            instance = new OpenRouterLLMService_1.OpenRouterLLMService();
        }
        else {
            instance = new OllamaLLMServiceWrapper();
        }
    }
    return instance;
}
//# sourceMappingURL=index.js.map