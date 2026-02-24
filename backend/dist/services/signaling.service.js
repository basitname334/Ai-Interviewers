"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingService = void 0;
const logger_1 = require("../config/logger");
const stt_service_1 = require("./stt.service");
const interview_engine_service_1 = require("./interview-engine.service");
const scoring_engine_service_1 = require("./scoring-engine.service");
/**
 * WebRTC Signaling Service
 * Handles WebRTC signaling, audio streaming, and real-time transcription
 */
class SignalingService {
    io;
    sessions = new Map();
    maxSilenceDuration;
    constructor(io) {
        this.io = io;
        this.maxSilenceDuration = parseInt(process.env.INTERVIEW_MAX_SILENCE || '30') * 1000;
        this.setupSocketHandlers();
    }
    /**
     * Setup Socket.io event handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info('Client connected', { socketId: socket.id });
            // WebRTC Signaling Events
            socket.on('webrtc:offer', (data) => this.handleOffer(socket, data));
            socket.on('webrtc:answer', (data) => this.handleAnswer(socket, data));
            socket.on('webrtc:ice-candidate', (data) => this.handleIceCandidate(socket, data));
            // Interview Events
            socket.on('interview:start', (data) => this.handleInterviewStart(socket, data));
            socket.on('interview:end', (data) => this.handleInterviewEnd(socket, data));
            // Audio Streaming Events
            socket.on('audio:stream', (data) => this.handleAudioStream(socket, data));
            socket.on('audio:silence', (data) => this.handleSilence(socket, data));
            // Disconnect
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
        logger_1.logger.info('Socket.io handlers initialized');
    }
    /**
     * Handle WebRTC offer
     */
    handleOffer(socket, data) {
        logger_1.logger.info('Received WebRTC offer', { socketId: socket.id });
        // In a full WebRTC implementation, we would create a peer connection here
        // For now, we'll acknowledge the offer and let the client handle the connection
        socket.emit('webrtc:offer-received', { success: true });
    }
    /**
     * Handle WebRTC answer
     */
    handleAnswer(socket, data) {
        logger_1.logger.info('Received WebRTC answer', { socketId: socket.id });
        socket.emit('webrtc:answer-received', { success: true });
    }
    /**
     * Handle ICE candidate
     */
    handleIceCandidate(socket, data) {
        logger_1.logger.debug('Received ICE candidate', { socketId: socket.id });
        socket.emit('webrtc:ice-candidate-received', { success: true });
    }
    /**
     * Handle interview start
     */
    async handleInterviewStart(socket, data) {
        try {
            const { sessionId, interviewId, category } = data;
            logger_1.logger.info('Starting interview', { sessionId, interviewId, category });
            // Create voice session
            const voiceSession = {
                sessionId,
                interviewId,
                socket,
                audioBuffer: [],
                silenceStartTime: null,
                lastSpeechTime: Date.now(),
                isProcessing: false,
                transcript: [],
            };
            this.sessions.set(sessionId, voiceSession);
            // Start interview with engine
            const { greeting, firstQuestion } = await interview_engine_service_1.interviewEngineService.startInterview(sessionId, category || 'Technical');
            // Send greeting and first question to client
            socket.emit('interview:started', {
                sessionId,
                greeting,
                firstQuestion,
            });
            // Add to transcript
            voiceSession.transcript.push({
                speaker: 'AI',
                text: greeting,
                timestamp: new Date(),
            });
            voiceSession.transcript.push({
                speaker: 'AI',
                text: firstQuestion,
                timestamp: new Date(),
            });
            logger_1.logger.info('Interview started successfully', { sessionId });
        }
        catch (error) {
            logger_1.logger.error('Failed to start interview', { error, data });
            socket.emit('interview:error', { error: 'Failed to start interview' });
        }
    }
    /**
     * Handle audio stream chunks
     */
    async handleAudioStream(socket, data) {
        try {
            const { sessionId, audioChunk } = data;
            const session = this.sessions.get(sessionId);
            if (!session) {
                logger_1.logger.warn('Audio stream for unknown session', { sessionId });
                return;
            }
            // Convert ArrayBuffer to Buffer
            const buffer = Buffer.from(audioChunk);
            // Update last speech time
            session.lastSpeechTime = Date.now();
            session.silenceStartTime = null;
            // Add to buffer
            session.audioBuffer.push(buffer);
            // Process audio if we have enough data
            if (!session.isProcessing) {
                this.processAudioBuffer(session);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to handle audio stream', { error, sessionId: data.sessionId });
        }
    }
    /**
     * Process accumulated audio buffer
     */
    async processAudioBuffer(session) {
        if (session.isProcessing || session.audioBuffer.length === 0) {
            return;
        }
        session.isProcessing = true;
        try {
            // Combine audio chunks
            const combinedBuffer = Buffer.concat(session.audioBuffer);
            session.audioBuffer = [];
            // Transcribe using STT service
            const result = await stt_service_1.sttService.transcribeStream(combinedBuffer);
            if (result && result.text.trim()) {
                logger_1.logger.info('Transcription result', {
                    sessionId: session.sessionId,
                    text: result.text,
                    confidence: result.confidence,
                });
                // Add to transcript
                session.transcript.push({
                    speaker: 'User',
                    text: result.text,
                    timestamp: new Date(),
                });
                // Send transcript update to client
                session.socket.emit('transcript:update', {
                    speaker: 'User',
                    text: result.text,
                    timestamp: new Date(),
                });
                // If this is a final result, process the answer
                if (result.isFinal || result.text.endsWith('.') || result.text.endsWith('?')) {
                    await this.processUserAnswer(session, result.text);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to process audio buffer', { error, sessionId: session.sessionId });
        }
        finally {
            session.isProcessing = false;
        }
    }
    /**
     * Process user's answer
     */
    async processUserAnswer(session, answerText) {
        try {
            const duration = (Date.now() - session.lastSpeechTime) / 1000;
            // Process answer with interview engine
            const result = await interview_engine_service_1.interviewEngineService.processAnswer(session.sessionId, answerText, duration);
            if (result.shouldEnd) {
                // Interview completed
                session.socket.emit('interview:completed', {
                    feedback: result.feedback,
                });
                // Add feedback to transcript
                if (result.feedback) {
                    session.transcript.push({
                        speaker: 'AI',
                        text: result.feedback,
                        timestamp: new Date(),
                    });
                }
                // Calculate final scores
                await this.calculateFinalScores(session);
            }
            else {
                // Send next question or follow-up
                const nextText = result.followUp || result.nextQuestion;
                if (nextText) {
                    session.socket.emit('interview:next-question', {
                        question: nextText,
                        isFollowUp: !!result.followUp,
                    });
                    // Add to transcript
                    session.transcript.push({
                        speaker: 'AI',
                        text: nextText,
                        timestamp: new Date(),
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to process user answer', { error, sessionId: session.sessionId });
        }
    }
    /**
     * Handle silence detection
     */
    handleSilence(socket, data) {
        const session = this.sessions.get(data.sessionId);
        if (!session)
            return;
        if (!session.silenceStartTime) {
            session.silenceStartTime = Date.now();
        }
        const silenceDuration = Date.now() - session.silenceStartTime;
        if (silenceDuration > this.maxSilenceDuration) {
            logger_1.logger.warn('Silence timeout', { sessionId: data.sessionId, silenceDuration });
            interview_engine_service_1.interviewEngineService.handleSilenceTimeout(data.sessionId);
            socket.emit('interview:timeout', {
                message: 'Interview ended due to inactivity',
            });
            this.sessions.delete(data.sessionId);
        }
    }
    /**
     * Handle interview end
     */
    async handleInterviewEnd(socket, data) {
        try {
            const session = this.sessions.get(data.sessionId);
            if (!session) {
                logger_1.logger.warn('Attempted to end unknown session', { sessionId: data.sessionId });
                return;
            }
            const feedback = await interview_engine_service_1.interviewEngineService.endInterview(data.sessionId);
            await this.calculateFinalScores(session);
            socket.emit('interview:ended', { feedback });
            this.sessions.delete(data.sessionId);
            logger_1.logger.info('Interview ended', { sessionId: data.sessionId });
        }
        catch (error) {
            logger_1.logger.error('Failed to end interview', { error, sessionId: data.sessionId });
            socket.emit('interview:error', { error: 'Failed to end interview' });
        }
    }
    /**
     * Calculate final scores for the interview
     */
    async calculateFinalScores(session) {
        try {
            const interviewSession = interview_engine_service_1.interviewEngineService.getSession(session.sessionId);
            if (!interviewSession)
                return;
            // Score each question-answer pair
            const questionScores = await Promise.all(interviewSession.questions.map(async (question) => {
                const answer = interviewSession.answers.find((a) => a.questionId === question.id);
                if (answer) {
                    return scoring_engine_service_1.scoringEngineService.scoreAnswer(question.text, answer.text);
                }
                return null;
            }));
            const validScores = questionScores.filter((s) => s !== null);
            // Calculate overall score
            const overallScore = await scoring_engine_service_1.scoringEngineService.calculateOverallScore(validScores, session.transcript);
            // Send scores to client
            session.socket.emit('interview:scores', overallScore);
            logger_1.logger.info('Final scores calculated', {
                sessionId: session.sessionId,
                overallScore: overallScore.overallScore,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate final scores', {
                error,
                sessionId: session.sessionId,
            });
        }
    }
    /**
     * Handle client disconnect
     */
    handleDisconnect(socket) {
        logger_1.logger.info('Client disconnected', { socketId: socket.id });
        // Find and cleanup session
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.socket.id === socket.id) {
                this.sessions.delete(sessionId);
                logger_1.logger.info('Cleaned up session on disconnect', { sessionId });
                break;
            }
        }
    }
    /**
     * Cleanup old sessions periodically
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            for (const [sessionId, session] of this.sessions.entries()) {
                const age = now - session.lastSpeechTime;
                // Remove sessions inactive for > 1 hour
                if (age > 3600000) {
                    this.sessions.delete(sessionId);
                    logger_1.logger.info('Cleaned up inactive session', { sessionId, age });
                }
            }
        }, 300000); // Run every 5 minutes
    }
}
exports.SignalingService = SignalingService;
//# sourceMappingURL=signaling.service.js.map