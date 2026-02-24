'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { InterviewReport } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

const RECOMMENDATION_STYLES: Record<string, string> = {
  strong_hire: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hire: 'bg-green-50 text-green-700 border-green-200',
  borderline: 'bg-amber-50 text-amber-700 border-amber-200',
  no_hire: 'bg-red-50 text-red-700 border-red-200',
};

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .getReport(id)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6ff]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#5B5BD6]/20 border-t-[#5B5BD6]" />
          <p className="text-slate-600 font-medium">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f6ff] px-6">
        <p className="mb-4 text-red-600">{error || 'Report not found'}</p>
        <Link href="/recruiter" className="text-sm font-medium text-[#4F4EC2] hover:text-[#3F3EA5]">
          Back to recruiter dashboard
        </Link>
      </div>
    );
  }

  return (
    <AppShell
      title="Interview Report"
      subtitle={report.interviewId.slice(0, 8) + '…'}
      backHref="/recruiter"
      backLabel="Recruiter"
      theme="light"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Summary</h2>
          <p className="leading-relaxed text-slate-600">{report.summary}</p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-200 pt-5">
            <div>
              <span className="mb-0.5 block text-sm font-medium text-slate-600">Score</span>
              <p className="font-semibold text-slate-900">{report.overallScore} / {report.maxScore}</p>
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-medium text-slate-600">Recommendation</span>
              <span
                className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-medium ${RECOMMENDATION_STYLES[report.recommendation] ?? 'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
              >
                {report.recommendation.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-medium text-slate-600">Role</span>
              <p className="font-medium capitalize text-slate-900">{report.role}</p>
            </div>
          </div>
        </Card>

        {report.strengths.length > 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Strengths</h2>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.improvements.length > 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Areas for improvement</h2>
            <ul className="space-y-2">
              {report.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600">
                  <span className="mt-0.5 text-amber-600">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.redFlags.length > 0 && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/40 p-6">
            <h2 className="mb-3 text-base font-semibold text-amber-700">Red flags</h2>
            <ul className="space-y-2">
              {report.redFlags.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="mt-0.5 text-red-600">!</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.competencies.length > 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Competencies</h2>
            <div className="space-y-4">
              {report.competencies.map((c) => (
                <div key={c.competencyId} className="flex items-center gap-4">
                  <span className="w-36 text-sm font-medium text-slate-700">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-indigo-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5B5BD6] to-[#6C7EFF] transition-all"
                      style={{ width: `${(c.score / c.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-medium text-slate-600">{c.score.toFixed(1)}/{c.maxScore}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Q&A summary</h2>
          <div className="space-y-5">
            {report.questionAnswerSummary.map((qa, i) => (
              <div key={i} className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Question</p>
                <p className="mb-3 text-slate-800">{qa.question}</p>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Answer · Score: {qa.score.toFixed(1)}
                </p>
                <p className="leading-relaxed text-slate-600">{qa.answer}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="pt-4">
          <Link
            href="/recruiter"
            className="text-sm font-medium text-[#4F4EC2] hover:text-[#3F3EA5]"
          >
            ← Back to recruiter dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
