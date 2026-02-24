"use strict";
/**
 * Interview lifecycle API: start, submit answer, get state, end, and report.
 * POST /interview/start, POST /interview/:id/answer, GET /interview/:id/state,
 * POST /interview/:id/end, GET /report/:interviewId
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const InterviewSessionService_1 = require("../../services/interview/InterviewSessionService");
const AIInterviewerOrchestrator_1 = require("../../services/interview/AIInterviewerOrchestrator");
const client_1 = require("../../db/client");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
/** POST /interview/start - Create and start a new interview session */
router.post('/start', (0, validate_1.validate)([
    (0, express_validator_1.body)('candidateId').isUUID().withMessage('candidateId must be a UUID'),
    (0, express_validator_1.body)('role').isIn(['technical', 'behavioral', 'sales', 'customer_success']).withMessage('Invalid role'),
    (0, express_validator_1.body)('positionId').optional().isUUID(),
]), async (req, res) => {
    try {
        const { candidateId, role, positionId } = req.body;
        let ensuredCandidateId = candidateId;
        const existing = await (0, client_1.query)(`SELECT id FROM candidates WHERE id = $1 LIMIT 1`, [candidateId]);
        if (existing.rows.length === 0) {
            const inserted = await (0, client_1.query)(`INSERT INTO candidates (id, email, name, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id`, [
                candidateId,
                `candidate+${String(candidateId).replace(/-/g, '')}@example.local`,
                'Interview Candidate',
            ]);
            ensuredCandidateId = inserted.rows[0].id;
        }
        const result = await InterviewSessionService_1.interviewSessionService.start({ candidateId: ensuredCandidateId, role, positionId });
        const firstReply = await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.getNextReply({
            interviewId: result.interviewId,
        });
        if (!firstReply.success) {
            return res.status(500).json({ error: 'Failed to generate first interview question' });
        }
        res.status(201).json({
            interviewId: result.interviewId,
            state: firstReply.state ?? result.state,
            firstReply: firstReply.reply,
        });
    }
    catch (e) {
        console.error('Interview start error', e);
        res.status(500).json({ error: 'Failed to start interview' });
    }
});
/** POST /interview/:id/answer - Submit candidate answer and get next AI reply */
router.post('/:id/answer', (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID(), (0, express_validator_1.body)('answerText').isString().notEmpty().trim()]), async (req, res) => {
    try {
        const interviewId = req.params.id;
        const { answerText } = req.body;
        const result = await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.submitAnswer({
            interviewId,
            answerText: String(answerText).trim(),
        });
        if (!result.success) {
            return res.status(400).json({
                error: 'Invalid state for answer submission (e.g. no pending question or session not found)',
            });
        }
        res.json({
            state: result.state,
            nextReply: result.nextReply,
            evaluation: result.evaluation,
            report: result.report,
        });
    }
    catch (e) {
        console.error('Submit answer error', e);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});
/** GET /interview/:id/state - Get current interview state (Redis) */
router.get('/:id/state', (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const state = await InterviewSessionService_1.interviewSessionService.getState(req.params.id);
        if (!state) {
            return res.status(404).json({ error: 'Interview not found or session expired' });
        }
        res.json(state);
    }
    catch (e) {
        console.error('Get state error', e);
        res.status(500).json({ error: 'Failed to get state' });
    }
});
/** POST /interview/:id/end - End interview and optionally generate report */
router.post('/:id/end', (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const interviewId = req.params.id;
        const state = await InterviewSessionService_1.interviewSessionService.getState(interviewId);
        let report = null;
        if (state) {
            report = (await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.getReport(interviewId)) ?? undefined;
        }
        await InterviewSessionService_1.interviewSessionService.end(interviewId, report ?? undefined);
        await (0, client_1.query)(`UPDATE scheduled_interviews SET status = 'completed', updated_at = NOW() WHERE interview_id = $1`, [interviewId]);
        res.json({ ended: true, report });
    }
    catch (e) {
        console.error('End interview error', e);
        res.status(500).json({ error: 'Failed to end interview' });
    }
});
exports.interviewRoutes = router;
//# sourceMappingURL=interview.js.map