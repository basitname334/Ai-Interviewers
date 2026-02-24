'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminScheduleRow } from '@/lib/api';
import type { InterviewRole } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  pickPreferredInterviewerVoice,
  readSavedVoicePreference,
  writeSavedVoicePreference,
} from '@/lib/voicePreferences';

const ROLES: { value: InterviewRole; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v3M16 2v3" />
      <path d="M3.5 9h17" />
      <path d="M6.5 5h11A3 3 0 0 1 20.5 8v11a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [role, setRole] = useState<InterviewRole>('technical');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const recruiterName =
    typeof window !== 'undefined' ? localStorage.getItem('recruiterName') : '';
  const recruiterEmail =
    typeof window !== 'undefined' ? localStorage.getItem('recruiterEmail') : '';

  const inputBase = useMemo(
    () =>
      'w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20',
    []
  );

  const load = () =>
    api.recruiterGetSchedules().then((r) => {
      setSchedules(r.schedules);
    });

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
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const keyForVoice = (voice: SpeechSynthesisVoice) => `${voice.name}||${voice.lang}`;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available.length) return;
      setVoices(available);

      const saved = readSavedVoicePreference();
      const savedVoice = saved
        ? available.find((v) => v.name === saved.name && (!saved.lang || v.lang === saved.lang))
        : null;
      const fallback = pickPreferredInterviewerVoice(available);
      const selected = savedVoice || fallback;
      if (selected) setSelectedVoiceKey(keyForVoice(selected));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('recruiterToken');
    localStorage.removeItem('recruiterEmail');
    localStorage.removeItem('recruiterName');
    router.replace('/recruiter/login');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) {
      setError('Please set date and time');
      return;
    }
    setError('');
    setSubmitLoading(true);
    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}`;
      await api.recruiterCreateSchedule({
        candidateEmail,
        candidateName: candidateName || undefined,
        role,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      setCreateOpen(false);
      setCandidateEmail('');
      setCandidateName('');
      setScheduledDate('');
      setScheduledTime('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Cancel this interview? The candidate will no longer be able to start it.')) return;
    setActionLoading(scheduleId);
    try {
      const { updated } = await api.recruiterUpdateSchedule(scheduleId, { status: 'cancelled' });
      if (updated) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === scheduleId ? { ...s, status: 'cancelled' } : s))
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Permanently delete this scheduled interview? This cannot be undone.')) return;
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

  const handleVoiceChange = (value: string) => {
    setSelectedVoiceKey(value);
    const [name, lang] = value.split('||');
    const selected = voices.find((v) => v.name === name && v.lang === lang);
    writeSavedVoicePreference(selected ?? null);
  };

  const handleVoicePreview = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const [name, lang] = selectedVoiceKey.split('||');
    const selected = voices.find((v) => v.name === name && v.lang === lang);
    if (!selected) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      'Hello, I am your interviewer. Let us begin with the first question.'
    );
    utterance.voice = selected;
    utterance.lang = selected.lang || 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1.03;
    utterance.volume = 1;
    utterance.onstart = () => setIsPreviewingVoice(true);
    utterance.onend = () => setIsPreviewingVoice(false);
    utterance.onerror = () => setIsPreviewingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const statusMeta = useMemo(() => {
    return {
      scheduled: { label: 'Scheduled', pill: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300/80 font-semibold' },
      in_progress: { label: 'In progress', pill: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/80 font-semibold' },
      completed: { label: 'Completed', pill: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/80 font-semibold' },
      cancelled: { label: 'Cancelled', pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 font-semibold' },
    } as const;
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Recruiter Dashboard"
      subtitle={recruiterName || recruiterEmail || 'Recruiter'}
      backHref="/"
      backLabel="Home"
      theme="light"
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen((v) => !v)} size="md">
            {createOpen ? 'Close' : 'New interview'}
          </Button>
          <Button onClick={handleLogout} variant="outline" size="md">
            Logout
          </Button>
        </div>
      }
    >
      <div className="space-y-10">
        {createOpen && (
          <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_300px_at_30%_-20%,rgba(99,102,241,0.08),transparent_55%)]" />
            <div className="relative">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Create interview link</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                This interview is attached to your recruiter account.
              </p>
              <form onSubmit={handleCreate} className="mt-6 max-w-4xl space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Candidate email *</label>
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      required
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Candidate name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Interview type</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as InterviewRole)}
                      className={inputBase}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Interviewer voice</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedVoiceKey}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        disabled={voices.length === 0}
                        className={`${inputBase} disabled:bg-slate-100`}
                      >
                        {voices.length === 0 ? (
                          <option value="">Loading voices…</option>
                        ) : (
                          voices.map((voice) => {
                            const key = `${voice.name}||${voice.lang}`;
                            return (
                              <option key={key} value={key}>
                                {voice.name} ({voice.lang})
                              </option>
                            );
                          })
                        )}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={handleVoicePreview}
                        disabled={!selectedVoiceKey || isPreviewingVoice}
                      >
                        {isPreviewingVoice ? 'Playing…' : 'Preview'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                        className={`${inputBase} ui-date pl-11 pr-11`}
                      />
                      <button
                        type="button"
                        aria-label="Open date picker"
                        onClick={() => {
                          const el = dateInputRef.current;
                          if (!el) return;
                          // Supported in Chromium; gracefully falls back to focus in other browsers.
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (el as any).showPicker?.();
                          el.focus();
                        }}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl border-l border-slate-200 bg-slate-50/80 px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Time *</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <ClockIcon className="h-4 w-4" />
                      </div>
                      <input
                        ref={timeInputRef}
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required
                        step={900}
                        className={`${inputBase} ui-time pl-11 pr-11 tabular-nums`}
                      />
                      <button
                        type="button"
                        aria-label="Open time picker"
                        onClick={() => {
                          const el = timeInputRef.current;
                          if (!el) return;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (el as any).showPicker?.();
                          el.focus();
                        }}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl border-l border-slate-200 bg-slate-50/80 px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-600">15-minute steps.</p>
                  </div>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-600">The candidate will use the generated link to start the interview.</p>
                  <Button type="submit" disabled={submitLoading} className="disabled:opacity-50">
                    {submitLoading ? 'Creating…' : 'Create interview'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Interview results</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {(() => {
                const completed = schedules.filter(
                  (s) => String(s.status ?? '').toLowerCase() === 'completed'
                );
                return `${completed.length} completed interview${completed.length !== 1 ? 's' : ''}`;
              })()}
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
                {schedules
                  .filter((s) => String(s.status ?? '').toLowerCase() === 'completed')
                  .map((s) => {
                    const scheduleId = s.id ?? '';
                    const status = String(s.status ?? '').toLowerCase().replace(/\s+/g, '_');
                    const meta =
                      statusMeta[status as keyof typeof statusMeta] ??
                      ({
                        label: status.replaceAll('_', ' '),
                        pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 font-semibold',
                      } as const);
                    return (
                      <tr key={scheduleId} className="transition-colors hover:bg-violet-50/40">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{s.candidate_name || s.candidate_email}</p>
                            <p className="mt-0.5 text-sm text-slate-600">{s.candidate_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{s.role}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{new Date(s.scheduled_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>
                            {meta.label}
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
          {schedules.filter((s) => String(s.status ?? '').toLowerCase() === 'completed').length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-slate-600">
              No completed interview results yet. When candidates finish interviews, they will appear here.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
