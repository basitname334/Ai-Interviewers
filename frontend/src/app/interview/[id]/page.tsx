'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { InterviewState, InterviewReport } from '@/types';
import { AudioRecorder, type AudioRecorderHandle } from '@/components/AudioRecorder';
import { VideoPreview } from '@/components/VideoPreview';
import { CodeEditor } from '@/components/CodeEditor';
import { useInterviewerVoice } from '@/hooks/useInterviewerVoice';

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [state, setState] = useState<InterviewState | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [codeNotes, setCodeNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  /** When user has finished speaking: submit immediately for natural, efficient flow */
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [cameraUserIdle, setCameraUserIdle] = useState(false);

  const audioRecorderRef = useRef<AudioRecorderHandle>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const autoListenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoListeningRef = useRef(false);
  const noSpeechRetryRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const autoListenQuestionIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAnswerRef = useRef<string | null>(null);
  const cameraAnalysisFrameRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const lastCodingQuestionIdRef = useRef<string | null>(null);
  const endedByUnloadRef = useRef(false);

  const clearAutoListenTimeout = useCallback(() => {
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
  }, []);

  const startAutoListeningWindow = useCallback(() => {
    const latestAi = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const isCodingTurn = Boolean(
      latestAi?.isCodingQuestion || latestAi?.codingStarterCode || latestAi?.codingLanguage
    );
    if (!voiceEnabled || loading || isCodingTurn) return;
    clearAutoListenTimeout();
    autoListeningRef.current = true;
    audioRecorderRef.current?.start();
    // Long window so user can finish their full answer before we process (2 min + buffer)
    const listenWindowMs = 125000;
    autoListenTimeoutRef.current = setTimeout(() => {
      audioRecorderRef.current?.stop();
      clearAutoListenTimeout();
    }, listenWindowMs);
  }, [voiceEnabled, loading, clearAutoListenTimeout, state]);

  const { stopSpeaking, speakText } = useInterviewerVoice(state?.turns, voiceEnabled, {
    onAutoSpeakStart: () => {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      audioRecorderRef.current?.stop();
    },
    onAutoSpeakEnd: () => {
      noSpeechRetryRef.current = 0;
      // Start listening quickly after the question so the interview feels natural
      setTimeout(() => {
        if (!loading && voiceEnabled) startAutoListeningWindow();
      }, 220);
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadState = useCallback(async () => {
    if (!id) return;
    try {
      const s = await api.getState(id);
      setState(s);
    } catch {
      setState(null);
    }
  }, [id]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (state?.turns) {
      console.log(`[Page] Turns updated: ${state.turns.length} turns now present.`);
    }
  }, [state?.turns]);

  useEffect(() => {
    if (!state || loading) return;
    const lastAiTurn = [...state.turns].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    if (autoListenQuestionIdRef.current === lastAiTurn.id) return;
    autoListenQuestionIdRef.current = lastAiTurn.id;

    // When voice is ON: do not start listening here — wait for the full question to be spoken, then onAutoSpeakEnd will start listening.
    // When voice is OFF: start listening now so the user can answer without TTS.
    const isCodingTurn = Boolean(
      lastAiTurn.isCodingQuestion || lastAiTurn.codingStarterCode || lastAiTurn.codingLanguage
    );
    if (!voiceEnabled && !isCodingTurn) {
      startAutoListeningWindow();
    }

    if (isCodingTurn) {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      audioRecorderRef.current?.stop();
    }
  }, [state, loading, voiceEnabled, startAutoListeningWindow]);

  useEffect(() => {
    const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    const isCodingTurn = Boolean(
      lastAiTurn.isCodingQuestion || lastAiTurn.codingStarterCode || lastAiTurn.codingLanguage
    );
    if (!isCodingTurn) return;
    if (lastCodingQuestionIdRef.current === lastAiTurn.id) return;
    lastCodingQuestionIdRef.current = lastAiTurn.id;
    setCodeAnswer(lastAiTurn.codingStarterCode?.trim() || '');
    setCodeNotes('');
  }, [state]);

  const submitAnswerText = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setPendingAnswer(null);
    setCountdownRemaining(0);
    pendingAnswerRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopSpeaking();
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
    setError('');
    setLoading(true);
    try {
      const res = await api.submitAnswer(id, text);
      setState(res.state ?? state);
      setAnswerText('');
      if (res.report) {
        setReport(res.report);
        setState(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
    }
  }, [audioRecorderRef, clearAutoListenTimeout, id, loading, state, stopSpeaking]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      setAnswerText(cleaned);
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      clearAutoListenTimeout();
      setError('');
      setCameraUserIdle(false);
      setPendingAnswer(null);
      setCountdownRemaining(0);
      pendingAnswerRef.current = null;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Submit immediately so the interview feels natural and efficient
      void submitAnswerText(cleaned);
    },
    [clearAutoListenTimeout, submitAnswerText]
  );

  const handleSubmitAnswer = () => {
    void submitAnswerText(answerText);
  };

  const handleSubmitCodeAnswer = () => {
    const solution = codeAnswer.trim();
    if (!solution) {
      setError('Please write your code before submitting.');
      return;
    }
    const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const language = (lastAiTurn?.codingLanguage || 'javascript').toLowerCase();
    const note = codeNotes.trim();
    const formatted = [
      `Coding solution (${language}):`,
      `\`\`\`${language}\n${solution}\n\`\`\``,
      note ? `Explanation:\n${note}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    void submitAnswerText(formatted);
  };

  const handleEndInterview = async () => {
    stopSpeaking();
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
    setLoading(true);
    try {
      const res = await api.endInterview(id);
      endedByUnloadRef.current = true;
      if (res.report) setReport(res.report);
      setState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end');
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    clearAutoListenTimeout();
    audioRecorderRef.current?.toggle();
  };

  const handleCameraToggle = () => {
    setCameraOn((p) => !p);
  };

  useEffect(() => {
    return () => {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      audioRecorderRef.current?.stop();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [clearAutoListenTimeout]);

  // When user closes tab or navigates away, end the interview so results appear on recruiter dashboard
  useEffect(() => {
    if (!id || typeof window === 'undefined') return;

    const endInterviewOnLeave = () => {
      if (endedByUnloadRef.current) return;
      endedByUnloadRef.current = true;
      const base = '/api/proxy';
      const url = `${window.location.origin}${base}/interview/${id}/end`;
      fetch(url, { method: 'POST', keepalive: true });
    };

    window.addEventListener('beforeunload', endInterviewOnLeave);
    window.addEventListener('pagehide', endInterviewOnLeave);
    return () => {
      window.removeEventListener('beforeunload', endInterviewOnLeave);
      window.removeEventListener('pagehide', endInterviewOnLeave);
    };
  }, [id]);

  // Camera-based idle detection while waiting before next question
  useEffect(() => {
    if (!pendingAnswer || !cameraOn || !cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    if (video.readyState < 2) return; // HAVE_CURRENT_DATA or more
    const w = 40;
    const h = 30;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let lastPixels: Uint8ClampedArray | null = null;
    let idleFrames = 0;
    const IDLE_FRAMES_NEEDED = 10; // ~1s at 10fps
    const MOTION_THRESHOLD = 8;

    const SAMPLE_MS = 150;
    const tick = () => {
      if (!video.videoWidth || !pendingAnswerRef.current) return;
      try {
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          ctx = canvas.getContext('2d');
        }
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        if (lastPixels) {
          let diff = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            diff += Math.abs(pixels[i]! - lastPixels[i]!);
            diff += Math.abs(pixels[i + 1]! - lastPixels[i + 1]!);
            diff += Math.abs(pixels[i + 2]! - lastPixels[i + 2]!);
          }
          const meanDiff = diff / (pixels.length / 4);
          if (meanDiff < MOTION_THRESHOLD) {
            idleFrames += 1;
            if (idleFrames >= IDLE_FRAMES_NEEDED) setCameraUserIdle(true);
          } else {
            idleFrames = 0;
          }
        }
        lastPixels = new Uint8ClampedArray(pixels);
      } catch {
        // ignore
      }
      cameraAnalysisFrameRef.current = window.setTimeout(tick, SAMPLE_MS);
    };
    cameraAnalysisFrameRef.current = window.setTimeout(tick, SAMPLE_MS);
    return () => {
      if (cameraAnalysisFrameRef.current) {
        clearTimeout(cameraAnalysisFrameRef.current);
        cameraAnalysisFrameRef.current = null;
      }
    };
  }, [pendingAnswer, cameraOn]);

  if (report) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-dark">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white">← Home</Link>
            <h1 className="text-lg font-semibold text-white">Interview complete</h1>
            <Link href={`/report/${report.interviewId}`} className="text-sm font-medium text-primary-400 hover:text-primary-300">
              View full report →
            </Link>
          </div>
        </header>
        <main className="mx-auto flex-1 max-w-2xl px-6 py-12">
          <div className="glass-card mb-6 rounded-2xl p-6 shadow-card">
            <p className="mb-4 leading-relaxed text-gray-300">{report.summary}</p>
            <p className="text-sm text-gray-400">
              Score: {report.overallScore}/{report.maxScore} • Recommendation: {report.recommendation}
            </p>
          </div>
          <Link
            href="/recruiter"
            className="inline-block rounded-xl bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-500"
          >
            Back to recruiter dashboard
          </Link>
        </main>
      </div>
    );
  }

  if (!state && !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          <p className="mb-4 text-gray-400">Loading interview…</p>
          <Link href="/interview" className="text-sm font-medium text-primary-400 hover:text-primary-300">Back to start</Link>
        </div>
      </div>
    );
  }

  const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
  const currentQuestion = lastAiTurn?.content ?? 'Preparing your next question...';
  const codingTurnActive = Boolean(
    lastAiTurn?.isCodingQuestion || lastAiTurn?.codingStarterCode || lastAiTurn?.codingLanguage
  );
  const elapsedSeconds = state?.startedAt
    ? Math.max(0, Math.floor((nowTs - new Date(state.startedAt).getTime()) / 1000))
    : 0;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 bg-[#e8e7f5] text-slate-900">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-xl font-bold tracking-tight">AI Interviewer</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          {minutes}:{seconds}
        </div>
      </header>

      <div className="relative h-[calc(100%-84px)] px-6 pb-24">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-300/40" />
            <div className="absolute inset-4 rounded-full bg-indigo-200/60 blur-md" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-indigo-200 bg-white text-2xl font-bold text-slate-700 shadow-lg">
              m.
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-6 w-[280px] overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-xl backdrop-blur">
          <div className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
            Your camera
          </div>
          <div className="h-[190px] bg-slate-900">
            <VideoPreview
              compact
              active={cameraOn}
              onActiveChange={setCameraOn}
              micMuted={!micOn}
              videoRef={cameraVideoRef}
            />
          </div>
        </div>

        {codingTurnActive ? (
          <div className="absolute right-6 top-20 bottom-28 w-[560px] min-w-[520px] space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
              {currentQuestion}
            </div>
            <div className="h-[calc(100%-170px)]">
              <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="260px" />
            </div>
            <textarea
              rows={3}
              value={codeNotes}
              onChange={(e) => setCodeNotes(e.target.value)}
              placeholder="Optional explanation for your approach"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Submit your code as interview answer.
              </p>
              <button
                onClick={handleSubmitCodeAnswer}
                disabled={loading}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit code answer'}
              </button>
            </div>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
          </div>
        ) : (
          <div className="absolute right-8 top-1/2 w-[360px] -translate-y-1/2 space-y-4">
            <p className="text-[15px] leading-7 text-slate-800">{currentQuestion}</p>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              {loading
                ? 'Processing your answer…'
                : countdownRemaining > 0
                  ? `Answer received. Next question in ${countdownRemaining}s…`
                  : micOn
                    ? 'Listening…'
                    : 'Your answer will be captured automatically when you speak.'}
              {countdownRemaining > 0 && cameraUserIdle && (
                <span className="mt-1 block text-xs text-indigo-600">You’re ready. Next question in {countdownRemaining}s.</span>
              )}
            </div>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
          </div>
        )}

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/85 px-4 py-2 shadow-lg backdrop-blur">
          <button
            onClick={handleMicToggle}
            disabled={loading || codingTurnActive}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              micOn ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-500 hover:bg-slate-400'
            } disabled:opacity-50`}
            title="Toggle microphone"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6.75 6.75 0 006.75-6.75V8.25m-13.5 0V12A6.75 6.75 0 0012 18.75m0 0V21m-4.5 0h9" />
            </svg>
          </button>
          <button
            onClick={handleCameraToggle}
            disabled={loading}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              cameraOn ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-500 hover:bg-slate-400'
            } disabled:opacity-50`}
            title="Toggle camera"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handleEndInterview}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-500 disabled:opacity-50"
            title="End interview"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
            </svg>
          </button>
        </div>

        <AudioRecorder
          ref={audioRecorderRef}
          onTranscript={handleVoiceTranscript}
          silenceMs={900}
          minRecordMs={500}
          minSpeechMs={350}
          maxRecordMs={120000}
          stopDelayMs={150}
          onNoSpeech={() => {
            if (!autoListeningRef.current || !voiceEnabled || loading) return;
            if (noSpeechRetryRef.current >= 2) {
              autoListeningRef.current = false;
              setError('I could not hear your answer clearly. Please speak a little louder or unmute your mic.');
              return;
            }
            noSpeechRetryRef.current += 1;
            setError('');
            setTimeout(() => {
              if (!autoListeningRef.current || loading || !voiceEnabled) return;
              startAutoListeningWindow();
            }, 220);
          }}
          disabled={loading}
          autoStart={false}
          onListeningChange={setMicOn}
          hideButton
        />
      </div>
    </div>
  );
}
