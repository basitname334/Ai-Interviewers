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
exports.transcribeRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const logger_1 = require("../../config/logger");
const router = (0, express_1.Router)();
let whisperBuildPromise = null;
const upload = (0, multer_1.default)({
    dest: os.tmpdir(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /audio\//i.test(file.mimetype) ||
            file.mimetype === 'application/octet-stream' ||
            file.mimetype === '';
        if (ok)
            cb(null, true);
        else
            cb(new Error(`Invalid content-type: ${file.mimetype}`));
    },
});
function ensureFfmpegAvailable() {
    const check = (0, child_process_1.spawnSync)('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (check.status !== 0) {
        throw new Error('ffmpeg not found. Install it (macOS: brew install ffmpeg) and ensure it is on PATH.');
    }
}
function hasFfmpeg() {
    try {
        const check = (0, child_process_1.spawnSync)('ffmpeg', ['-version'], { stdio: 'ignore' });
        return check.status === 0;
    }
    catch {
        return false;
    }
}
function hasCmake() {
    try {
        const check = (0, child_process_1.spawnSync)('cmake', ['--version'], { stdio: 'ignore' });
        return check.status === 0;
    }
    catch {
        return false;
    }
}
function hasCommandOnPath(cmd) {
    try {
        const check = (0, child_process_1.spawnSync)(cmd, ['--help'], { stdio: 'ignore' });
        return check.status === 0 || check.status === 1; // many CLIs return 1 for --help
    }
    catch {
        return false;
    }
}
async function ensureWhisperCppBuilt() {
    if (whisperBuildPromise)
        return whisperBuildPromise;
    whisperBuildPromise = (async () => {
        const whisperCppDir = path.join(process.cwd(), 'whisper.cpp');
        if (!fs.existsSync(whisperCppDir))
            return;
        if (!hasCmake()) {
            throw new Error('cmake not found. Install it (macOS: brew install cmake) or set WHISPER_CPP_PATH to an existing whisper.cpp binary.');
        }
        const buildDir = path.join(whisperCppDir, 'build');
        logger_1.logger.info('[transcribe] whisper.cpp binary missing; building via cmake', { buildDir });
        const cfg = await runCommand('cmake', ['-S', whisperCppDir, '-B', buildDir, '-DCMAKE_BUILD_TYPE=Release'], { timeoutMs: 10 * 60 * 1000 });
        if (cfg.code !== 0) {
            throw new Error(`cmake configure failed: ${cfg.stderr.slice(0, 1000) || cfg.stdout.slice(0, 1000)}`);
        }
        const build = await runCommand('cmake', ['--build', buildDir, '--config', 'Release'], {
            timeoutMs: 10 * 60 * 1000,
        });
        if (build.code !== 0) {
            throw new Error(`cmake build failed: ${build.stderr.slice(0, 1000) || build.stdout.slice(0, 1000)}`);
        }
        logger_1.logger.info('[transcribe] whisper.cpp build complete');
    })().catch((e) => {
        // Allow future retries if build failed.
        whisperBuildPromise = null;
        throw e;
    });
    return whisperBuildPromise;
}
async function resolveWhisperBin() {
    if (process.env.WHISPER_CPP_PATH)
        return process.env.WHISPER_CPP_PATH;
    // If installed via package manager (e.g. `brew install whisper-cpp`), prefer PATH.
    if (hasCommandOnPath('whisper-cli'))
        return 'whisper-cli';
    if (hasCommandOnPath('whisper'))
        return 'whisper';
    const candidates = [
        // Common whisper.cpp cmake outputs:
        path.join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'whisper-cli'),
        path.join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'Release', 'whisper-cli'),
        path.join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'whisper'),
        path.join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'Release', 'whisper'),
        // Legacy make output sometimes used in older setups:
        path.join(process.cwd(), 'whisper.cpp', 'main'),
        // Repo-local convenience:
        path.join(process.cwd(), 'whisper'),
    ];
    const existing = pickFirstExisting(candidates);
    if (existing)
        return existing;
    // Try building whisper.cpp if source exists.
    try {
        await ensureWhisperCppBuilt();
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger_1.logger.error('[transcribe] whisper.cpp build failed', { error: msg });
        return null;
    }
    return pickFirstExisting(candidates);
}
function isWhisperReadyWav16kMonoPcmS16le(filePath) {
    try {
        // Read enough bytes to cover RIFF header + common chunk layouts.
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(4096);
        const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const header = buf.subarray(0, bytesRead);
        if (header.length < 44)
            return false;
        if (header.toString('ascii', 0, 4) !== 'RIFF')
            return false;
        if (header.toString('ascii', 8, 12) !== 'WAVE')
            return false;
        let offset = 12;
        while (offset + 8 <= header.length) {
            const chunkId = header.toString('ascii', offset, offset + 4);
            const chunkSize = header.readUInt32LE(offset + 4);
            offset += 8;
            if (chunkId === 'fmt ') {
                if (offset + 16 > header.length)
                    return false;
                const audioFormat = header.readUInt16LE(offset);
                const numChannels = header.readUInt16LE(offset + 2);
                const sampleRate = header.readUInt32LE(offset + 4);
                const bitsPerSample = header.readUInt16LE(offset + 14);
                return (audioFormat === 1 && // PCM
                    numChannels === 1 &&
                    sampleRate === 16000 &&
                    bitsPerSample === 16);
            }
            // Skip chunk payload (plus padding to word boundary).
            const skip = chunkSize + (chunkSize % 2);
            offset += skip;
        }
        return false;
    }
    catch {
        return false;
    }
}
function pickFirstExisting(candidates) {
    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p))
                return p;
        }
        catch {
            // ignore
        }
    }
    return null;
}
async function runCommand(cmd, args, opts) {
    return await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        const timeoutId = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            }
            catch {
                // ignore
            }
            reject(new Error(`Command timed out after ${opts.timeoutMs}ms: ${cmd}`));
        }, opts.timeoutMs);
        child.stdout.on('data', (d) => (stdout += d.toString()));
        child.stderr.on('data', (d) => (stderr += d.toString()));
        child.on('error', (e) => {
            clearTimeout(timeoutId);
            reject(e);
        });
        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({ code: code ?? 1, stdout, stderr });
        });
    });
}
function extractTranscriptFromWhisperStdout(stdout) {
    const lines = (stdout || '').split('\n');
    return lines
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('['))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
router.post('/', upload.single('audio'), async (req, res) => {
    const file = req.file;
    let inputPath = file?.path || null;
    let normalizedPath = null;
    let outputTxtPath = null;
    try {
        if (!file || !inputPath) {
            return res.status(400).json({ error: 'Audio file is required (field: audio)' });
        }
        logger_1.logger.info('[transcribe] file received', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: inputPath,
        });
        if (!file.size || file.size <= 0) {
            return res.status(400).json({ error: 'No audio detected (empty upload)' });
        }
        // Normalize to 16kHz mono PCM_s16le for whisper.cpp.
        // If ffmpeg isn't installed, allow already-normalized WAVs (our frontend generates these).
        if (!hasFfmpeg()) {
            if (!isWhisperReadyWav16kMonoPcmS16le(inputPath)) {
                return res.status(500).json({
                    error: 'Transcription failed',
                    details: 'ffmpeg not found and uploaded audio is not a 16kHz mono 16-bit PCM WAV. Install ffmpeg (macOS: brew install ffmpeg) or upload a 16kHz mono WAV.',
                });
            }
            normalizedPath = inputPath;
            logger_1.logger.info('[transcribe] ffmpeg missing; using uploaded WAV directly', { normalizedPath });
        }
        else {
            normalizedPath = path.join(os.tmpdir(), `uploaded_${Date.now()}_16k_mono.wav`);
            const ffmpegArgs = [
                '-y',
                '-i',
                inputPath,
                '-ar',
                '16000',
                '-ac',
                '1',
                '-c:a',
                'pcm_s16le',
                normalizedPath,
            ];
            logger_1.logger.info('[transcribe] running ffmpeg', { args: ffmpegArgs.join(' ') });
            const ff = await runCommand('ffmpeg', ffmpegArgs, { timeoutMs: 60000 });
            if (ff.code !== 0) {
                logger_1.logger.error('[transcribe] ffmpeg failed', { code: ff.code, stderr: ff.stderr.slice(0, 2000) });
                return res.status(500).json({
                    error: 'ffmpeg conversion failed',
                    details: ff.stderr.slice(0, 2000),
                });
            }
        }
        const whisperBin = await resolveWhisperBin();
        if (!whisperBin) {
            return res.status(500).json({
                error: 'Whisper executable not found',
                details: 'Install whisper.cpp CLI (macOS: brew install whisper-cpp) or build from source (requires cmake): cd backend/whisper.cpp && make build. Or set WHISPER_CPP_PATH to your whisper binary. Expected output: backend/whisper.cpp/build/bin/whisper-cli',
            });
        }
        const modelPath = process.env.WHISPER_MODEL_PATH ||
            pickFirstExisting([
                path.join(process.cwd(), 'models', 'ggml-base.en.bin'),
                path.join(process.cwd(), 'whisper.cpp', 'models', 'ggml-base.en.bin'),
            ]);
        if (!modelPath) {
            return res.status(500).json({
                error: 'Whisper model not found',
                details: 'Expected models/ggml-base.en.bin (or set WHISPER_MODEL_PATH). From the backend folder run: ./whisper.cpp/models/download-ggml-model.sh base.en ./models',
            });
        }
        // whisper.cpp with -otxt writes `${input}.txt` by default.
        outputTxtPath = `${normalizedPath}.txt`;
        const whisperArgs = [
            '-m',
            modelPath,
            '-f',
            normalizedPath,
            '-l',
            process.env.WHISPER_LANGUAGE || 'en',
            '--no-timestamps',
            '-otxt',
        ];
        logger_1.logger.info('[transcribe] running whisper.cpp', { bin: whisperBin, args: whisperArgs.join(' ') });
        const ws = await runCommand(whisperBin, whisperArgs, { timeoutMs: 120000 });
        if (ws.code !== 0) {
            logger_1.logger.error('[transcribe] whisper failed', {
                code: ws.code,
                stderr: ws.stderr.slice(0, 2000),
                stdout: ws.stdout.slice(0, 500),
            });
            return res.status(500).json({
                error: 'whisper.cpp failed',
                details: ws.stderr.slice(0, 2000) || ws.stdout.slice(0, 2000),
            });
        }
        let transcript = extractTranscriptFromWhisperStdout(ws.stdout);
        if (!transcript && outputTxtPath && fs.existsSync(outputTxtPath)) {
            try {
                transcript = fs.readFileSync(outputTxtPath, 'utf8').replace(/\s+/g, ' ').trim();
            }
            catch {
                // ignore
            }
        }
        logger_1.logger.info('[transcribe] whisper output', {
            transcriptPreview: transcript ? transcript.slice(0, 120) : '',
            stdoutBytes: ws.stdout.length,
            stderrBytes: ws.stderr.length,
        });
        if (!transcript) {
            return res.status(422).json({
                error: 'Empty transcript',
                details: 'Whisper returned no text. Check that audio contains speech and that ffmpeg normalization succeeded.',
            });
        }
        return res.json({ transcript });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger_1.logger.error('[transcribe] route failed', { error: message });
        return res.status(500).json({
            error: 'Transcription failed',
            details: message,
        });
    }
    finally {
        // Cleanup temp files
        for (const p of [inputPath, normalizedPath, outputTxtPath]) {
            if (!p)
                continue;
            try {
                if (fs.existsSync(p))
                    fs.unlinkSync(p);
            }
            catch {
                // ignore
            }
        }
    }
});
exports.transcribeRoutes = router;
//# sourceMappingURL=transcribe.routes.js.map