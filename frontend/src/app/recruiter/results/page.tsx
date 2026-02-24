'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminScheduleRow } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

export default function RecruiterResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    api
      .recruiterMe()
      .then(() => api.recruiterGetSchedules())
      .then((r) => setSchedules(r.schedules))
      .catch(() => router.replace('/recruiter/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const results = schedules.filter(
    (s) => String(s.status ?? '').toLowerCase() === 'completed'
  );

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Permanently delete this interview result? This cannot be undone.')) return;
    setActionLoading(scheduleId);
    try {
      const { deleted } = await api.recruiterDeleteSchedule(scheduleId);
      if (deleted) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-600">Loading interview results…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Interview results"
      subtitle="All completed interviews"
      backHref="/recruiter"
      backLabel="Dashboard"
      theme="light"
    >
      <div className="space-y-6">
        <Card className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
            <h3 className="font-semibold text-slate-900">All interview results</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {results.length} completed interview{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-violet-100/60">
                  <th className="px-6 py-4 font-semibold text-slate-700">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Scheduled at</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                  <th className="min-w-[200px] px-6 py-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {results.map((s) => {
                  const scheduleId = s.id ?? '';
                  return (
                    <tr key={scheduleId} className="transition-colors hover:bg-violet-50/40">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {s.candidate_name || s.candidate_email}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-600">{s.candidate_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 capitalize">{s.role}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {new Date(s.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-300/80">
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(scheduleId)}
                            disabled={actionLoading === scheduleId}
                            className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                          >
                            {actionLoading === scheduleId ? '…' : 'Delete'}
                          </button>
                          {s.interview_id && (
                            <Link
                              href={`/report/${s.interview_id}`}
                              className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-200"
                            >
                              View report
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {results.length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-slate-600">
              No completed interview results yet. When candidates finish interviews, they will
              appear here.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
