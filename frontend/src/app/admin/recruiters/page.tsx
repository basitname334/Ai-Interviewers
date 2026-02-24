'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminRecruiterRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminRecruitersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<AdminRecruiterRow[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const load = async () => {
    const r = await api.adminGetRecruiters();
    setRecruiters(r.recruiters);
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await api.adminCreateRecruiter({ name: name || undefined, email, password });
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create recruiter');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleAccess = async (id: string, isActive: boolean) => {
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminUpdateRecruiter(id, { isActive: !isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update access');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRecruiter = async (id: string) => {
    if (!confirm('Delete this recruiter account?')) return;
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminDeleteRecruiter(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete recruiter');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-600">Loading recruiters…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="Recruiter management"
      description="Create recruiter accounts and manage portal access."
    >
      <div className="space-y-8">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add recruiter</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Each recruiter can sign in and generate their own interview links.
          </p>
          <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@example.com"
              required
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6)"
              required
              minLength={6}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <Button type="submit" disabled={submitLoading} className="justify-center disabled:opacity-50">
              {submitLoading ? 'Creating…' : 'Create recruiter'}
            </Button>
          </form>
          {error && <p className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800">{error}</p>}
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
          <div className="border-b border-slate-200 bg-white/80 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Recruiters</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-600">{recruiters.length} account(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-violet-100/60">
                  <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Access</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Created</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Schedules</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {recruiters.map((r) => (
                  <tr key={r.id} className="hover:bg-violet-50/40">
                    <td className="px-6 py-4 font-semibold text-slate-900">{r.name || '—'}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.is_active ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/80' : 'bg-red-100 text-red-800 ring-1 ring-red-300/80'
                        }`}
                      >
                        {r.is_active ? 'Granted' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.schedule_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(r.id, r.is_active)}
                          disabled={actionLoadingId === r.id}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                            r.is_active
                              ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          {actionLoadingId === r.id ? 'Updating…' : r.is_active ? 'Revoke access' : 'Grant access'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecruiter(r.id)}
                          disabled={actionLoadingId === r.id}
                          className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
