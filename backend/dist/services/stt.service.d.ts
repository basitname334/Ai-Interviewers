import { EventEmitter } from 'events';
interface TranscriptionResult {
    text: string;
    confidence: number;
    isFinal: boolean;
}
/**
 * Speech-to-Text Service using Whisper
 * Supports real-time streaming transcription
 */
export declare class STTService extends EventEmitter {
    private whisperProcess;
    private model;
    private language;
    private device;
    private isProcessing;
    private audioBuffer;
    private tempAudioFile;
    constructor();
    /**
     * Initialize Whisper process
     */
    initialize(): Promise<boolean>;
    /**
     * Transcribe audio buffer (streaming mode)
     * This processes audio chunks in real-time
     */
    transcribeStream(audioChunk: Buffer): Promise<TranscriptionResult | null>;
    /**
     * Transcribe a complete audio file
     */
    transcribeFile(filePath: string): Promise<string>;
    /**
     * Detect silence in audio buffer
     * Returns true if silence detected (useful for sentence boundary detection)
     */
    detectSilence(audioBuffer: Buffer, threshold?: number): boolean;
    /**
     * Detect sentence boundary
     * Returns true if we should process the accumulated audio
     */
    shouldProcessBuffer(silenceDuration: number): boolean;
    /**
     * Write WAV file from PCM buffer
     */
    private writeWavFile;
    /**
     * Cleanup temporary files
     */
    cleanup(): void;
    /**
     * Stop the STT service
     */
    stop(): void;
}
export declare const sttService: STTService;
export {};
//# sourceMappingURL=stt.service.d.ts.map