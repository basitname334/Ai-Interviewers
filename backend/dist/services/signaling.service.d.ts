import { Server as SocketIOServer } from 'socket.io';
/**
 * WebRTC Signaling Service
 * Handles WebRTC signaling, audio streaming, and real-time transcription
 */
export declare class SignalingService {
    private io;
    private sessions;
    private maxSilenceDuration;
    constructor(io: SocketIOServer);
    /**
     * Setup Socket.io event handlers
     */
    private setupSocketHandlers;
    /**
     * Handle WebRTC offer
     */
    private handleOffer;
    /**
     * Handle WebRTC answer
     */
    private handleAnswer;
    /**
     * Handle ICE candidate
     */
    private handleIceCandidate;
    /**
     * Handle interview start
     */
    private handleInterviewStart;
    /**
     * Handle audio stream chunks
     */
    private handleAudioStream;
    /**
     * Process accumulated audio buffer
     */
    private processAudioBuffer;
    /**
     * Process user's answer
     */
    private processUserAnswer;
    /**
     * Handle silence detection
     */
    private handleSilence;
    /**
     * Handle interview end
     */
    private handleInterviewEnd;
    /**
     * Calculate final scores for the interview
     */
    private calculateFinalScores;
    /**
     * Handle client disconnect
     */
    private handleDisconnect;
    /**
     * Cleanup old sessions periodically
     */
    startCleanupInterval(): void;
}
//# sourceMappingURL=signaling.service.d.ts.map