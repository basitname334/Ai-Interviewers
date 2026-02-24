"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResumeContext = buildResumeContext;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const pdf_parse_1 = require("pdf-parse");
const mammoth_1 = __importDefault(require("mammoth"));
async function buildResumeContext(input) {
    const parts = [];
    if (input.candidateName)
        parts.push(`Candidate name: ${input.candidateName}`);
    if (input.positionTitle)
        parts.push(`Applied position: ${input.positionTitle}`);
    if (input.coverLetter?.trim()) {
        parts.push(`Candidate cover/profile details:\n${cleanText(input.coverLetter)}`);
    }
    const resumeText = await readResumeText(input.resumeUrl);
    if (resumeText) {
        parts.push(`Resume extracted content (use this for personalized follow-up questions):\n${resumeText}`);
    }
    if (parts.length === 0)
        return undefined;
    return cleanText(parts.join('\n\n')).slice(0, 5000);
}
async function readResumeText(resumeUrl) {
    if (!resumeUrl)
        return '';
    const localPath = resolveLocalResumePath(resumeUrl);
    if (!localPath)
        return '';
    const ext = path_1.default.extname(localPath).toLowerCase();
    try {
        const fileBuffer = await promises_1.default.readFile(localPath);
        if (ext === '.pdf') {
            const parser = new pdf_parse_1.PDFParse({ data: fileBuffer });
            try {
                const result = await parser.getText();
                return cleanText(result.text).slice(0, 3500);
            }
            finally {
                await parser.destroy();
            }
        }
        if (ext === '.docx') {
            const parsed = await mammoth_1.default.extractRawText({ buffer: fileBuffer });
            return cleanText(parsed.value).slice(0, 3500);
        }
        if (ext === '.txt' || ext === '.md') {
            return cleanText(fileBuffer.toString('utf8')).slice(0, 3500);
        }
    }
    catch (e) {
        console.warn('[ResumeContext] Unable to parse resume:', e instanceof Error ? e.message : e);
    }
    return '';
}
function resolveLocalResumePath(resumeUrl) {
    try {
        const parsed = new url_1.URL(resumeUrl);
        if (!parsed.pathname.startsWith('/uploads/resumes/'))
            return null;
        const fileName = path_1.default.basename(parsed.pathname);
        return path_1.default.resolve(process.cwd(), 'uploads', 'resumes', fileName);
    }
    catch {
        return null;
    }
}
function cleanText(value) {
    return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
//# sourceMappingURL=ResumeContextService.js.map