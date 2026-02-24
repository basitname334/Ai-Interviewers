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
exports.sttService = exports.STTService = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const logger_1 = require("../config/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Speech-to-Text Service using Whisper
 * Supports real-time streaming transcription
 */
class STTService extends events_1.EventEmitter {
    whisperProcess = null;
    model;
    language;
    device;
    isProcessing = false;
    audioBuffer = [];
    tempAudioFile;
    constructor() {
        super();
        this.model = process.env.WHISPER_MODEL || 'base.en';
        this.language = process.env.WHISPER_LANGUAGE || 'en';
        this.device = process.env.WHISPER_DEVICE || 'cpu';
        this.tempAudioFile = path.join('/tmp', `whisper_${Date.now()}.wav`);
    }
    /**
     * Initialize Whisper process
     */
    async initialize() {
        try {
            // Check if whisper.cpp is available
            // For now, we'll use a simpler approach with node-whisper or direct API calls
            logger_1.logger.info('STT Service initialized', {
                model: this.model,
                language: this.language,
                device: this.device,
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize STT service', { error });
            return false;
        }
    }
    /**
     * Transcribe audio buffer (streaming mode)
     * This processes audio chunks in real-time
     */
    async transcribeStream(audioChunk) {
        try {
            this.audioBuffer.push(audioChunk);
            // Only process if we have enough audio (e.g., 1 second worth)
            const totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
            // Assuming 16kHz, 16-bit, mono: 1 second = 32000 bytes
            const minBufferSize = 32000; // 1 second of audio
            if (totalSize < minBufferSize) {
                return null; // Not enough audio yet
            }
            // Combine buffers
            const combinedBuffer = Buffer.concat(this.audioBuffer);
            this.audioBuffer = []; // Clear buffer
            // Write to temporary WAV file
            await this.writeWavFile(combinedBuffer);
            // Transcribe using Whisper
            const text = await this.transcribeFile(this.tempAudioFile);
            return {
                text,
                confidence: 0.9, // Whisper doesn't provide confidence scores
                isFinal: false,
            };
        }
        catch (error) {
            logger_1.logger.error('Stream transcription failed', { error });
            return null;
        }
    }
    /**
     * Transcribe a complete audio file
     */
    async transcribeFile(filePath) {
        return new Promise((resolve, reject) => {
            try {
                // Using whisper.cpp command line
                // Adjust the path to your whisper.cpp installation
                const whisperPath = process.env.WHISPER_CPP_PATH || 'whisper';
                const modelPath = process.env.WHISPER_MODEL_PATH || `./models/ggml-${this.model}.bin`;
                const args = [
                    '-m', modelPath,
                    '-f', filePath,
                    '-l', this.language,
                    '--no-timestamps',
                    '--output-txt',
                ];
                const whisper = (0, child_process_1.spawn)(whisperPath, args);
                let output = '';
                let errorOutput = '';
                whisper.stdout.on('data', (data) => {
                    output += data.toString();
                });
                whisper.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                whisper.on('close', (code) => {
                    if (code === 0) {
                        // Extract transcription from output
                        const lines = output.split('\n');
                        const transcription = lines
                            .filter(line => !line.startsWith('[') && line.trim())
                            .join(' ')
                            .trim();
                        resolve(transcription);
                    }
                    else {
                        logger_1.logger.error('Whisper process failed', { code, errorOutput });
                        reject(new Error('Whisper transcription failed'));
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Detect silence in audio buffer
     * Returns true if silence detected (useful for sentence boundary detection)
     */
    detectSilence(audioBuffer, threshold = 500) {
        // Simple silence detection based on audio amplitude
        const samples = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += Math.abs(samples[i]);
        }
        const average = sum / samples.length;
        return average < threshold;
    }
    /**
     * Detect sentence boundary
     * Returns true if we should process the accumulated audio
     */
    shouldProcessBuffer(silenceDuration) {
        // Process if silence > 1.2 seconds
        return silenceDuration > 1200;
    }
    /**
     * Write WAV file from PCM buffer
     */
    async writeWavFile(pcmBuffer) {
        return new Promise((resolve, reject) => {
            try {
                const sampleRate = 16000;
                const numChannels = 1;
                const bitsPerSample = 16;
                // WAV header
                const wavHeader = Buffer.alloc(44);
                // RIFF header
                wavHeader.write('RIFF', 0);
                wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
                wavHeader.write('WAVE', 8);
                // fmt chunk
                wavHeader.write('fmt ', 12);
                wavHeader.writeUInt32LE(16, 16); // fmt chunk size
                wavHeader.writeUInt16LE(1, 20); // audio format (1 = PCM)
                wavHeader.writeUInt16LE(numChannels, 22);
                wavHeader.writeUInt32LE(sampleRate, 24);
                wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
                wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
                wavHeader.writeUInt16LE(bitsPerSample, 34);
                // data chunk
                wavHeader.write('data', 36);
                wavHeader.writeUInt32LE(pcmBuffer.length, 40);
                const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
                fs.writeFileSync(this.tempAudioFile, wavBuffer);
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Cleanup temporary files
     */
    cleanup() {
        try {
            if (fs.existsSync(this.tempAudioFile)) {
                fs.unlinkSync(this.tempAudioFile);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup temp files', { error });
        }
    }
    /**
     * Stop the STT service
     */
    stop() {
        if (this.whisperProcess) {
            this.whisperProcess.kill();
            this.whisperProcess = null;
        }
        this.cleanup();
        this.audioBuffer = [];
    }
}
exports.STTService = STTService;
exports.sttService = new STTService();
//# sourceMappingURL=stt.service.js.map