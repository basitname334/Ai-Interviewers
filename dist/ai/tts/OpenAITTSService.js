"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAITTSService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config");
class OpenAITTSService {
    openai = null;
    constructor() {
        if (config_1.config.ai.openaiApiKey) {
            this.openai = new openai_1.default({
                apiKey: config_1.config.ai.openaiApiKey,
            });
        }
    }
    async synthesize(text) {
        if (!this.openai) {
            throw new Error('OpenAI API key missing for TTS');
        }
        try {
            const mp3 = await this.openai.audio.speech.create({
                // Higher-quality model/voice for a less robotic interviewer tone.
                model: 'tts-1-hd',
                voice: 'nova',
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        }
        catch (error) {
            console.error('OpenAI TTS Error:', error);
            throw new Error('Failed to synthesize speech');
        }
    }
}
exports.OpenAITTSService = OpenAITTSService;
//# sourceMappingURL=OpenAITTSService.js.map