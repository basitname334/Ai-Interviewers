/**
 * API client for backend. Uses Next.js rewrites so /api/backend/* -> localhost:4000/api/v1/*
 * In production, set NEXT_PUBLIC_API_URL or use same-origin.
 */

import type {
  InterviewRole,
  InterviewState,
  InterviewReport,
  StartInterviewResponse,
  SubmitAnswerResponse,
} from '@/types';

// Use same-origin proxy so the browser never hits :4000 directly (avoids ERR_CONNECTION_REFUSED).
// Next.js api/proxy/[...path] forwards to the backend; if backend is down you get a clear 503 message.
// BACKEND_URL = backend origin only (e.g. https://your-backend.onrender.com); /api/v1 is appended server-side.
const getBase = () => {
  if (typeof window !== 'undefined') {
    return '/api/proxy';
  }
  const origin = process.env.BACKEND_URL || 'http://127.0.0.1:4000';
  return `${origin}/api/v1`;
};

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = getBase();
  const pathStr = path.startsWith('http') ? path : `${base}${path}`;
  const url =
    pathStr.startsWith('http') || pathStr.startsWith('//')
      ? new URL(pathStr)
      : new URL(
          pathStr,
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        );
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startInterview(body: { candidateId: string; role: InterviewRole; positionId?: string }) {
    return request<StartInterviewResponse>('/interview/start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  submitAnswer(interviewId: string, answerText: string) {
    return request<SubmitAnswerResponse>(`/interview/${interviewId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answerText }),
    });
  },

  getState(interviewId: string) {
    return request<InterviewState>(`/interview/${interviewId}/state`);
  },

  endInterview(interviewId: string) {
    return request<{ ended: boolean; report?: InterviewReport }>(`/interview/${interviewId}/end`, {
      method: 'POST',
    });
  },

  getReport(interviewId: string) {
    return request<InterviewReport>(`/report/${interviewId}`);
  },

  // Admin
  adminLogin(email: string, password: string) {
    return request<{ token: string; email: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  adminCreateSchedule(body: {
    candidateEmail: string;
    candidateName?: string;
    role: InterviewRole;
    scheduledAt: string;
    positionId?: string;
  }) {
    return request<AdminSchedule>('/admin/schedule', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: adminAuthHeaders(),
    });
  },

  adminGetSchedules(status?: string) {
    const path = status ? `/admin/schedules?status=${encodeURIComponent(status)}` : '/admin/schedules';
    return request<{ schedules: AdminScheduleRow[] }>(path, { headers: adminAuthHeaders() });
  },

  adminGetSchedule(id: string) {
    return request<AdminScheduleRow & { joinUrl: string }>(`/admin/schedule/${id}`, {
      headers: adminAuthHeaders(),
    });
  },

  adminUpdateSchedule(id: string, updates: { scheduledAt?: string; status?: string }) {
    return request<{ updated: boolean }>(`/admin/schedule/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: adminAuthHeaders(),
    });
  },

  adminDeleteSchedule(id: string) {
    return request<{ deleted: boolean }>(`/admin/schedule/${id}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(),
    });
  },

  adminGetQuestions(filters?: { role?: string; phase?: string }) {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.phase) params.set('phase', filters.phase);
    const qs = params.toString();
    return request<{ questions: AdminQuestionRow[] }>(`/admin/questions${qs ? `?${qs}` : ''}`, { headers: adminAuthHeaders() });
  },

  adminCreateQuestion(body: AdminQuestionCreate) {
    return request<AdminQuestionRow>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: adminAuthHeaders(),
    });
  },

  adminUpdateQuestion(id: string, updates: AdminQuestionUpdate) {
    return request<AdminQuestionRow>(`/admin/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: adminAuthHeaders(),
    });
  },

  adminDeleteQuestion(id: string) {
    return request<{ deleted: boolean }>(`/admin/questions/${id}`, { method: 'DELETE', headers: adminAuthHeaders() });
  },

  adminGetRecruiters() {
    return request<{ recruiters: AdminRecruiterRow[] }>('/admin/recruiters', {
      headers: adminAuthHeaders(),
    });
  },

  adminCreateRecruiter(body: { email: string; password: string; name?: string }) {
    return request<{ recruiter: AdminRecruiterCreateResponse }>('/admin/recruiters', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: adminAuthHeaders(),
    });
  },

  adminUpdateRecruiter(id: string, updates: { isActive?: boolean; name?: string }) {
    return request<{ recruiter: AdminRecruiterCreateResponse }>(`/admin/recruiters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: adminAuthHeaders(),
    });
  },

  adminDeleteRecruiter(id: string) {
    return request<{ deleted: boolean }>(`/admin/recruiters/${id}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(),
    });
  },

  adminGetOverview() {
    return request<AdminOverviewResponse>('/admin/overview', {
      headers: adminAuthHeaders(),
    });
  },

  recruiterLogin(email: string, password: string) {
    return request<{ token: string; recruiter: RecruiterIdentity }>('/recruiter/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  recruiterMe() {
    return request<{ recruiter: RecruiterIdentity }>('/recruiter/me', {
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterGetSchedules() {
    return request<{ schedules: AdminScheduleRow[] }>('/recruiter/schedules', {
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterCreateSchedule(body: {
    candidateEmail: string;
    candidateName?: string;
    role: InterviewRole;
    scheduledAt: string;
    positionId?: string;
    message?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    customQuestions?: RecruiterCustomQuestionInput[];
    codingQuestions?: RecruiterCustomQuestionInput[];
  }) {
    return request<AdminSchedule>('/recruiter/schedule', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterUpdateSchedule(id: string, updates: { scheduledAt?: string; status?: string }) {
    return request<{ updated: boolean }>(`/recruiter/schedule/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterDeleteSchedule(id: string) {
    return request<{ deleted: boolean }>(`/recruiter/schedule/${id}`, {
      method: 'DELETE',
      headers: recruiterAuthHeaders(),
    });
  },

  // Public join (no auth)
  publicGetJoinInfo(token: string) {
    return request<PublicJoinInfo>(`/public/join/${token}`);
  },

  publicStartJoin(token: string) {
    return request<PublicJoinStartResponse>(`/public/join/${token}/start`, {
      method: 'POST',
    });
  },

  publicGetJobs() {
    return request<{ jobs: PublicJob[] }>('/public/jobs');
  },

  publicGetJob(positionId: string) {
    return request<{ job: PublicJob }>(`/public/jobs/${positionId}`);
  },

  publicUploadResume(file: File) {
    const form = new FormData();
    form.append('resume', file);
    return request<{ resumeUrl: string; fileName: string }>('/public/jobs/resume-upload', {
      method: 'POST',
      body: form,
    });
  },

  publicApplyToJob(
    positionId: string,
    body: {
      name: string;
      email: string;
      resumeUrl?: string;
      coverLetter?: string;
      phone?: string;
      location?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
    }
  ) {
    return request<{ application: PublicApplication }>(`/public/jobs/${positionId}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: candidateAuthHeaders(),
    });
  },

  candidateSignup(body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
  }) {
    return request<{ token: string; candidate: CandidateIdentity }>('/candidate/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  candidateLogin(email: string, password: string) {
    return request<{ token: string; candidate: CandidateIdentity }>('/candidate/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  candidateMe() {
    return request<{ candidate: CandidateIdentity }>('/candidate/me', {
      headers: candidateAuthHeaders(),
    });
  },

  candidateGetApplications() {
    return request<{ applications: CandidateApplicationStatus[] }>('/candidate/applications', {
      headers: candidateAuthHeaders(),
    });
  },

  candidateGetDashboard() {
    return request<CandidateDashboardResponse>('/candidate/dashboard', {
      headers: candidateAuthHeaders(),
    });
  },

  recruiterGetJobs() {
    return request<{ jobs: RecruiterJob[] }>('/recruiter/jobs', {
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterCreateJob(body: {
    title: string;
    companyName?: string;
    description?: string;
    requirements?: string;
    location?: string;
    salaryRange?: string;
    role: InterviewRole;
  }) {
    return request<{ job: RecruiterJob }>('/recruiter/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterGetApplications() {
    return request<{ applications: RecruiterApplication[] }>('/recruiter/applications', {
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterDeleteJob(id: string) {
    return request<{ deleted: boolean }>(`/recruiter/jobs/${id}`, {
      method: 'DELETE',
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterScheduleFromApplication(
    applicationId: string,
    body: {
      scheduledAt: string;
      role?: InterviewRole;
      message?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      customQuestions?: RecruiterCustomQuestionInput[];
      codingQuestions?: RecruiterCustomQuestionInput[];
      focusAreas?: string;
      durationMinutes?: number;
    }
  ) {
    return request<AdminSchedule>(`/recruiter/applications/${applicationId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterRejectApplication(applicationId: string) {
    return request<{ updated: boolean }>(`/recruiter/applications/${applicationId}/reject`, {
      method: 'POST',
      headers: recruiterAuthHeaders(),
    });
  },

  recruiterDeleteApplication(applicationId: string) {
    return request<{ deleted: boolean }>(`/recruiter/applications/${applicationId}`, {
      method: 'DELETE',
      headers: recruiterAuthHeaders(),
    });
  },
};

export interface AdminSchedule {
  id: string;
  joinToken: string;
  joinUrl: string;
  candidateEmail: string;
  candidateName: string | null;
  role: string;
  scheduledAt: string;
  status: string;
  emailSent?: boolean;
  emailError?: string;
}

export interface RecruiterCustomQuestionInput {
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  starterCode?: string;
}

export interface RecruiterIdentity {
  id: string;
  email: string;
  name: string | null;
}

export interface CandidateIdentity {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface AdminScheduleRow {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  role: string;
  scheduled_at: string;
  status: string;
  join_token: string;
  interview_id: string | null;
  created_at: string;
  joinUrl: string;
}

export interface AdminQuestionRow {
  id: string;
  role: string;
  phase: string;
  difficulty: string;
  text: string;
  competency_ids: string[];
  follow_up_prompt: string | null;
  is_coding_question?: boolean;
  starter_code?: string | null;
  language?: string | null;
  sort_order?: number;
}

export interface AdminQuestionCreate {
  role: string;
  phase: string;
  difficulty: string;
  text: string;
  competencyIds?: string[];
  followUpPrompt?: string;
  isCodingQuestion?: boolean;
  starterCode?: string;
  language?: string;
  sortOrder?: number;
}

export interface AdminQuestionUpdate {
  phase?: string;
  difficulty?: string;
  text?: string;
  competencyIds?: string[];
  followUpPrompt?: string | null;
  isCodingQuestion?: boolean;
  starterCode?: string | null;
  language?: string | null;
  sortOrder?: number;
}

export interface AdminRecruiterRow {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  schedule_count: string;
  is_active: boolean;
}

export interface AdminRecruiterCreateResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
}

export interface AdminOverviewSchedule {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  role: string;
  scheduled_at: string;
  status: string;
  join_token: string;
  interview_id: string | null;
  recruiter_name?: string | null;
  recruiter_email?: string | null;
  joinUrl: string;
}

export interface AdminOverviewResponse {
  metrics: {
    recruiters: number;
    candidates: number;
    interviews: number;
  };
  latestSchedules: AdminOverviewSchedule[];
}

export interface PublicJoinInfo {
  id: string;
  candidateEmail: string;
  candidateName: string | null;
  role: string;
  scheduledAt: string;
  status: string;
  alreadyCompleted?: boolean;
  interviewId?: string | null;
}

export interface PublicJoinStartResponse {
  interviewId: string;
  firstReply: string;
  state: InterviewState;
  alreadyStarted?: boolean;
}

export interface PublicJob {
  id: string;
  title: string;
  company_name: string | null;
  description: string | null;
  requirements: string | null;
  location: string | null;
  salary_range: string | null;
  role: InterviewRole;
  is_active?: boolean;
  created_at: string;
}

export interface PublicApplication {
  id: string;
  candidate_id: string;
  position_id: string;
  resume_url: string | null;
  cover_letter: string | null;
  status: string;
  created_at: string;
}

export interface CandidateApplicationStatus {
  id: string;
  position_id: string;
  status: string;
  created_at: string;
}

export interface CandidateDashboardApplication {
  id: string;
  status: string;
  appliedAt: string;
  resumeUrl: string | null;
  position: {
    id: string;
    title: string;
    companyName: string | null;
    role: string;
  };
  schedule: {
    id: string;
    scheduledAt: string | null;
    status: string | null;
    joinUrl: string | null;
    interviewId: string | null;
    reportUrl: string | null;
  } | null;
}

export interface CandidateDashboardResponse {
  profile: CandidateIdentity;
  applications: CandidateDashboardApplication[];
}

export interface RecruiterJob extends PublicJob {}

export interface RecruiterApplication {
  id: string;
  status: string;
  resume_url: string | null;
  cover_letter: string | null;
  created_at: string;
  candidate_id: string;
  position_id: string;
  candidate_email: string | null;
  candidate_name: string | null;
  position_title: string;
  position_role: InterviewRole;
  interview_email_sent?: boolean | null;
  interview_email_error?: string | null;
}

function authHeaders(key: 'adminToken' | 'recruiterToken' | 'candidateToken'): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(key);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function candidateAuthHeaders(): Record<string, string> {
  return authHeaders('candidateToken');
}

function adminAuthHeaders(): Record<string, string> {
  return authHeaders('adminToken');
}

function recruiterAuthHeaders(): Record<string, string> {
  return authHeaders('recruiterToken');
}
