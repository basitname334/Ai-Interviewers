"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recruiterRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const client_1 = require("../../db/client");
const config_1 = require("../../config");
const email_service_1 = require("../../services/email.service");
const router = (0, express_1.Router)();
const ROLES = ['technical', 'behavioral', 'sales', 'customer_success'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
function isDifficultyLevel(value) {
    return typeof value === 'string' && DIFFICULTY_LEVELS.includes(value);
}
function normalizeScheduleQuestions(input) {
    const toList = (raw, opts) => {
        if (!Array.isArray(raw))
            return [];
        const out = [];
        for (const item of raw) {
            const candidate = typeof item === 'string'
                ? { text: item }
                : item && typeof item === 'object'
                    ? item
                    : null;
            if (!candidate)
                continue;
            const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
            if (!text)
                continue;
            out.push({
                text,
                difficulty: isDifficultyLevel(candidate.difficulty) ? candidate.difficulty : opts.defaultDifficulty,
                isCodingQuestion: opts.isCoding,
                language: typeof candidate.language === 'string' ? candidate.language : null,
                starterCode: typeof candidate.starterCode === 'string' ? candidate.starterCode : null,
            });
        }
        return out;
    };
    const defaultDifficulty = input.defaultDifficulty ?? 'medium';
    const general = toList(input.customQuestionsRaw, { isCoding: false, defaultDifficulty });
    const coding = input.role === 'technical'
        ? toList(input.codingQuestionsRaw, { isCoding: true, defaultDifficulty })
        : [];
    return [...general, ...coding].slice(0, 30);
}
function toEmailSafeMessage(message) {
    if (!message)
        return undefined;
    const lines = message.split('\n');
    const cleaned = [];
    let suppressQuestionBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const startsQuestionBlock = /^custom questions:\s*$/i.test(trimmed) || /^coding questions:\s*$/i.test(trimmed);
        if (startsQuestionBlock) {
            suppressQuestionBlock = true;
            continue;
        }
        if (suppressQuestionBlock) {
            if (trimmed === '') {
                suppressQuestionBlock = false;
            }
            continue;
        }
        cleaned.push(line);
    }
    const finalMessage = cleaned.join('\n').trim();
    return finalMessage.length > 0 ? finalMessage : undefined;
}
router.get('/jobs', auth_1.recruiterAuthMiddleware, async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { rows } = await (0, client_1.query)(`SELECT id, title, company_name, description, requirements, location, salary_range, role, is_active, created_at
     FROM positions
     WHERE created_by = $1 AND is_active = true
     ORDER BY created_at DESC`, [userId]);
    return res.json({ jobs: rows });
});
router.post('/jobs', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.body)('title').isString().notEmpty(),
    (0, express_validator_1.body)('companyName').optional().isString(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('requirements').optional().isString(),
    (0, express_validator_1.body)('location').optional().isString(),
    (0, express_validator_1.body)('salaryRange').optional().isString(),
    (0, express_validator_1.body)('role').isIn(ROLES),
]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    try {
        const { title, companyName, description, requirements, location, salaryRange, role } = req.body;
        const { rows } = await (0, client_1.query)(`INSERT INTO positions (id, title, company_name, description, requirements, location, salary_range, role, is_active, created_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NOW())
         RETURNING id, title, company_name, description, requirements, location, salary_range, role, is_active, created_at`, [title, companyName ?? null, description ?? null, requirements ?? null, location ?? null, salaryRange ?? null, role, userId]);
        return res.status(201).json({ job: rows[0] });
    }
    catch (e) {
        console.error('Recruiter create job error', e);
        return res.status(500).json({ error: 'Failed to create job' });
    }
});
router.delete('/jobs/:id', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { rowCount } = await (0, client_1.query)(`UPDATE positions
       SET is_active = false
       WHERE id = $1 AND created_by = $2 AND is_active = true`, [req.params.id, userId]);
    return res.json({ deleted: (rowCount ?? 0) > 0 });
});
router.get('/applications', auth_1.recruiterAuthMiddleware, async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { rows } = await (0, client_1.query)(`SELECT a.id, a.status, a.resume_url, a.cover_letter, a.created_at, a.candidate_id, a.position_id,
            c.email AS candidate_email, c.name AS candidate_name, p.title AS position_title, p.role AS position_role,
            si.email_sent AS interview_email_sent, si.email_error AS interview_email_error
     FROM applications a
     INNER JOIN positions p ON p.id = a.position_id
     INNER JOIN candidates c ON c.id = a.candidate_id
     LEFT JOIN LATERAL (
       SELECT s.email_sent, s.email_error
       FROM scheduled_interviews s
       WHERE s.application_id = a.id
       ORDER BY s.created_at DESC
       LIMIT 1
     ) si ON TRUE
     WHERE p.created_by = $1
     ORDER BY a.created_at DESC`, [userId]);
    return res.json({ applications: rows });
});
router.post('/applications/:id/reject', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { id } = req.params;
    const { rows } = await (0, client_1.query)(`SELECT a.status
       FROM applications a
       INNER JOIN positions p ON p.id = a.position_id
       WHERE a.id = $1 AND p.created_by = $2
       LIMIT 1`, [id, userId]);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
    }
    if (rows[0].status === 'interview_scheduled') {
        return res.status(400).json({ error: 'Cannot reject after interview is scheduled' });
    }
    const { rowCount } = await (0, client_1.query)(`UPDATE applications
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1`, [id]);
    return res.json({ updated: (rowCount ?? 0) > 0 });
});
router.post('/applications/:id/schedule', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('role').optional().isIn(ROLES),
    (0, express_validator_1.body)('message').optional().isString(),
    (0, express_validator_1.body)('difficulty').optional().isIn(DIFFICULTY_LEVELS),
    (0, express_validator_1.body)('customQuestions').optional().isArray(),
    (0, express_validator_1.body)('codingQuestions').optional().isArray(),
    (0, express_validator_1.body)('focusAreas').optional().isString(),
    (0, express_validator_1.body)('durationMinutes').optional().isInt({ min: 5, max: 240 }),
]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    try {
        const { id } = req.params;
        const { scheduledAt, role, message, difficulty, customQuestions, codingQuestions, focusAreas, durationMinutes } = req.body;
        const { rows: recruiterRows } = await (0, client_1.query)(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [userId]);
        const recruiterName = recruiterRows[0]?.name ?? null;
        const { rows } = await (0, client_1.query)(`SELECT a.id AS application_id, c.email AS candidate_email, c.name AS candidate_name, p.id AS position_id, p.role AS position_role
         FROM applications a
         INNER JOIN positions p ON p.id = a.position_id
         INNER JOIN candidates c ON c.id = a.candidate_id
         WHERE a.id = $1 AND p.created_by = $2
         LIMIT 1`, [id, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const row = rows[0];
        if (!row.candidate_email) {
            return res.status(400).json({ error: 'Candidate email is required before scheduling' });
        }
        const scheduleRole = role ?? row.position_role;
        if (!ROLES.includes(scheduleRole)) {
            return res.status(400).json({ error: 'Invalid interview role' });
        }
        const normalizedQuestions = normalizeScheduleQuestions({
            role: scheduleRole,
            defaultDifficulty: difficulty,
            customQuestionsRaw: customQuestions,
            codingQuestionsRaw: codingQuestions,
        });
        const joinToken = crypto_1.default.randomBytes(32).toString('hex');
        const { rows: scheduleRows } = await (0, client_1.query)(`INSERT INTO scheduled_interviews (id, candidate_email, candidate_name, role, preferred_difficulty, custom_questions, focus_areas, duration_minutes, scheduled_at, join_token, position_id, created_by, application_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7, $8::timestamptz, $9, $10, $11, $12, NOW(), NOW())
         RETURNING id, candidate_email, candidate_name, role, scheduled_at, status, join_token`, [
            row.candidate_email,
            row.candidate_name,
            scheduleRole,
            difficulty ?? null,
            JSON.stringify(normalizedQuestions),
            focusAreas?.trim() || null,
            durationMinutes ?? null,
            scheduledAt,
            joinToken,
            row.position_id,
            userId,
            row.application_id,
        ]);
        await (0, client_1.query)(`UPDATE applications SET status = 'interview_scheduled', updated_at = NOW() WHERE id = $1`, [
            row.application_id,
        ]);
        const created = scheduleRows[0];
        const joinUrl = `${config_1.config.frontendUrl}/interview/join/${created.join_token}`;
        const mailResult = await (0, email_service_1.sendInterviewScheduleEmail)({
            to: created.candidate_email,
            candidateName: created.candidate_name,
            recruiterName,
            role: created.role,
            scheduledAt: created.scheduled_at,
            joinUrl,
            message: toEmailSafeMessage(message),
        });
        await (0, client_1.query)(`UPDATE scheduled_interviews
         SET email_sent = $2, email_error = $3, email_sent_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END, updated_at = NOW()
         WHERE id = $1`, [created.id, mailResult.sent, mailResult.error ?? null]);
        return res.status(201).json({
            id: created.id,
            joinToken: created.join_token,
            joinUrl,
            candidateEmail: created.candidate_email,
            candidateName: created.candidate_name,
            role: created.role,
            scheduledAt: created.scheduled_at,
            status: created.status,
            emailSent: mailResult.sent,
            emailError: mailResult.error,
        });
    }
    catch (e) {
        console.error('Recruiter schedule from application error', e);
        return res.status(500).json({ error: 'Failed to schedule interview' });
    }
});
router.post('/login', (0, validate_1.validate)([
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isString().notEmpty(),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const { rows } = await (0, client_1.query)(`SELECT id, email, name, password_hash, role, is_active
         FROM users
         WHERE email = $1
         LIMIT 1`, [email.toLowerCase()]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = rows[0];
        if (user.role !== 'recruiter') {
            return res.status(403).json({ error: 'Recruiter access required' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
        }
        const matches = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!matches) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({
            sub: user.email,
            email: user.email,
            type: 'recruiter',
            userId: user.id,
            role: 'recruiter',
        }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        return res.json({
            token,
            recruiter: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (e) {
        console.error('Recruiter login error', e);
        return res.status(500).json({ error: 'Login failed' });
    }
});
router.get('/me', auth_1.recruiterAuthMiddleware, async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const { rows } = await (0, client_1.query)(`SELECT id, email, name, is_active FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Recruiter not found' });
    }
    if (!rows[0].is_active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    return res.json({ recruiter: rows[0] });
});
router.get('/schedules', auth_1.recruiterAuthMiddleware, async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { rows } = await (0, client_1.query)(`SELECT id, candidate_email, candidate_name, role, scheduled_at, status, join_token, interview_id, created_at
     FROM scheduled_interviews
     WHERE created_by = $1
     ORDER BY scheduled_at DESC`, [userId]);
    const schedules = rows.map((r) => ({
        ...r,
        joinUrl: `${config_1.config.frontendUrl}/interview/join/${r.join_token}`,
    }));
    return res.json({ schedules });
});
router.post('/schedule', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.body)('candidateEmail').isEmail(),
    (0, express_validator_1.body)('candidateName').optional().isString(),
    (0, express_validator_1.body)('role').isIn(ROLES),
    (0, express_validator_1.body)('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('positionId').optional().isUUID(),
    (0, express_validator_1.body)('message').optional().isString(),
    (0, express_validator_1.body)('difficulty').optional().isIn(DIFFICULTY_LEVELS),
    (0, express_validator_1.body)('customQuestions').optional().isArray(),
    (0, express_validator_1.body)('codingQuestions').optional().isArray(),
    (0, express_validator_1.body)('focusAreas').optional().isString(),
    (0, express_validator_1.body)('durationMinutes').optional().isInt({ min: 5, max: 240 }),
]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    try {
        const { candidateEmail, candidateName, role, scheduledAt, positionId, message, difficulty, customQuestions, codingQuestions, focusAreas, durationMinutes } = req.body;
        const normalizedQuestions = normalizeScheduleQuestions({
            role,
            defaultDifficulty: difficulty,
            customQuestionsRaw: customQuestions,
            codingQuestionsRaw: codingQuestions,
        });
        const { rows: recruiterRows } = await (0, client_1.query)(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [userId]);
        const recruiterName = recruiterRows[0]?.name ?? null;
        const joinToken = crypto_1.default.randomBytes(32).toString('hex');
        const { rows } = await (0, client_1.query)(`INSERT INTO scheduled_interviews (id, candidate_email, candidate_name, role, preferred_difficulty, custom_questions, focus_areas, duration_minutes, scheduled_at, join_token, position_id, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7, $8::timestamptz, $9, $10, $11, NOW(), NOW())
         RETURNING id, candidate_email, candidate_name, role, scheduled_at, status, join_token`, [
            candidateEmail,
            candidateName || null,
            role,
            difficulty ?? null,
            JSON.stringify(normalizedQuestions),
            focusAreas?.trim() || null,
            durationMinutes ?? null,
            scheduledAt,
            joinToken,
            positionId || null,
            userId,
        ]);
        if (rows.length === 0) {
            return res.status(500).json({ error: 'Failed to create schedule' });
        }
        const row = rows[0];
        const joinUrl = `${config_1.config.frontendUrl}/interview/join/${row.join_token}`;
        const mailResult = await (0, email_service_1.sendInterviewScheduleEmail)({
            to: row.candidate_email,
            candidateName: row.candidate_name,
            recruiterName,
            role: row.role,
            scheduledAt: row.scheduled_at,
            joinUrl,
            message: toEmailSafeMessage(message),
        });
        await (0, client_1.query)(`UPDATE scheduled_interviews
         SET email_sent = $2, email_error = $3, email_sent_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END, updated_at = NOW()
         WHERE id = $1`, [row.id, mailResult.sent, mailResult.error ?? null]);
        return res.status(201).json({
            id: row.id,
            joinToken: row.join_token,
            joinUrl,
            candidateEmail: row.candidate_email,
            candidateName: row.candidate_name,
            role: row.role,
            scheduledAt: row.scheduled_at,
            status: row.status,
            emailSent: mailResult.sent,
            emailError: mailResult.error,
        });
    }
    catch (e) {
        const err = e;
        console.error('Recruiter create schedule error', err);
        const message = config_1.config.env === 'development' ? err.message : 'Failed to create schedule';
        return res.status(500).json({ error: message });
    }
});
router.patch('/schedule/:id', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    (0, express_validator_1.body)('scheduledAt').optional().isISO8601(),
]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { id } = req.params;
    const { status, scheduledAt } = req.body;
    const updates = [];
    const params = [];
    let i = 1;
    if (status !== undefined) {
        updates.push(`status = $${i}`);
        params.push(status);
        i++;
    }
    if (scheduledAt !== undefined) {
        updates.push(`scheduled_at = $${i}::timestamptz`);
        params.push(scheduledAt);
        i++;
    }
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
    }
    updates.push('updated_at = NOW()');
    params.push(id, userId);
    const { rowCount } = await (0, client_1.query)(`UPDATE scheduled_interviews
       SET ${updates.join(', ')}
       WHERE id = $${i} AND created_by = $${i + 1}`, params);
    return res.json({ updated: (rowCount ?? 0) > 0 });
});
router.delete('/schedule/:id', auth_1.recruiterAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    const user = req.user;
    const userId = user.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const active = await ensureActiveRecruiter(userId);
    if (!active) {
        return res.status(403).json({ error: 'Recruiter access is disabled by admin' });
    }
    const { rowCount } = await (0, client_1.query)(`DELETE FROM scheduled_interviews WHERE id = $1 AND created_by = $2`, [req.params.id, userId]);
    return res.json({ deleted: (rowCount ?? 0) > 0 });
});
exports.recruiterRoutes = router;
async function ensureActiveRecruiter(userId) {
    const { rows } = await (0, client_1.query)(`SELECT is_active, role FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (rows.length === 0)
        return false;
    return rows[0].role === 'recruiter' && rows[0].is_active;
}
//# sourceMappingURL=recruiter.js.map