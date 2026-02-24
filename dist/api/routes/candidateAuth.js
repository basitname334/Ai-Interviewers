"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateAuthRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../../db/client");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const config_1 = require("../../config");
const router = (0, express_1.Router)();
router.post('/signup', (0, validate_1.validate)([
    (0, express_validator_1.body)('name').isString().notEmpty(),
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isString().isLength({ min: 6 }),
    (0, express_validator_1.body)('phone').optional().isString(),
    (0, express_validator_1.body)('location').optional().isString(),
    (0, express_validator_1.body)('linkedinUrl').optional().isURL({ require_protocol: true, require_tld: false }),
    (0, express_validator_1.body)('portfolioUrl').optional().isURL({ require_protocol: true, require_tld: false }),
]), async (req, res) => {
    try {
        const { name, email, password, phone, location, linkedinUrl, portfolioUrl } = req.body;
        const normalizedEmail = email.toLowerCase();
        const { rows: existsRows } = await (0, client_1.query)(`SELECT id FROM candidate_accounts WHERE email = $1 LIMIT 1`, [normalizedEmail]);
        if (existsRows.length > 0) {
            return res.status(409).json({ error: 'Email already registered. Please log in.' });
        }
        const { rows: candidateRows } = await (0, client_1.query)(`INSERT INTO candidates (id, email, name, phone, location, linkedin_url, portfolio_url, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, email, phone, location, linkedin_url, portfolio_url`, [normalizedEmail, name, phone ?? null, location ?? null, linkedinUrl ?? null, portfolioUrl ?? null]);
        const candidate = candidateRows[0];
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await (0, client_1.query)(`INSERT INTO candidate_accounts (id, candidate_id, email, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`, [candidate.id, normalizedEmail, passwordHash]);
        const token = jsonwebtoken_1.default.sign({ sub: normalizedEmail, email: normalizedEmail, type: 'candidate', candidateId: candidate.id }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        return res.status(201).json({
            token,
            candidate: {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
                linkedinUrl: candidate.linkedin_url,
                portfolioUrl: candidate.portfolio_url,
            },
        });
    }
    catch (e) {
        console.error('Candidate signup error', e);
        return res.status(500).json({ error: 'Failed to sign up' });
    }
});
router.post('/login', (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail(), (0, express_validator_1.body)('password').isString().notEmpty()]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();
        const { rows } = await (0, client_1.query)(`SELECT ca.candidate_id, ca.email, ca.password_hash, c.name, c.phone, c.location, c.linkedin_url, c.portfolio_url
         FROM candidate_accounts ca
         INNER JOIN candidates c ON c.id = ca.candidate_id
         WHERE ca.email = $1
         LIMIT 1`, [normalizedEmail]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = rows[0];
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ sub: user.email, email: user.email, type: 'candidate', candidateId: user.candidate_id }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        return res.json({
            token,
            candidate: {
                id: user.candidate_id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location,
                linkedinUrl: user.linkedin_url,
                portfolioUrl: user.portfolio_url,
            },
        });
    }
    catch (e) {
        console.error('Candidate login error', e);
        return res.status(500).json({ error: 'Failed to log in' });
    }
});
router.get('/me', auth_1.candidateAuthMiddleware, async (req, res) => {
    const user = req.user;
    if (!user.candidateId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const { rows } = await (0, client_1.query)(`SELECT id, name, email, phone, location, linkedin_url, portfolio_url
     FROM candidates
     WHERE id = $1
     LIMIT 1`, [user.candidateId]);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = rows[0];
    return res.json({
        candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            linkedinUrl: candidate.linkedin_url,
            portfolioUrl: candidate.portfolio_url,
        },
    });
});
router.get('/applications', auth_1.candidateAuthMiddleware, async (req, res) => {
    const user = req.user;
    if (!user.candidateId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const { rows } = await (0, client_1.query)(`SELECT id, position_id, status, created_at
     FROM applications
     WHERE candidate_id = $1
     ORDER BY created_at DESC`, [user.candidateId]);
    return res.json({ applications: rows });
});
router.get('/dashboard', auth_1.candidateAuthMiddleware, async (req, res) => {
    const user = req.user;
    if (!user.candidateId) {
        return res.status(401).json({ error: 'Invalid token payload' });
    }
    const { rows: profileRows } = await (0, client_1.query)(`SELECT id, name, email, phone, location, linkedin_url, portfolio_url
     FROM candidates
     WHERE id = $1
     LIMIT 1`, [user.candidateId]);
    if (profileRows.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
    }
    const profile = profileRows[0];
    const { rows: applicationRows } = await (0, client_1.query)(`SELECT a.id AS application_id, a.status AS application_status, a.created_at AS applied_at, a.resume_url,
            p.id AS position_id, p.title AS position_title, p.company_name, p.role AS position_role,
            si.id AS schedule_id, si.scheduled_at, si.status AS schedule_status, si.join_token, si.interview_id
     FROM applications a
     INNER JOIN positions p ON p.id = a.position_id
     LEFT JOIN scheduled_interviews si ON si.application_id = a.id
     WHERE a.candidate_id = $1
     ORDER BY a.created_at DESC`, [user.candidateId]);
    const applications = applicationRows.map((row) => ({
        id: row.application_id,
        status: row.application_status,
        appliedAt: row.applied_at,
        resumeUrl: row.resume_url,
        position: {
            id: row.position_id,
            title: row.position_title,
            companyName: row.company_name,
            role: row.position_role,
        },
        schedule: row.schedule_id
            ? {
                id: row.schedule_id,
                scheduledAt: row.scheduled_at,
                status: row.schedule_status,
                joinUrl: row.join_token ? `${config_1.config.frontendUrl}/interview/join/${row.join_token}` : null,
                interviewId: row.interview_id,
                reportUrl: row.interview_id ? `${config_1.config.frontendUrl}/report/${row.interview_id}` : null,
            }
            : null,
    }));
    return res.json({
        profile: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            linkedinUrl: profile.linkedin_url,
            portfolioUrl: profile.portfolio_url,
        },
        applications,
    });
});
exports.candidateAuthRoutes = router;
//# sourceMappingURL=candidateAuth.js.map