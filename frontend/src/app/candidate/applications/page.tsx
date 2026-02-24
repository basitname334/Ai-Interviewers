'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateSubnav } from '@/components/layout/CandidateSubnav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type CandidateDashboardApplication } from '@/lib/api';

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState<CandidateDashboardApplication[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (!token) {
      router.replace('/candidate/login?next=/candidate/applications');
      return;
    }
    api
      .candidateGetDashboard()
      .then((res) => setApplications(res.applications))
      .catch((e) => {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateName');
        localStorage.removeItem('candidateEmail');
        setError(e instanceof Error ? e.message : 'Failed to load applications');
        router.replace('/candidate/login?next=/candidate/applications');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell
      title="Applied Jobs"
      subtitle="All your applications and interview progress"
      backHref="/candidate/dashboard"
      backLabel="Dashboard"
      theme="light"
      actions={
        <Button
          variant="outline"
          size="md"
          onClick={() => {
            localStorage.removeItem('candidateToken');
            localStorage.removeItem('candidateName');
            localStorage.removeItem('candidateEmail');
            router.replace('/candidate/login');
          }}
        >
          Logout
        </Button>
      }
    >
      <div className="space-y-6">
        <CandidateSubnav />
        {loading && <p className="text-sm text-slate-600 font-medium">Loading applied jobs…</p>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {!loading && applications.length === 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">No applied jobs yet.</p>
          </Card>
        )}

        {applications.map((app) => (
          <Card key={app.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {app.position.title}
                  {app.position.companyName ? ` • ${app.position.companyName}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-600">{app.position.role}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Applied: {new Date(app.appliedAt).toLocaleString()} • Status: {app.status}
                </p>
              </div>
              {app.resumeUrl && (
                <a
                  href={app.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800"
                >
                  View resume
                </a>
              )}
            </div>

            {app.schedule && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-semibold text-emerald-800">
                  Interview {app.schedule.status ? `(${app.schedule.status})` : ''}
                </p>
                {app.schedule.scheduledAt && (
                  <p className="text-emerald-700">
                    Scheduled at: {new Date(app.schedule.scheduledAt).toLocaleString()}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {app.schedule.joinUrl && (
                    <a
                      href={app.schedule.joinUrl}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      Join interview
                    </a>
                  )}
                  {app.schedule.reportUrl && (
                    <a
                      href={app.schedule.reportUrl}
                      className="rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800"
                    >
                      View report
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
