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
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
/**
 * Speech service for the voice interview loop.
 * Transcribes audio files using whisper.cpp CLI (child_process).
 */
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const logger_1 = require("../config/logger");
const child_process_2 = require("child_process");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const WHISPER_BIN = process.env.WHISPER_CPP_PATH || 'whisper';
const WHISPER_MODEL = process.env.WHISPER_MODEL_PATH || path.join(process.cwd(), 'models', 'ggml-base.en.bin');
let whisperAvailabilityChecked = false;
let whisperAvailable = true;
let whisperUnavailableWarned = false;
function ensureWhisperAvailable() {
    if (whisperAvailabilityChecked)
        return whisperAvailable;
    whisperAvailabilityChecked = true;
    try {
        const check = (0, child_process_2.spawnSync)('which', [WHISPER_BIN], { stdio: 'ignore' });
        whisperAvailable = check.status === 0;
    }
    catch {
        whisperAvailable = false;
    }
    if (!whisperAvailable && !whisperUnavailableWarned) {
        whisperUnavailableWarned = true;
        logger_1.logger.warn('Whisper binary not found; local STT is disabled', {
            whisperBin: WHISPER_BIN,
            hint: 'Install whisper.cpp CLI or set WHISPER_CPP_PATH to the executable.',
        });
    }
    return whisperAvailable;
}
/**
 * Transcribe an audio file using whisper.cpp.
 * Expects a path to a WAV (or format supported by whisper.cpp).
 * Returns the transcribed text; strips timestamps and normalizes whitespace.
 */
async function transcribeAudio(filePath) {
    if (!ensureWhisperAvailable())
        return '';
    try {
        const args = [
            '-m', WHISPER_MODEL,
            '-f', filePath,
            '-l', 'en',
            '--no-timestamps',
            '--output-txt',
        ];
        const { stdout, stderr } = await execFileAsync(WHISPER_BIN, args, {
            maxBuffer: 10 * 1024 * 1024,
            timeout: 120000,
        });
        if (stderr)
            logger_1.logger.debug('Whisper stderr', { stderr: stderr.slice(0, 200) });
        const lines = (stdout || '').split('\n');
        const text = lines
            .filter((line) => !line.startsWith('[') && line.trim())
            .join(' ')
            .trim();
        return text || '';
    }
    catch (err) {
        if (err?.code === 'ENOENT' || /ENOENT/i.test(String(err?.message ?? ''))) {
            whisperAvailable = false;
            if (!whisperUnavailableWarned) {
                whisperUnavailableWarned = true;
                logger_1.logger.warn('Whisper binary not available at runtime; local STT is disabled', {
                    whisperBin: WHISPER_BIN,
                });
            }
            return '';
        }
        logger_1.logger.error('Whisper transcription failed', { filePath, error: err.message });
        throw new Error('Transcription failed');
    }
}
//# sourceMappingURL=speech.service.js.map