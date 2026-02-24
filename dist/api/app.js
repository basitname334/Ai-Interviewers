"use strict";
/**
 * Express app: CORS, JSON body, mount interview and report routes.
 * Auth middleware can be applied per-route for recruiter endpoints.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const interview_1 = require("./routes/interview");
const report_1 = require("./routes/report");
const admin_1 = require("./routes/admin");
const publicJoin_1 = require("./routes/publicJoin");
const ai_1 = require("./routes/ai");
const llm_routes_1 = require("./routes/llm.routes");
const voice_interview_routes_1 = require("./routes/voice-interview.routes");
const voiceLoop_routes_1 = require("./routes/voiceLoop.routes");
const recruiter_1 = require("./routes/recruiter");
const transcribe_routes_1 = require("./routes/transcribe.routes");
const publicJobs_1 = require("./routes/publicJobs");
const candidateAuth_1 = require("./routes/candidateAuth");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
});
app.use(`${config_1.config.apiPrefix}/interview`, interview_1.interviewRoutes);
app.use(`${config_1.config.apiPrefix}/report`, report_1.reportRoutes);
app.use(`${config_1.config.apiPrefix}/admin`, admin_1.adminRoutes);
app.use(`${config_1.config.apiPrefix}/recruiter`, recruiter_1.recruiterRoutes);
app.use(`${config_1.config.apiPrefix}/public/join`, publicJoin_1.publicJoinRoutes);
app.use(`${config_1.config.apiPrefix}/public/jobs`, publicJobs_1.publicJobsRoutes);
app.use(`${config_1.config.apiPrefix}/candidate`, candidateAuth_1.candidateAuthRoutes);
app.use(`${config_1.config.apiPrefix}/ai`, ai_1.aiRoutes);
app.use(`${config_1.config.apiPrefix}/llm`, llm_routes_1.llmRoutes);
app.use(`${config_1.config.apiPrefix}/voice-interview`, voice_interview_routes_1.voiceInterviewRoutes);
app.use(`${config_1.config.apiPrefix}/voice-loop`, voiceLoop_routes_1.voiceLoopRoutes);
// Voice STT (multipart upload)
app.use(`${config_1.config.apiPrefix}/transcribe`, transcribe_routes_1.transcribeRoutes);
// Alias to satisfy clients expecting POST /api/transcribe
app.use('/api/transcribe', transcribe_routes_1.transcribeRoutes);
exports.default = app;
//# sourceMappingURL=app.js.map