"use strict";
/**
 * Public join by token: candidate opens link, sees schedule info, starts interview.
 * No auth required. Start creates/finds candidate and starts session.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicJoinRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("../../db/client");
const InterviewSessionService_1 = require("../../services/interview/InterviewSessionService");
const AIInterviewerOrchestrator_1 = require("../../services/interview/AIInterviewerOrchestrator");
const validate_1 = require("../middleware/validate");
const ResumeContextService_1 = require("../../services/interview/ResumeContextService");
const router = (0, express_1.Router)();
/** GET /public/join/:token - Get schedule info for join page (no auth) */
router.get('/:token', (0, validate_1.validate)([(0, express_validator_1.param)('token').isString().notEmpty().isLength({ min: 10 })]), async (req, res) => {
    const token = req.params.token;
    const { rows } = await (0, client_1.query)(`SELECT id, candidate_email, candidate_name, role, scheduled_at, status, interview_id
       FROM scheduled_interviews WHERE join_token = $1`, [token]);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
    }
    const row = rows[0];
    if (row.status === 'cancelled') {
        return res.status(410).json({ error: 'This interview was cancelled' });
    }
    if (row.interview_id && row.status === 'completed') {
        return res.json({
            ...row,
            alreadyCompleted: true,
            interviewId: row.interview_id,
        });
    }
    res.json({
        id: row.id,
        candidateEmail: row.candidate_email,
        candidateName: row.candidate_name,
        role: row.role,
        scheduledAt: row.scheduled_at,
        status: row.status,
        alreadyCompleted: false,
        interviewId: row.interview_id,
    });
});
/** POST /public/join/:token/start - Start interview (create candidate if needed, return interviewId + firstReply) */
router.post('/:token/start', (0, validate_1.validate)([(0, express_validator_1.param)('token').isString().notEmpty().isLength({ min: 10 })]), async (req, res) => {
    const token = req.params.token;
    const { rows } = await (0, client_1.query)(`SELECT id, candidate_email, candidate_name, role, preferred_difficulty, custom_questions, focus_areas, duration_minutes, position_id, application_id, status, interview_id
       FROM scheduled_interviews WHERE join_token = $1`, [token]);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
    }
    const row = rows[0];
    let customQuestions = [];
    if (Array.isArray(row.custom_questions)) {
        customQuestions = row.custom_questions;
    }
    else if (typeof row.custom_questions === 'string') {
        try {
            const parsed = JSON.parse(row.custom_questions);
            if (Array.isArray(parsed))
                customQuestions = parsed;
        }
        catch {
            customQuestions = [];
        }
    }
    if (row.status === 'cancelled') {
        return res.status(410).json({ error: 'This interview was cancelled' });
    }
    if (row.interview_id && row.status === 'in_progress') {
        const state = await InterviewSessionService_1.interviewSessionService.getState(row.interview_id);
        if (state) {
            const hasAiTurn = state.turns.some((t) => t.role === 'ai');
            if (!hasAiTurn) {
                const firstReplyResult = await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.getNextReply({ interviewId: row.interview_id });
                if (firstReplyResult.success) {
                    return res.json({
                        interviewId: row.interview_id,
                        alreadyStarted: true,
                        firstReply: firstReplyResult.reply,
                        state: firstReplyResult.state ?? state,
                    });
                }
            }
            const lastTurn = state.turns[state.turns.length - 1];
            return res.json({
                interviewId: row.interview_id,
                alreadyStarted: true,
                firstReply: lastTurn?.role === 'ai' ? lastTurn.content : null,
                state,
            });
        }
    }
    let candidateId;
    const { rows: candRows } = await (0, client_1.query)(`SELECT id FROM candidates WHERE email = $1 LIMIT 1`, [row.candidate_email]);
    if (candRows.length > 0) {
        candidateId = candRows[0].id;
    }
    else {
        const { rows: insertRows } = await (0, client_1.query)(`INSERT INTO candidates (id, email, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id`, [row.candidate_email, row.candidate_name ?? row.candidate_email]);
        candidateId = insertRows[0].id;
    }
    let resumeContext;
    if (row.application_id) {
        const { rows: appRows } = await (0, client_1.query)(`SELECT a.resume_url, a.cover_letter, p.title AS position_title
         FROM applications a
         LEFT JOIN positions p ON p.id = a.position_id
         WHERE a.id = $1
         LIMIT 1`, [row.application_id]);
        const app = appRows[0];
        if (app) {
            resumeContext = await (0, ResumeContextService_1.buildResumeContext)({
                resumeUrl: app.resume_url,
                coverLetter: app.cover_letter,
                candidateName: row.candidate_name ?? row.candidate_email,
                positionTitle: app.position_title,
            });
        }
    }
    const { interviewId, state } = await InterviewSessionService_1.interviewSessionService.start({
        candidateId,
        role: row.role,
        positionId: row.position_id ?? undefined,
        resumeContext,
        preferredDifficulty: row.preferred_difficulty ?? undefined,
        customQuestions,
        focusAreas: row.focus_areas?.trim() || undefined,
        durationMinutes: row.duration_minutes ?? undefined,
    });
    const firstReplyResult = await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.getNextReply({ interviewId });
    if (!firstReplyResult.success) {
        return res.status(500).json({ error: 'Failed to generate first interview question' });
    }
    await (0, client_1.query)(`UPDATE scheduled_interviews SET interview_id = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1`, [row.id, interviewId]);
    res.status(201).json({
        interviewId,
        firstReply: firstReplyResult.reply,
        state: firstReplyResult.state ?? state,
    });
});
exports.publicJoinRoutes = router;
//# sourceMappingURL=publicJoin.js.map