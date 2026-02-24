"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceLoopRoutes = void 0;
/**
 * Voice interview loop: start → AI question → user speaks → transcribe → next question → loop.
 * Uses getLLMService() (Open Router when OPENROUTER_API_KEY set, else Ollama) for role-based questions;
 * whisper.cpp for transcription.
 */
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const llm_1 = require("../../ai/llm");
const speech_service_1 = require("../../services/speech.service");
const stt_service_1 = require("../../services/stt.service");
const logger_1 = require("../../config/logger");
const router = (0, express_1.Router)();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /audio\/(wav|webm|ogg|mpeg|mp4|x-wav)/i.test(file.mimetype) || file.mimetype === 'application/octet-stream';
        if (allowed)
            cb(null, true);
        else
            cb(new Error('Invalid file type'));
    },
});
function firstQuestionMessages(role) {
    const roleContext = role ? ` The interview is for the role: ${role}.` : '';
    return [
        {
            role: 'system',
            content: `You are a professional AI interviewer. Generate exactly one short opening interview question to ask the candidate. Ask about their background or why they are interested in the role.${roleContext} Reply with only the question text, no preamble or quotes.`,
        },
        { role: 'user', content: 'Generate the first interview question.' },
    ];
}
function roleLabel(role) {
    if (!role)
        return 'interview';
    return role.replace(/_/g, ' ');
}
function nextQuestionMessages(previousAnswer, role) {
    const roleContext = role ? ` The interview is for the role: ${role}.` : '';
    return [
        {
            role: 'system',
            content: `You are a professional AI interviewer. The candidate just gave an answer. Generate exactly one follow-up or next interview question. Keep it concise and relevant.${roleContext} Reply with only the question text, no preamble or quotes.`,
        },
        {
            role: 'user',
            content: `The candidate said: "${previousAnswer}"\n\nGenerate the next interview question.`,
        },
    ];
}
/** POST /voice-loop/start-interview – get first question (optionally by role) */
router.post('/start-interview', async (req, res) => {
    try {
        const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
        const llm = (0, llm_1.getLLMService)();
        const out = await llm.chat(firstQuestionMessages(role));
        const question = (out.content || '').replace(/^["']|["']$/g, '').trim() || 'Tell me a bit about your background and what drew you to this role.';
        const greeting = `Hello! Welcome to this ${roleLabel(role)} interview.`;
        res.json({ question: `${greeting} ${question}`.trim() });
    }
    catch (e) {
        logger_1.logger.error('Voice loop start-interview failed', { error: e });
        res.status(500).json({ error: 'Failed to generate first question' });
    }
});
/** POST /voice-loop/transcribe – upload audio, run whisper.cpp, return transcript */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    let tempPath = null;
    try {
        const file = req.file;
        if (!file || !file.buffer?.length) {
            return res.status(400).json({ error: 'Audio file is required' });
        }
        const ext = (file.originalname && path.extname(file.originalname)) || '.wav';
        tempPath = path.join(os.tmpdir(), `voice_${Date.now()}${ext}`);
        fs.writeFileSync(tempPath, file.buffer);
        let transcript;
        try {
            transcript = await (0, speech_service_1.transcribeAudio)(tempPath);
        }
        catch {
            transcript = await stt_service_1.sttService.transcribeFile(tempPath);
        }
        res.json({ transcript: transcript || '' });
    }
    catch (e) {
        logger_1.logger.error('Voice loop transcribe failed', { error: e });
        res.status(500).json({ error: 'Transcription failed' });
    }
    finally {
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            }
            catch (_) { }
        }
    }
});
/** POST /voice-loop/next-question – send candidate answer, return next question (optionally by role) */
router.post('/next-question', async (req, res) => {
    try {
        const answer = typeof req.body?.answer === 'string' ? req.body.answer : '';
        const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
        const llm = (0, llm_1.getLLMService)();
        const out = await llm.chat(nextQuestionMessages(answer || '(No answer captured)', role));
        const question = (out.content || '').replace(/^["']|["']$/g, '').trim() || 'Could you tell me more?';
        res.json({ question });
    }
    catch (e) {
        logger_1.logger.error('Voice loop next-question failed', { error: e });
        res.status(500).json({ error: 'Failed to generate next question' });
    }
});
exports.voiceLoopRoutes = router;
//# sourceMappingURL=voiceLoop.routes.js.map