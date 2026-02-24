"use strict";
/**
 * GET /report/:interviewId - Fetch recruiter report. Tries Redis-backed state
 * first for live report, then falls back to persisted reports table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const AIInterviewerOrchestrator_1 = require("../../services/interview/AIInterviewerOrchestrator");
const client_1 = require("../../db/client");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.get('/:interviewId', (0, validate_1.validate)([(0, express_validator_1.param)('interviewId').isUUID()]), async (req, res) => {
    try {
        const interviewId = req.params.interviewId;
        let report = await AIInterviewerOrchestrator_1.aiInterviewerOrchestrator.getReport(interviewId);
        if (!report) {
            const { rows } = await (0, client_1.query)(`SELECT interview_id, overall_score, max_score, recommendation, summary,
                red_flags, strengths, improvements, competencies, question_answer_summary
         FROM reports WHERE interview_id = $1`, [interviewId]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Report not found for this interview' });
            }
            const r = rows[0];
            report = {
                interviewId: r.interview_id,
                candidateId: '', // not stored in reports; join with interviews if needed
                role: 'technical',
                startedAt: '',
                endedAt: '',
                overallScore: Number(r.overall_score),
                maxScore: Number(r.max_score),
                recommendation: r.recommendation,
                summary: r.summary,
                competencies: r.competencies ?? [],
                redFlags: r.red_flags ?? [],
                strengths: r.strengths ?? [],
                improvements: r.improvements ?? [],
                questionAnswerSummary: r.question_answer_summary ?? [],
            };
        }
        res.json(report);
    }
    catch (e) {
        console.error('Get report error', e);
        res.status(500).json({ error: 'Failed to get report' });
    }
});
exports.reportRoutes = router;
//# sourceMappingURL=report.js.map