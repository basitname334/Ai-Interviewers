/**
 * Scoring & Reporting: per-answer scoring aggregation, competency roll-up,
 * final recommendation, and recruiter-ready report. Consumes InterviewState
 * (with evaluations on turns) and produces InterviewReport.
 */
import type { InterviewState, InterviewReport } from '../../types';
export type Recommendation = 'strong_hire' | 'hire' | 'no_hire' | 'borderline';
export declare class ScoringReportService {
    /**
     * Build final report from completed interview state. All candidate turns
     * should have evaluations attached; we aggregate and compute recommendation.
     */
    buildReport(state: InterviewState): InterviewReport;
    private aggregate;
    private recommend;
    private writeSummary;
}
export declare const scoringReportService: ScoringReportService;
//# sourceMappingURL=ScoringReportService.d.ts.map