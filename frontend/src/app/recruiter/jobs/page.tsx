'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  api,
  type RecruiterApplication,
  type RecruiterJob,
} from '@/lib/api';
import type { InterviewRole } from '@/types';

const roles: { value: InterviewRole; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

export default function RecruiterJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [scheduleDateByApp, setScheduleDateByApp] = useState<Record<string, string>>({});
  const [scheduleTimeByApp, setScheduleTimeByApp] = useState<Record<string, string>>({});
  const [joinUrlByApp, setJoinUrlByApp] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [role, setRole] = useState<InterviewRole>('technical');

  const load = async () => {
    const [jobsRes, appsRes] = await Promise.all([api.recruiterGetJobs(), api.recruiterGetApplications()]);
    setJobs(jobsRes.jobs);
    setApplications(appsRes.applications);
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    api.recruiterMe()
      .then(() => load())
      .catch(() => {
        localStorage.removeItem('recruiterToken');
        localStorage.removeItem('recruiterEmail');
        localStorage.removeItem('recruiterName');
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await api.recruiterCreateJob({
        title,
        companyName: companyName || undefined,
        description: description || undefined,
        requirements: requirements || undefined,
        location: location || undefined,
        salaryRange: salaryRange || undefined,
        role,
      });
      setTitle('');
      setCompanyName('');
      setDescription('');
      setRequirements('');
      setLocation('');
      setSalaryRange('');
      setSuccessMessage('Job posted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSubmitLoading(false);
    }
  };

  const scheduleInterview = async (application: RecruiterApplication) => {
    const date = scheduleDateByApp[application.id];
    const time = scheduleTimeByApp[application.id];
    if (!date || !time) {
      setError('Set date and time before scheduling an interview.');
      return;
    }
    setError('');
    setSchedulingId(application.id);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const created = await api.recruiterScheduleFromApplication(application.id, {
        scheduledAt,
        role: application.position_role,
      });
      setJoinUrlByApp((prev) => ({ ...prev, [application.id]: created.joinUrl }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setSchedulingId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    const confirmed = confirm('Delete this job? Candidates will no longer be able to apply.');
    if (!confirmed) return;
    setError('');
    setDeletingJobId(jobId);
    try {
      await api.recruiterDeleteJob(jobId);
      setSuccessMessage('Job deleted. Applications are now closed for this role.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setDeletingJobId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6ff]">
        <p className="text-slate-600">Loading recruiter jobs…</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Recruiter Jobs"
      subtitle="Post jobs, review applications, and schedule interviews"
      backHref="/recruiter"
      backLabel="Recruiter dashboard"
      theme="light"
      actions={
        <div className="flex gap-2">
          <Link href="/recruiter/applicants" className="rounded-lg border border-indigo-300 bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-indigo-50">
            Applicants
          </Link>
          <Link href="/jobs" className="rounded-lg border border-indigo-300 bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-indigo-50">
            View public jobs
          </Link>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              localStorage.removeItem('recruiterToken');
              localStorage.removeItem('recruiterEmail');
              localStorage.removeItem('recruiterName');
              window.location.href = '/recruiter/login';
            }}
          >
            Logout
          </Button>
        </div>
      }
    >
      {successMessage && (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {successMessage}
        </div>
      )}
      <div className="space-y-8">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Job</h2>
          <form onSubmit={createJob} className="mt-4 grid gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name (optional)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InterviewRole)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="Salary range (optional)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Job description (optional)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <textarea
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Requirements (optional)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={submitLoading} className="disabled:opacity-50">
                {submitLoading ? 'Creating…' : 'Post job'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your Jobs</h2>
          <div className="mt-4 space-y-4">
            {jobs.length === 0 && <p className="text-sm text-slate-600">No jobs posted yet.</p>}
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    {job.company_name && <p className="text-sm text-slate-600">{job.company_name}</p>}
                    <p className="text-sm text-slate-600">{job.role}</p>
                  </div>
                  <Button
                    size="md"
                    variant="outline"
                    disabled={deletingJobId === job.id}
                    onClick={() => void deleteJob(job.id)}
                    className="disabled:opacity-50"
                  >
                    {deletingJobId === job.id ? 'Deleting…' : 'Delete job'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Applications</h2>
          <div className="mt-4 space-y-4">
            {applications.length === 0 && <p className="text-sm text-slate-600">No applications yet.</p>}
            {applications.map((app) => (
              <div key={app.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {app.candidate_name || app.candidate_email || 'Candidate'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {app.position_title} • {app.position_role}
                    </p>
                    <p className="text-xs text-slate-600">Status: {app.status}</p>
                  </div>
                  {app.resume_url && (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800"
                    >
                      View resume
                    </a>
                  )}
                </div>

                {app.cover_letter && <p className="mt-3 text-sm text-slate-700">{app.cover_letter}</p>}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    type="date"
                    value={scheduleDateByApp[app.id] || ''}
                    onChange={(e) => setScheduleDateByApp((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                  <input
                    type="time"
                    value={scheduleTimeByApp[app.id] || ''}
                    onChange={(e) => setScheduleTimeByApp((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                  <Button
                    size="md"
                    disabled={schedulingId === app.id}
                    onClick={() => void scheduleInterview(app)}
                    className="disabled:opacity-50"
                  >
                    {schedulingId === app.id ? 'Scheduling…' : 'Schedule interview'}
                  </Button>
                </div>

                {joinUrlByApp[app.id] && (
                  <p className="mt-3 text-xs text-emerald-700">
                    Interview link created: {joinUrlByApp[app.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
