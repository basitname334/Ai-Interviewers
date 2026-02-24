"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTTSService = getTTSService;
class BrowserTTSService {
    async synthesize(text, options) {
        // TTS is handled on the frontend
        throw new Error('TTS is handled on the frontend using Web Speech API');
    }
}
let instance = null;
function getTTSService() {
    if (!instance) {
        instance = new BrowserTTSService();
    }
    return instance;
}
//# sourceMappingURL=index.js.map