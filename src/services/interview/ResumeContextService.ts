import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function buildResumeContext(input: {
  resumeUrl?: string | null;
  coverLetter?: string | null;
  candidateName?: string | null;
  positionTitle?: string | null;
}): Promise<string | undefined> {
  const parts: string[] = [];
  if (input.candidateName) parts.push(`Candidate name: ${input.candidateName}`);
  if (input.positionTitle) parts.push(`Applied position: ${input.positionTitle}`);
  if (input.coverLetter?.trim()) {
    parts.push(`Candidate cover/profile details:\n${cleanText(input.coverLetter)}`);
  }

  const resumeText = await readResumeText(input.resumeUrl);
  if (resumeText) {
    parts.push(`Resume extracted content (use this for personalized follow-up questions):\n${resumeText}`);
  }

  if (parts.length === 0) return undefined;
  return cleanText(parts.join('\n\n')).slice(0, 5000);
}

async function readResumeText(resumeUrl?: string | null): Promise<string> {
  if (!resumeUrl) return '';
  const localPath = resolveLocalResumePath(resumeUrl);
  if (!localPath) return '';

  const ext = path.extname(localPath).toLowerCase();
  try {
    const fileBuffer = await fs.readFile(localPath);
    if (ext === '.pdf') {
      const parser = new PDFParse({ data: fileBuffer });
      try {
        const result = await parser.getText();
        return cleanText(result.text).slice(0, 3500);
      } finally {
        await parser.destroy();
      }
    }
    if (ext === '.docx') {
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
      return cleanText(parsed.value).slice(0, 3500);
    }
    if (ext === '.txt' || ext === '.md') {
      return cleanText(fileBuffer.toString('utf8')).slice(0, 3500);
    }
  } catch (e) {
    console.warn('[ResumeContext] Unable to parse resume:', e instanceof Error ? e.message : e);
  }
  return '';
}

function resolveLocalResumePath(resumeUrl: string): string | null {
  try {
    const parsed = new URL(resumeUrl);
    if (!parsed.pathname.startsWith('/uploads/resumes/')) return null;
    const fileName = path.basename(parsed.pathname);
    return path.resolve(process.cwd(), 'uploads', 'resumes', fileName);
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
