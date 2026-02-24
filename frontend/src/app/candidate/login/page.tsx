'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function CandidateLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/jobs';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.candidateLogin(email, password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('candidateToken', res.token);
        localStorage.setItem('candidateName', res.candidate.name ?? '');
        localStorage.setItem('candidateEmail', res.candidate.email ?? '');
      }
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6ff] px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Candidate Login</h1>
          <p className="mt-2 text-sm text-slate-600 font-medium">Log in to apply and track your job status.</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Logging in…' : 'Login'}
            </Button>
          </form>
          <p className="mt-5 text-sm text-slate-600">
            New user?{' '}
            <Link href={`/candidate/signup?next=${encodeURIComponent(next)}`} className="font-medium text-indigo-700 hover:underline">
              Create account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
