"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Backend entry point: start HTTP server with Socket.io for real-time voice interviews.
 */
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./api/app"));
const config_1 = require("./config");
const ensure_scheduled_1 = require("./db/ensure-scheduled");
const ensure_questions_1 = require("./db/ensure-questions");
const ensure_users_1 = require("./db/ensure-users");
const ensure_hiring_flow_1 = require("./db/ensure-hiring-flow");
const signaling_service_1 = require("./services/signaling.service");
const llm_service_1 = require("./services/llm.service");
const stt_service_1 = require("./services/stt.service");
const logger_1 = require("./config/logger");
async function start() {
    try {
        await (0, ensure_users_1.ensureUsersTable)();
        logger_1.logger.info('Users table ready');
    }
    catch (e) {
        logger_1.logger.warn('Could not ensure users table:', e.message);
    }
    try {
        await (0, ensure_scheduled_1.ensureScheduledTable)();
        logger_1.logger.info('Scheduled interviews table ready');
    }
    catch (e) {
        logger_1.logger.warn('Could not ensure scheduled_interviews table (run schema.sql and schema-scheduled.sql if needed):', e.message);
    }
    try {
        await (0, ensure_hiring_flow_1.ensureHiringFlowTables)();
        logger_1.logger.info('Hiring flow tables ready');
    }
    catch (e) {
        logger_1.logger.warn('Could not ensure hiring flow tables:', e.message);
    }
    try {
        await (0, ensure_questions_1.ensureQuestionTemplatesTable)();
        logger_1.logger.info('Question templates table ready');
    }
    catch (e) {
        logger_1.logger.warn('Could not ensure question_templates table:', e.message);
    }
    // Create HTTP server
    const httpServer = (0, http_1.createServer)(app_1.default);
    // Initialize Socket.io
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        maxHttpBufferSize: 1e8, // 100 MB for audio chunks
    });
    // Initialize services
    logger_1.logger.info('Initializing services...');
    // Check Ollama only when OpenRouter is not configured.
    if (!config_1.config.ai.openRouterApiKey) {
        const ollamaHealthy = await llm_service_1.llmService.healthCheck();
        if (!ollamaHealthy) {
            logger_1.logger.warn('Ollama is not accessible. Please ensure Ollama is running: ollama serve');
        }
    }
    else {
        logger_1.logger.info('OpenRouter configured; skipping Ollama health check');
    }
    // Initialize STT service
    const sttInitialized = await stt_service_1.sttService.initialize();
    if (!sttInitialized) {
        logger_1.logger.warn('STT service initialization failed. Voice transcription may not work properly.');
    }
    // Initialize WebRTC signaling service
    const signalingService = new signaling_service_1.SignalingService(io);
    signalingService.startCleanupInterval();
    logger_1.logger.info('All services initialized');
    // Start server
    const server = httpServer.listen(config_1.config.port, () => {
        logger_1.logger.info(`Server listening on port ${config_1.config.port} (env: ${config_1.config.env})`);
        logger_1.logger.info(`WebRTC signaling ready`);
        logger_1.logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
    return server;
}
const serverPromise = start().catch((e) => {
    logger_1.logger.error('Startup failed:', e);
    process.exit(1);
});
exports.default = serverPromise;
//# sourceMappingURL=index.js.map