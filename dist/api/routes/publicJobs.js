"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicJobsRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const validate_1 = require("../middleware/validate");
const client_1 = require("../../db/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const resumeUploadDir = path_1.default.resolve(process.cwd(), 'uploads', 'resumes');
fs_1.default.mkdirSync(resumeUploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, resumeUploadDir);
    },
    filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only PDF/DOC/DOCX files are allowed'));
    },
});
const ROLES = ['technical', 'behavioral', 'sales', 'customer_success'];
router.get('/', async (_req, res) => {
    try {
        const { rows } = await (0, client_1.query)(`SELECT id, title, company_name, description, requirements, location, salary_range, role, created_at
       FROM positions
       WHERE is_active = true
       ORDER BY created_at DESC`);
        return res.json({ jobs: rows });
    }
    catch (e) {
        console.error('Public jobs list error', e);
        return res.status(500).json({ error: 'Failed to load jobs' });
    }
});
router.get('/:positionId', (0, validate_1.validate)([(0, express_validator_1.param)('positionId').isUUID()]), async (req, res) => {
    try {
        const { rows } = await (0, client_1.query)(`SELECT id, title, company_name, description, requirements, location, salary_range, role, created_at
         FROM positions
         WHERE id = $1 AND is_active = true
         LIMIT 1`, [req.params.positionId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        return res.json({ job: rows[0] });
    }
    catch (e) {
        console.error('Public job detail error', e);
        return res.status(500).json({ error: 'Failed to load job' });
    }
});
router.post('/resume-upload', upload.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Resume file is required' });
    }
    const host = `${req.protocol}://${req.get('host')}`;
    const resumeUrl = `${host}/uploads/resumes/${req.file.filename}`;
    return res.status(201).json({
        resumeUrl,
        fileName: req.file.originalname,
    });
});
router.post('/:positionId/apply', auth_1.optionalAuth, (0, validate_1.validate)([
    (0, express_validator_1.param)('positionId').isUUID(),
    (0, express_validator_1.body)('name').isString().notEmpty(),
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('resumeUrl')
        .optional({ values: 'falsy' })
        .isURL({ require_protocol: true, require_tld: false }),
    (0, express_validator_1.body)('coverLetter').optional().isString(),
    (0, express_validator_1.body)('phone').optional().isString(),
    (0, express_validator_1.body)('location').optional().isString(),
    (0, express_validator_1.body)('linkedinUrl').optional({ values: 'falsy' }).isURL({ require_protocol: true, require_tld: false }),
    (0, express_validator_1.body)('portfolioUrl').optional({ values: 'falsy' }).isURL({ require_protocol: true, require_tld: false }),
]), async (req, res) => {
    try {
        const { positionId } = req.params;
        const { name, email, resumeUrl, coverLetter, phone, location, linkedinUrl, portfolioUrl } = req.body;
        const { rows: positionRows } = await (0, client_1.query)(`SELECT id, role, is_active FROM positions WHERE id = $1 LIMIT 1`, [positionId]);
        if (positionRows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        if (!positionRows[0].is_active) {
            return res.status(410).json({ error: 'This job is no longer accepting applications' });
        }
        if (!ROLES.includes(positionRows[0].role)) {
            return res.status(400).json({ error: 'Invalid job role configured' });
        }
        let candidateId;
        const user = req.user;
        const normalizedEmail = email.toLowerCase();
        const authCandidateId = user?.type === 'candidate' ? user.candidateId : null;
        if (authCandidateId) {
            const { rows: authCandidateRows } = await (0, client_1.query)(`SELECT id, email FROM candidates WHERE id = $1 LIMIT 1`, [authCandidateId]);
            if (authCandidateRows.length === 0) {
                return res.status(401).json({ error: 'Candidate account not found' });
            }
            candidateId = authCandidateRows[0].id;
            await (0, client_1.query)(`UPDATE candidates
           SET name = COALESCE($2, name),
               email = COALESCE($3, email),
               phone = COALESCE($4, phone),
               location = COALESCE($5, location),
               linkedin_url = COALESCE($6, linkedin_url),
               portfolio_url = COALESCE($7, portfolio_url),
               updated_at = NOW()
           WHERE id = $1`, [candidateId, name, normalizedEmail, phone ?? null, location ?? null, linkedinUrl ?? null, portfolioUrl ?? null]);
        }
        else {
            const { rows: candidateRows } = await (0, client_1.query)(`SELECT id FROM candidates WHERE email = $1 LIMIT 1`, [normalizedEmail]);
            if (candidateRows.length > 0) {
                candidateId = candidateRows[0].id;
                await (0, client_1.query)(`UPDATE candidates SET name = COALESCE($2, name), updated_at = NOW() WHERE id = $1`, [candidateId, name]);
            }
            else {
                const { rows: insertCandidateRows } = await (0, client_1.query)(`INSERT INTO candidates (id, email, name, phone, location, linkedin_url, portfolio_url, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`, [normalizedEmail, name, phone ?? null, location ?? null, linkedinUrl ?? null, portfolioUrl ?? null]);
                candidateId = insertCandidateRows[0].id;
            }
        }
        const { rows: applicationRows } = await (0, client_1.query)(`INSERT INTO applications (id, candidate_id, position_id, resume_url, cover_letter, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW(), NOW())
         RETURNING id, candidate_id, position_id, resume_url, cover_letter, status, created_at`, [candidateId, positionId, resumeUrl?.trim() ? resumeUrl.trim() : null, coverLetter ?? null]);
        return res.status(201).json({ application: applicationRows[0] });
    }
    catch (e) {
        console.error('Public apply to job error', e);
        return res.status(500).json({ error: 'Failed to submit application' });
    }
});
exports.publicJobsRoutes = router;
//# sourceMappingURL=publicJobs.js.map