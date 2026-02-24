'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type RecruiterApplication, type RecruiterJob } from '@/lib/api';

export default function RecruiterApplicantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mailStatusByApp, setMailStatusByApp] = useState<Record<string, { sent: boolean; text: string }>>({});

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    Promise.all([api.recruiterMe(), api.recruiterGetJobs(), api.recruiterGetApplications()])
      .then(([, jobsRes, appsRes]) => {
        setJobs(jobsRes.jobs);
        setApplications(appsRes.applications);
        const persistedMailStatus: Record<string, { sent: boolean; text: string }> = {};
        for (const app of appsRes.applications) {
          if (app.interview_email_sent === true) {
            persistedMailStatus[app.id] = { sent: true, text: 'Mail sent to user successfully.' };
          } else if (app.interview_email_sent === false) {
            persistedMailStatus[app.id] = {
              sent: false,
              text: `Mail not sent: ${app.interview_email_error || 'Unknown mail error'}`,
            };
          }
        }
        setMailStatusByApp(persistedMailStatus);
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Failed to load applicants';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredApplications = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return applications.filter((app) => {
      if (selectedJobId && app.position_id !== selectedJobId) return false;
      if (!query) return true;
      const haystack =
        `${app.candidate_name ?? ''} ${app.candidate_email ?? ''} ${app.position_title} ${app.position_role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, selectedJobId, searchText]);

  const rejectApplication = async (app: RecruiterApplication) => {
    const ok = confirm('Reject this application?');
    if (!ok) return;
    setError('');
    setRejectingId(app.id);
    try {
      await api.recruiterRejectApplication(app.id);
      setApplications((prev) =>
        prev.map((item) => (item.id === app.id ? { ...item, status: 'rejected' } : item))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject application');
    } finally {
      setRejectingId(null);
    }
  };

  const deleteApplication = async (app: RecruiterApplication) => {
    const ok = confirm('Permanently delete this application? This cannot be undone.');
    if (!ok) return;
    setError('');
    setDeletingId(app.id);
    try {
      await api.recruiterDeleteApplication(app.id);
      setApplications((prev) => prev.filter((item) => item.id !== app.id));
      setMailStatusByApp((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell
      title="Applicants"
      subtitle="Review applicants by posted job"
      backHref="/recruiter"
      backLabel="Recruiter dashboard"
      theme="light"
    >
      <div className="space-y-6">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search candidate, email, role..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">All posted jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.company_name ? `• ${job.company_name}` : ''}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-indigo-200 bg-indigo-100 px-4 py-3 text-sm font-semibold text-indigo-800">
              {filteredApplications.length} applicant{filteredApplications.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Card>

        {loading && <p className="text-sm font-medium text-slate-600">Loading applicants…</p>}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
        )}

        {!loading && filteredApplications.length === 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">No applicants found for the selected filters.</p>
          </Card>
        )}

        {filteredApplications.map((app) => (
          <Card key={app.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/** Prefer live state, then persisted DB status */}
            {(() => {
              const persistedStatus =
                app.interview_email_sent === true
                  ? { sent: true, text: 'Mail sent to user successfully.' }
                  : app.interview_email_sent === false
                    ? { sent: false, text: `Mail not sent: ${app.interview_email_error || 'Unknown mail error'}` }
                    : null;
              const mailStatus = mailStatusByApp[app.id] ?? persistedStatus;
              return (
                <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{app.candidate_name || 'Candidate'}</p>
                <p className="text-sm text-slate-600">{app.candidate_email || 'No email provided'}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {app.position_title} • {app.position_role}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Applied: {new Date(app.created_at).toLocaleString()} • Status: {app.status}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
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
                {mailStatus && (
                  <p
                    className={`max-w-[300px] text-right text-xs font-medium ${
                      mailStatus.sent ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    {mailStatus.text}
                  </p>
                )}
              </div>
            </div>
            {app.cover_letter && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{app.cover_letter}</p>}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Button
                size="md"
                href={`/recruiter/schedule?applicationId=${encodeURIComponent(app.id)}`}
                className="justify-center"
              >
                Schedule interview
              </Button>
              <Button
                size="md"
                variant="outline"
                disabled={rejectingId === app.id || app.status === 'rejected' || app.status === 'interview_scheduled'}
                onClick={() => void rejectApplication(app)}
                className="justify-center disabled:opacity-50"
              >
                {app.status === 'rejected'
                  ? 'Rejected'
                  : rejectingId === app.id
                    ? 'Rejecting…'
                    : 'Reject application'}
              </Button>
              <Button
                size="md"
                variant="secondary"
                disabled={deletingId === app.id}
                onClick={() => void deleteApplication(app)}
                className="justify-center border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === app.id ? 'Deleting…' : 'Delete application'}
              </Button>
            </div>
                </>
              );
            })()}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
