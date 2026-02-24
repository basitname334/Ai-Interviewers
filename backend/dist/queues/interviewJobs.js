"use strict";
/**
 * Bull queue for background interview jobs. Use cases: report generation when
 * Redis state is large, summarization of context when token limit is approached,
 * and async recording upload to object storage. Stub implementation; wire Redis
 * and Bull in production.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueReportGeneration = enqueueReportGeneration;
exports.processReportJob = processReportJob;
async function enqueueReportGeneration(data) {
    // In production: await reportQueue.add('generate', data, { attempts: 2 });
    console.log('[Queue stub] enqueueReportGeneration', data);
}
async function processReportJob(data) {
    // Worker would load state, call scoringReportService.buildReport, persist, return
    console.log('[Queue stub] processReportJob', data);
    return null;
}
//# sourceMappingURL=interviewJobs.js.map