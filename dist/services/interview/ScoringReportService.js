"use strict";
/**
 * Scoring & Reporting: per-answer scoring aggregation, competency roll-up,
 * final recommendation, and recruiter-ready report. Consumes InterviewState
 * (with evaluations on turns) and produces InterviewReport.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoringReportService = exports.ScoringReportService = void 0;
const MAX_SCORE_PER_ANSWER = 10;
class ScoringReportService {
    /**
     * Build final report from completed interview state. All candidate turns
     * should have evaluations attached; we aggregate and compute recommendation.
     */
    buildReport(state) {
        const endedAt = state.endedAt ?? new Date().toISOString();
        const evaluations = state.turns
            .filter((t) => t.role === 'candidate' && t.evaluation != null)
            .map((t) => t.evaluation);
        const { overallScore, maxScore, competencies, redFlags, strengths, improvements } = this.aggregate(evaluations, state.turns);
        const recommendation = this.recommend(overallScore, maxScore, redFlags);
        const questionAnswerSummary = state.turns
            .filter((t) => t.role === 'candidate')
            .map((t, i) => {
            const prevTurns = state.turns.slice(0, state.turns.indexOf(t));
            const lastAi = [...prevTurns].reverse().find((x) => x.role === 'ai');
            return {
                question: lastAi?.content ?? 'Question',
                answer: t.content,
                score: (t.evaluation?.normalizedScore ?? 0) * MAX_SCORE_PER_ANSWER,
            };
        });
        const summary = this.writeSummary(evaluations.length, overallScore, maxScore, recommendation);
        return {
            interviewId: state.interviewId,
            candidateId: state.candidateId,
            role: state.role,
            startedAt: state.startedAt,
            endedAt,
            overallScore,
            maxScore,
            recommendation,
            summary,
            competencies,
            redFlags,
            strengths,
            improvements,
            questionAnswerSummary,
        };
    }
    aggregate(evaluations, turns) {
        const n = evaluations.length;
        const maxScore = n * MAX_SCORE_PER_ANSWER;
        const overallScore = evaluations.reduce((sum, e) => sum + e.score, 0);
        const competencyScores = {};
        const allRedFlags = [];
        const strengths = [];
        const improvements = [];
        const candidateTurns = turns.filter((t) => t.role === 'candidate');
        evaluations.forEach((e, i) => {
            e.competencyIds.forEach((cid) => {
                if (!competencyScores[cid]) {
                    competencyScores[cid] = { sum: 0, count: 0, evidence: [] };
                }
                const avg = (e.relevance + e.structure + e.depth) / 3;
                competencyScores[cid].sum += avg;
                competencyScores[cid].count += 1;
                if (e.feedbackSnippet && candidateTurns[i]) {
                    competencyScores[cid].evidence.push(e.feedbackSnippet);
                }
            });
            allRedFlags.push(...e.redFlags);
            if (e.normalizedScore >= 0.7)
                strengths.push(e.feedbackSnippet || 'Strong answer');
            if (e.normalizedScore < 0.5)
                improvements.push(e.feedbackSnippet || 'Needs improvement');
        });
        const competencies = Object.entries(competencyScores).map(([id, data]) => ({
            competencyId: id,
            name: id.replace(/_/g, ' '),
            score: data.sum,
            maxScore: data.count * MAX_SCORE_PER_ANSWER,
            evidence: data.evidence.slice(0, 3),
        }));
        return {
            overallScore,
            maxScore,
            competencies,
            redFlags: [...new Set(allRedFlags)],
            strengths: strengths.slice(0, 5),
            improvements: improvements.slice(0, 5),
        };
    }
    recommend(overallScore, maxScore, redFlags) {
        const pct = maxScore > 0 ? overallScore / maxScore : 0;
        if (redFlags.length > 2)
            return 'no_hire';
        if (pct >= 0.8)
            return 'strong_hire';
        if (pct >= 0.6)
            return 'hire';
        if (pct >= 0.4)
            return 'borderline';
        return 'no_hire';
    }
    writeSummary(numAnswers, overallScore, maxScore, recommendation) {
        const pct = maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : 0;
        return `The candidate answered ${numAnswers} questions with an overall score of ${overallScore}/${maxScore} (${pct}%). Recommendation: ${recommendation}.`;
    }
}
exports.ScoringReportService = ScoringReportService;
exports.scoringReportService = new ScoringReportService();
//# sourceMappingURL=ScoringReportService.js.map