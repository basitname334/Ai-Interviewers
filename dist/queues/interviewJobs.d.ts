/**
 * Bull queue for background interview jobs. Use cases: report generation when
 * Redis state is large, summarization of context when token limit is approached,
 * and async recording upload to object storage. Stub implementation; wire Redis
 * and Bull in production.
 */
import type { InterviewReport } from '../types';
export interface GenerateReportJobData {
    interviewId: string;
}
export declare function enqueueReportGeneration(data: GenerateReportJobData): Promise<void>;
export declare function processReportJob(data: GenerateReportJobData): Promise<InterviewReport | null>;
//# sourceMappingURL=interviewJobs.d.ts.map