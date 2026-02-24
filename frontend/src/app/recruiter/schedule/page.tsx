'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type RecruiterApplication, type RecruiterCustomQuestionInput } from '@/lib/api';
import type { InterviewRole } from '@/types';

const roleOptions: Array<{ value: InterviewRole; label: string }> = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

const difficultyOptions = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof difficultyOptions)[number];

export default function RecruiterSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdJoinUrl, setCreatedJoinUrl] = useState('');
  const [application, setApplication] = useState<RecruiterApplication | null>(null);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [role, setRole] = useState<InterviewRole>('technical');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [focusAreas, setFocusAreas] = useState('');
  const [requirements, setRequirements] = useState('');
  const [questionLines, setQuestionLines] = useState('');
  const [codingQuestionLines, setCodingQuestionLines] = useState('');
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [candidateMessage, setCandidateMessage] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    if (!applicationId) {
      setError('Missing application id. Please open this page from the applicants list.');
      setLoading(false);
      return;
    }

    Promise.all([api.recruiterMe(), api.recruiterGetApplications()])
      .then(([, appsRes]) => {
        const app = appsRes.applications.find((item) => item.id === applicationId) ?? null;
        if (!app) {
          setError('Application not found or you no longer have access.');
          return;
        }
        setApplication(app);
        setRole(app.position_role);
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Failed to load scheduling details';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [applicationId, router]);

  const customQuestions = useMemo(
    () => questionLines.split('\n').map((line) => line.trim()).filter(Boolean),
    [questionLines]
  );
  const codingQuestions = useMemo(
    () => codingQuestionLines.split('\n').map((line) => line.trim()).filter(Boolean),
    [codingQuestionLines]
  );

  const scheduleInterview = async () => {
    if (!application) return;
    if (!scheduleDate || !scheduleTime) {
      setError('Please choose both date and time.');
      return;
    }
    if (application.status === 'rejected') {
      setError('Cannot schedule interview for a rejected application.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const metadataSections: string[] = [];
      if (durationMinutes.trim()) metadataSections.push(`Duration: ${durationMinutes.trim()} minutes`);
      if (focusAreas.trim()) metadataSections.push(`Focus areas: ${focusAreas.trim()}`);
      if (requirements.trim()) metadataSections.push(`Additional requirements: ${requirements.trim()}`);
      const messageParts = [candidateMessage.trim(), metadataSections.join('\n\n')].filter(Boolean);
      const customQuestionPayload: RecruiterCustomQuestionInput[] = customQuestions.map((text) => ({
        text,
        difficulty,
      }));
      const codingQuestionPayload: RecruiterCustomQuestionInput[] =
        role === 'technical'
          ? codingQuestions.map((text) => ({
              text,
              difficulty,
              language: codingLanguage,
              starterCode: starterCode.trim() || undefined,
            }))
          : [];

      const created = await api.recruiterScheduleFromApplication(application.id, {
        scheduledAt,
        role,
        difficulty,
        customQuestions: customQuestionPayload,
        codingQuestions: codingQuestionPayload,
        message: messageParts.join('\n\n'),
        focusAreas: focusAreas.trim() || undefined,
        durationMinutes: durationMinutes.trim() ? parseInt(durationMinutes, 10) : undefined,
      });
      setCreatedJoinUrl(created.joinUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Schedule Interview"
      subtitle="Configure interview details and questions"
      backHref="/recruiter/applicants"
      backLabel="Applicants"
      theme="light"
    >
      <div className="space-y-6">
        {error && <p className="rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
        {createdJoinUrl && (
          <Card className="rounded-2xl border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">Interview created successfully.</p>
            <p className="mt-2 break-all text-xs text-emerald-800">{createdJoinUrl}</p>
            <div className="mt-3">
              <Link
                href="/recruiter/applicants"
                className="inline-flex rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700"
              >
                Back to applicants
              </Link>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <p className="text-sm font-medium text-slate-600">Loading application…</p>
          ) : application ? (
            <>
              <div className="mb-4">
                <p className="text-base font-semibold text-slate-900">{application.candidate_name || 'Candidate'}</p>
                <p className="text-sm text-slate-600">{application.candidate_email || 'No email provided'}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {application.position_title} • {application.position_role}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as InterviewRole)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option} value={option}>
                      Difficulty: {option}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="Focus areas (e.g. APIs, system design)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                />
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Interview requirements (camera on, coding task, etc.)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                />
                <textarea
                  rows={6}
                  value={questionLines}
                  onChange={(e) => setQuestionLines(e.target.value)}
                  placeholder="Custom questions (one per line)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                />
                {role === 'technical' && (
                  <>
                    <textarea
                      rows={5}
                      value={codingQuestionLines}
                      onChange={(e) => setCodingQuestionLines(e.target.value)}
                      placeholder="Coding/programming questions (one per line)"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                    />
                    <select
                      value={codingLanguage}
                      onChange={(e) => setCodingLanguage(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="javascript">Coding language: JavaScript</option>
                      <option value="typescript">Coding language: TypeScript</option>
                      <option value="python">Coding language: Python</option>
                      <option value="java">Coding language: Java</option>
                      <option value="cpp">Coding language: C++</option>
                      <option value="go">Coding language: Go</option>
                    </select>
                    <textarea
                      rows={5}
                      value={starterCode}
                      onChange={(e) => setStarterCode(e.target.value)}
                      placeholder="Starter code for coding questions (optional)"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                    />
                  </>
                )}
                <textarea
                  rows={3}
                  value={candidateMessage}
                  onChange={(e) => setCandidateMessage(e.target.value)}
                  placeholder="Message for candidate email (optional)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 md:col-span-2"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button size="md" disabled={submitting} onClick={() => void scheduleInterview()} className="disabled:opacity-50">
                  {submitting ? 'Scheduling…' : 'Create interview schedule'}
                </Button>
                <Button size="md" variant="outline" href="/recruiter/applicants">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Select an application from the applicants page to schedule an interview.</p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
