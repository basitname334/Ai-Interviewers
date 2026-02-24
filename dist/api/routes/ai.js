"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const tts_1 = require("../../ai/tts");
const stt_1 = require("../../ai/stt");
const express_validator_1 = require("express-validator");
const validate_1 = require("../middleware/validate");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)();
/** POST /ai/tts - Generate speech from text */
router.post('/tts', (0, validate_1.validate)([
    (0, express_validator_1.body)('text').isString().notEmpty().withMessage('Text is required'),
]), async (req, res) => {
    try {
        const { text } = req.body;
        const tts = (0, tts_1.getTTSService)();
        const audioBuffer = await tts.synthesize(text);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
        });
        res.send(audioBuffer);
    }
    catch (e) {
        console.error('TTS Route Error:', e);
        if (e.code === 'insufficient_quota') {
            return res.status(429).json({ error: 'OpenAI quota exceeded' });
        }
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});
/** POST /ai/stt - Transcribe speech from audio file */
router.post('/stt', upload.single('audio'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Audio file is required' });
        }
        const stt = (0, stt_1.getSTTService)();
        const text = await stt.transcribe(file.buffer);
        res.json({ text });
    }
    catch (e) {
        console.error('STT Route Error:', e);
        const message = String(e?.message ?? '');
        const backendUnavailable = /whisper/i.test(message) ||
            /transcription failed/i.test(message) ||
            /enoent/i.test(message);
        if (backendUnavailable) {
            // Fail-soft so frontend can continue with browser STT fallback
            return res.json({
                text: '',
                warning: 'Local STT backend unavailable; using fallback',
            });
        }
        res.status(500).json({ error: 'Failed to transcribe audio' });
    }
});
exports.aiRoutes = router;
//# sourceMappingURL=ai.js.map