"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
/**
 * Admin API: login (issue JWT), schedule CRUD, question bank CRUD, optional protected routes.
 */
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../../config");
const client_1 = require("../../db/client");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const questionTemplateService = __importStar(require("../../services/questionTemplate.service"));
const router = (0, express_1.Router)();
const ROLES = ['technical', 'behavioral', 'sales', 'customer_success'];
const PHASES = ['intro', 'technical', 'behavioral', 'wrap_up'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
/** POST /admin/login - Admin login, returns JWT with type 'admin' */
router.post('/login', (0, validate_1.validate)([
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isString().notEmpty(),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email !== config_1.config.admin.email) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (password !== config_1.config.admin.password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ sub: email, email, type: 'admin' }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        res.json({ token, email });
    }
    catch (e) {
        console.error('Admin login error', e);
        res.status(500).json({ error: 'Login failed' });
    }
});
/** GET /admin/me - Require admin JWT, return current admin info */
router.get('/me', auth_1.adminAuthMiddleware, (req, res) => {
    const user = req.user;
    res.json({ email: user.email ?? user.sub });
});
/** POST /admin/recruiters - Admin creates recruiter account */
router.post('/recruiters', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('name').optional().isString(),
    (0, express_validator_1.body)('password').isString().isLength({ min: 6 }),
]), async (req, res) => {
    try {
        const email = String(req.body.email).toLowerCase();
        const name = req.body.name ? String(req.body.name) : null;
        const password = String(req.body.password);
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const { rows } = await (0, client_1.query)(`INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'recruiter', true, NOW(), NOW())
         RETURNING id, email, name, role, is_active`, [email, passwordHash, name]);
        return res.status(201).json({ recruiter: rows[0] });
    }
    catch (e) {
        const err = e;
        if ('code' in e && e.code === '23505') {
            return res.status(409).json({ error: 'Recruiter email already exists' });
        }
        console.error('Admin create recruiter error', err);
        return res.status(500).json({ error: 'Failed to create recruiter' });
    }
});
/** GET /admin/recruiters - List all recruiters */
router.get('/recruiters', auth_1.adminAuthMiddleware, async (_req, res) => {
    try {
        const { rows } = await (0, client_1.query)(`SELECT u.id, u.email, u.name, u.created_at, u.is_active, COUNT(s.id)::text AS schedule_count
       FROM users u
       LEFT JOIN scheduled_interviews s ON s.created_by = u.id
       WHERE u.role = 'recruiter'
       GROUP BY u.id, u.email, u.name, u.created_at, u.is_active
       ORDER BY u.created_at DESC`);
        return res.json({ recruiters: rows });
    }
    catch (e) {
        console.error('Admin list recruiters error', e);
        return res.status(500).json({ error: 'Failed to load recruiters' });
    }
});
/** PATCH /admin/recruiters/:id - Manage recruiter access/details */
router.patch('/recruiters/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('name').optional().isString(),
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, name } = req.body;
        const updates = [];
        const params = [];
        let i = 1;
        if (typeof isActive === 'boolean') {
            updates.push(`is_active = $${i}`);
            params.push(isActive);
            i++;
        }
        if (name !== undefined) {
            updates.push(`name = $${i}`);
            params.push(name || null);
            i++;
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }
        updates.push('updated_at = NOW()');
        params.push(id);
        const { rows } = await (0, client_1.query)(`UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${i} AND role = 'recruiter'
         RETURNING id, email, name, is_active`, params);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recruiter not found' });
        }
        return res.json({ recruiter: rows[0] });
    }
    catch (e) {
        console.error('Admin update recruiter error', e);
        return res.status(500).json({ error: 'Failed to update recruiter' });
    }
});
/** DELETE /admin/recruiters/:id - Remove recruiter */
router.delete('/recruiters/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await (0, client_1.query)(`DELETE FROM users WHERE id = $1 AND role = 'recruiter'`, [id]);
        return res.json({ deleted: (rowCount ?? 0) > 0 });
    }
    catch (e) {
        console.error('Admin delete recruiter error', e);
        return res.status(500).json({ error: 'Failed to delete recruiter' });
    }
});
/** GET /admin/overview - App-wide counters and latest schedules */
router.get('/overview', auth_1.adminAuthMiddleware, async (_req, res) => {
    try {
        const [{ rows: recruiterRows }, { rows: candidateRows }, { rows: interviewRows }, { rows: scheduleRows }] = await Promise.all([
            (0, client_1.query)(`SELECT COUNT(*)::text AS total FROM users WHERE role = 'recruiter'`),
            (0, client_1.query)(`SELECT COUNT(*)::text AS total FROM candidates`),
            (0, client_1.query)(`SELECT COUNT(*)::text AS total FROM interviews`),
            (0, client_1.query)(`SELECT s.id, s.candidate_email, s.candidate_name, s.role, s.scheduled_at, s.status, s.join_token, s.interview_id,
                u.name AS recruiter_name, u.email AS recruiter_email
         FROM scheduled_interviews s
         LEFT JOIN users u ON u.id = s.created_by
         ORDER BY s.created_at DESC
         LIMIT 10`),
        ]);
        return res.json({
            metrics: {
                recruiters: Number(recruiterRows[0]?.total ?? 0),
                candidates: Number(candidateRows[0]?.total ?? 0),
                interviews: Number(interviewRows[0]?.total ?? 0),
            },
            latestSchedules: scheduleRows.map((row) => ({
                ...row,
                joinUrl: `${config_1.config.frontendUrl}/interview/join/${String(row.join_token)}`,
            })),
        });
    }
    catch (e) {
        console.error('Admin overview error', e);
        return res.status(500).json({ error: 'Failed to load overview' });
    }
});
/** POST /admin/schedule - Create scheduled interview, return join URL */
router.post('/schedule', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.body)('candidateEmail').isEmail(),
    (0, express_validator_1.body)('candidateName').optional().isString(),
    (0, express_validator_1.body)('role').isIn(ROLES),
    (0, express_validator_1.body)('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('positionId').optional().isUUID(),
]), async (req, res) => {
    try {
        const { candidateEmail, candidateName, role, scheduledAt, positionId } = req.body;
        const joinToken = crypto_1.default.randomBytes(32).toString('hex');
        const { rows } = await (0, client_1.query)(`INSERT INTO scheduled_interviews (id, candidate_email, candidate_name, role, scheduled_at, join_token, position_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::timestamptz, $5, $6, NOW(), NOW())
         RETURNING id, candidate_email, candidate_name, role, scheduled_at, status, join_token`, [candidateEmail, candidateName || null, role, scheduledAt, joinToken, positionId || null]);
        if (rows.length === 0) {
            return res.status(500).json({ error: 'Failed to create schedule' });
        }
        const row = rows[0];
        const joinUrl = `${config_1.config.frontendUrl}/interview/join/${row.join_token}`;
        res.status(201).json({
            id: row.id,
            joinToken: row.join_token,
            joinUrl,
            candidateEmail: row.candidate_email,
            candidateName: row.candidate_name,
            role: row.role,
            scheduledAt: row.scheduled_at,
            status: row.status,
        });
    }
    catch (e) {
        const err = e;
        console.error('Admin create schedule error', err);
        const message = config_1.config.env === 'development' ? err.message : 'Failed to create schedule';
        res.status(500).json({ error: message });
    }
});
/** GET /admin/schedules - List scheduled interviews (optional ?status=) */
router.get('/schedules', auth_1.adminAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.query)('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled'])]), async (req, res) => {
    try {
        const status = req.query.status;
        const sql = status
            ? `SELECT id, candidate_email, candidate_name, role, scheduled_at, status, join_token, interview_id, created_at
           FROM scheduled_interviews WHERE status = $1 ORDER BY scheduled_at DESC`
            : `SELECT id, candidate_email, candidate_name, role, scheduled_at, status, join_token, interview_id, created_at
           FROM scheduled_interviews ORDER BY scheduled_at DESC`;
        const params = status ? [status] : [];
        const { rows } = await (0, client_1.query)(sql, params);
        const baseUrl = config_1.config.frontendUrl;
        const schedules = rows.map((r) => ({
            ...r,
            joinUrl: `${baseUrl}/interview/join/${r.join_token}`,
        }));
        res.json({ schedules });
    }
    catch (e) {
        console.error('Admin get schedules error', e);
        res.status(500).json({ error: 'Failed to load schedules' });
    }
});
/** GET /admin/schedule/:id - Get one schedule with join URL */
router.get('/schedule/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const { rows } = await (0, client_1.query)(`SELECT id, candidate_email, candidate_name, role, scheduled_at, status, join_token, interview_id, created_at
         FROM scheduled_interviews WHERE id = $1`, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        const row = rows[0];
        res.json({ ...row, joinUrl: `${config_1.config.frontendUrl}/interview/join/${row.join_token}` });
    }
    catch (e) {
        console.error('Admin get schedule error', e);
        res.status(500).json({ error: 'Failed to load schedule' });
    }
});
/** PATCH /admin/schedule/:id - Update schedule (scheduledAt, status) */
router.patch('/schedule/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('scheduledAt').optional().isISO8601(),
    (0, express_validator_1.body)('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt, status } = req.body;
        const updates = [];
        const params = [];
        let i = 1;
        if (scheduledAt !== undefined) {
            updates.push(`scheduled_at = $${i}::timestamptz`);
            params.push(scheduledAt);
            i++;
        }
        if (status !== undefined) {
            updates.push(`status = $${i}`);
            params.push(status);
            i++;
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);
        const { rowCount } = await (0, client_1.query)(`UPDATE scheduled_interviews SET ${updates.join(', ')} WHERE id = $${i}`, params);
        res.json({ updated: (rowCount ?? 0) > 0 });
    }
    catch (e) {
        console.error('Admin update schedule error', e);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});
/** DELETE /admin/schedule/:id - Delete a scheduled interview */
router.delete('/schedule/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await (0, client_1.query)(`DELETE FROM scheduled_interviews WHERE id = $1`, [id]);
        res.json({ deleted: (rowCount ?? 0) > 0 });
    }
    catch (e) {
        console.error('Admin delete schedule error', e);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
// ---- Question bank (interview questions; coding questions for technical) ----
/** GET /admin/questions - List question templates (optional ?role= & ?phase=) */
router.get('/questions', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.query)('role').optional().isIn(ROLES),
    (0, express_validator_1.query)('phase').optional().isIn(PHASES),
]), async (req, res) => {
    try {
        const role = req.query.role;
        const phase = req.query.phase;
        const questions = await questionTemplateService.listQuestionTemplates({ role, phase });
        res.json({ questions });
    }
    catch (e) {
        console.error('Admin list questions error', e);
        res.status(500).json({ error: 'Failed to list questions' });
    }
});
/** POST /admin/questions - Create a question template (general or coding for technical) */
router.post('/questions', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.body)('role').isIn(ROLES),
    (0, express_validator_1.body)('phase').isIn(PHASES),
    (0, express_validator_1.body)('difficulty').isIn(DIFFICULTIES),
    (0, express_validator_1.body)('text').isString().notEmpty().withMessage('Question text is required'),
    (0, express_validator_1.body)('competencyIds').optional().isArray(),
    (0, express_validator_1.body)('followUpPrompt').optional().isString(),
    (0, express_validator_1.body)('isCodingQuestion').optional().isBoolean(),
    (0, express_validator_1.body)('starterCode').optional().isString(),
    (0, express_validator_1.body)('language').optional().isString(),
    (0, express_validator_1.body)('sortOrder').optional().isInt(),
]), async (req, res) => {
    try {
        const created = await questionTemplateService.createQuestionTemplate({
            role: req.body.role,
            phase: req.body.phase,
            difficulty: req.body.difficulty,
            text: req.body.text,
            competencyIds: req.body.competencyIds,
            followUpPrompt: req.body.followUpPrompt,
            isCodingQuestion: req.body.isCodingQuestion,
            starterCode: req.body.starterCode,
            language: req.body.language,
            sortOrder: req.body.sortOrder,
        });
        res.status(201).json(created);
    }
    catch (e) {
        const err = e;
        console.error('Admin create question error', err);
        const message = process.env.NODE_ENV === 'development' ? err.message : 'Failed to create question';
        res.status(500).json({ error: message });
    }
});
/** PATCH /admin/questions/:id - Update a question template */
router.patch('/questions/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('phase').optional().isIn(PHASES),
    (0, express_validator_1.body)('difficulty').optional().isIn(DIFFICULTIES),
    (0, express_validator_1.body)('text').optional().isString(),
    (0, express_validator_1.body)('competencyIds').optional().isArray(),
    (0, express_validator_1.body)('followUpPrompt').optional().isString(),
    (0, express_validator_1.body)('isCodingQuestion').optional().isBoolean(),
    (0, express_validator_1.body)('starterCode').optional().isString(),
    (0, express_validator_1.body)('language').optional().isString(),
    (0, express_validator_1.body)('sortOrder').optional().isInt(),
]), async (req, res) => {
    try {
        const updated = await questionTemplateService.updateQuestionTemplate(req.params.id, {
            phase: req.body.phase,
            difficulty: req.body.difficulty,
            text: req.body.text,
            competencyIds: req.body.competencyIds,
            followUpPrompt: req.body.followUpPrompt,
            isCodingQuestion: req.body.isCodingQuestion,
            starterCode: req.body.starterCode,
            language: req.body.language,
            sortOrder: req.body.sortOrder,
        });
        if (!updated)
            return res.status(400).json({ error: 'No updates provided' });
        res.json(updated);
    }
    catch (e) {
        console.error('Admin update question error', e);
        res.status(500).json({ error: 'Failed to update question' });
    }
});
/** DELETE /admin/questions/:id */
router.delete('/questions/:id', auth_1.adminAuthMiddleware, (0, validate_1.validate)([(0, express_validator_1.param)('id').isUUID()]), async (req, res) => {
    try {
        const deleted = await questionTemplateService.deleteQuestionTemplate(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Question not found' });
        res.json({ deleted: true });
    }
    catch (e) {
        console.error('Admin delete question error', e);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});
exports.adminRoutes = router;
//# sourceMappingURL=admin.js.map