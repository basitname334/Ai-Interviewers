import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const UPSTREAM_PATH = '/api/v1/transcribe';
const FETCH_TIMEOUT_MS = 120000;

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  const incomingContentType = req.headers.get('content-type') || '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BACKEND_URL}${UPSTREAM_PATH}`, {
      method: 'POST',
      body,
      headers: incomingContentType ? { 'Content-Type': incomingContentType } : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || 'application/json';
    const buffer = await res.arrayBuffer();

    clearTimeout(timeoutId);
    return new NextResponse(buffer, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const details = err instanceof Error ? err.message : String(err);
    console.error(`[api/transcribe] Upstream failed: ${details}`);
    return NextResponse.json(
      {
        error: 'Backend unavailable',
        details: process.env.NODE_ENV === 'development' ? (isAbort ? 'Timed out' : details) : undefined,
      },
      { status: isAbort ? 504 : 503 }
    );
  }
}

