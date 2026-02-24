/**
 * Transcribe an audio file using whisper.cpp.
 * Expects a path to a WAV (or format supported by whisper.cpp).
 * Returns the transcribed text; strips timestamps and normalizes whitespace.
 */
export declare function transcribeAudio(filePath: string): Promise<string>;
//# sourceMappingURL=speech.service.d.ts.map