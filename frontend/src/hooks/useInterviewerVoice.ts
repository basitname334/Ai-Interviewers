import { useCallback, useEffect, useRef } from 'react';
import type { Turn } from '@/types';
import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

function pickProfessionalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return pickPreferredInterviewerVoice(voices);
}

/** Speak text using the browser's SpeechSynthesis (works without backend TTS). */
async function speakWithBrowser(text: string, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = await waitForSpeechVoices();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = pickProfessionalVoice(voices);
  utterance.voice = selectedVoice;
  utterance.lang = selectedVoice?.lang || 'en-US';
  // Slightly warmer cadence feels less robotic while staying clear.
  utterance.rate = 0.96;
  utterance.pitch = 1.03;
  utterance.volume = 1.0;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

interface UseInterviewerVoiceOptions {
  onAutoSpeakStart?: () => void;
  onAutoSpeakEnd?: () => void;
}

/**
 * Speaks the AI interviewer's questions and responses aloud.
 * Tries backend TTS first; falls back to browser SpeechSynthesis.
 * Exposes speakText() so the UI can play a question on click (e.g. when autoplay is blocked).
 */
export function useInterviewerVoice(
  turns: Turn[] | undefined,
  voiceEnabled: boolean,
  options?: UseInterviewerVoiceOptions
) {
  const lastSpokenTurnId = useRef<string | null>(null);
  const onAutoSpeakStartRef = useRef<(() => void) | undefined>(options?.onAutoSpeakStart);
  const onAutoSpeakEndRef = useRef<(() => void) | undefined>(options?.onAutoSpeakEnd);

  useEffect(() => {
    onAutoSpeakStartRef.current = options?.onAutoSpeakStart;
    onAutoSpeakEndRef.current = options?.onAutoSpeakEnd;
  }, [options?.onAutoSpeakStart, options?.onAutoSpeakEnd]);

  useEffect(() => {
    // Warm up voice list so the first question can use the selected voice.
    void waitForSpeechVoices();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /** Speak a specific text (e.g. when user clicks "Play" on an interviewer message). */
  const speakText = useCallback(
    (text: string) => {
      if (!text?.trim()) return;
      stopSpeaking();
      void speakWithBrowser(text);
    },
    [stopSpeaking]
  );

  useEffect(() => {
    if (!turns?.length || !voiceEnabled) {
      if (!voiceEnabled) {
        lastSpokenTurnId.current = null;
        stopSpeaking();
      }
      return;
    }

    const lastAiTurn = [...turns].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    if (lastAiTurn.id === lastSpokenTurnId.current) return;
    lastSpokenTurnId.current = lastAiTurn.id;

    const fullText = (lastAiTurn.content || '').trim();
    if (!fullText) return;

    const speak = async () => {
      stopSpeaking();
      await speakWithBrowser(
        fullText,
        onAutoSpeakStartRef.current,
        onAutoSpeakEndRef.current
      );
    };

    // Short delay so the question is spoken after the page is ready; keeps the interview feeling responsive
    const t = setTimeout(speak, 220);
    return () => {
      clearTimeout(t);
      // Do not call stopSpeaking() here: effect re-runs (e.g. new turns reference) would cancel the question mid-way
    };
  }, [turns, voiceEnabled, stopSpeaking]);

  return { stopSpeaking, speakText };
}
