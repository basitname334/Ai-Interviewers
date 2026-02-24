'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type PublicJoinInfo } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';

export default function JoinInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [info, setInfo] = useState<PublicJoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.publicGetJoinInfo(token)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'Invalid link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStart = async () => {
    if (!token) return;
    setError('');
    setStarting(true);
    try {
      const res = await api.publicStartJoin(token);
      router.push(`/interview/${res.interviewId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-dark">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-gradient-dark">
        <p className="mb-2 text-lg text-red-400">{error}</p>
        <p className="mb-4 text-sm text-gray-500">This link may be invalid or the interview may have been cancelled.</p>
        <Link href="/" className="text-primary-400 hover:underline">Go to home</Link>
      </div>
    );
  }

  if (info?.alreadyCompleted && info.interviewId) {
    return (
      <AppShell title="Interview complete" backHref="/" backLabel="Home">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-6 text-gray-300">You have already completed this interview.</p>
          <Link
            href={`/report/${info.interviewId}`}
            className="inline-block rounded-xl bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-500"
          >
            View your report
          </Link>
        </div>
      </AppShell>
    );
  }

  if (info?.status === 'cancelled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-gradient-dark">
        <p className="mb-4 text-lg text-amber-400">This interview was cancelled.</p>
        <Link href="/" className="text-primary-400 hover:underline">Go to home</Link>
      </div>
    );
  }

  return (
    <AppShell title="Your interview" backHref="/" backLabel="Home">
      <div className="mx-auto max-w-xl">
        <div className="glass-card rounded-2xl border border-white/10 p-8 text-center shadow-card">
          <h2 className="mb-2 text-2xl font-semibold text-white">Interview scheduled</h2>
          <p className="mb-6 text-gray-400">
            {info?.candidateName ? `${info.candidateName}, ` : ''}
            your {info?.role ?? 'interview'} interview is scheduled for:
          </p>
          <p className="mb-8 text-lg text-gray-200">
            {info?.scheduledAt ? new Date(info.scheduledAt).toLocaleString() : '—'}
          </p>
          <p className="mb-8 text-sm text-gray-400">
            When you're ready, click below to start. You'll be able to answer questions and see the next question after each response.
          </p>
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <button
            onClick={handleStart}
            disabled={starting}
            className="rounded-xl bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-glow-sm transition-all hover:bg-primary-500 disabled:opacity-50"
          >
            {starting ? 'Starting…' : 'Start interview'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
