/**
 * Voice search button — uses webkitSpeechRecognition (he-IL) for STT,
 * then sends the transcript to the AI endpoint for smart navigation parsing.
 */
import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { TanachBook } from '@/lib/tanach-data';

interface Props {
  onReferenceDetected: (book?: TanachBook, chapter?: number, verse?: number) => void;
  onAnswer: (text: string) => void;
  currentBook?: string;
  currentChapter?: number;
  currentVerse?: number;
  currentVerseText?: string;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

type Phase = 'idle' | 'listening' | 'thinking';

export function VoiceSearchButton({
  onReferenceDetected,
  onAnswer,
  currentBook,
  currentChapter,
  currentVerse,
  currentVerseText,
}: Props) {
  const [phase,     setPhase]     = useState<Phase>('idle');
  const [status,    setStatus]    = useState('');
  const [supported]               = useState(() => !!SpeechRecognitionAPI);

  const setTempStatus = (msg: string, ms = 6000) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), ms);
  };

  const handleAICommand = async (transcript: string) => {
    setPhase('thinking');
    setStatus('מעבד…');
    try {
      const res = await fetch('/api/ai/voice-command', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, currentBook, currentChapter, currentVerse, currentVerseText }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setTempStatus(body.error ?? 'הגעת למכסת השאלות. נסה שוב מאוחר יותר.', 8000);
        return;
      }
      if (!res.ok) throw new Error(`server ${res.status}`);
      const data = await res.json() as
        | { type: 'navigate'; book: string; chapter: number; verse: number }
        | { type: 'answer'; text: string }
        | { type: 'unknown' };

      if (data.type === 'navigate') {
        const book = data.book === 'CURRENT' ? undefined : { english: data.book } as TanachBook;
        setTempStatus(book ? `ניווט ל-${data.book} ${data.chapter}:${data.verse}` : `ניווט לפרק ${data.chapter}`);
        onReferenceDetected(book, data.chapter, data.verse);
      } else if (data.type === 'answer') {
        setStatus('');
        onAnswer(data.text);
      } else {
        setTempStatus('לא הצלחתי להבין — נסה שוב');
      }
    } catch {
      setTempStatus('שגיאת תקשורת — נסה שוב');
    } finally {
      setPhase('idle');
    }
  };

  const handleClick = () => {
    if (!supported) {
      alert('הדפדפן אינו תומך בזיהוי קולי. מומלץ להשתמש ב-Chrome.');
      return;
    }
    if (phase !== 'idle') return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang            = 'he-IL';
    recognition.interimResults  = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setPhase('listening');
      setStatus('מקשיב… דבר עכשיו');
    };

    recognition.onresult = (event: any) => {
      // Use the first alternative — AI will handle ambiguity
      const transcript: string = event.results[0][0].transcript;
      setStatus(`שמעתי: "${transcript}"`);
      handleAICommand(transcript);
    };

    recognition.onerror = (event: any) => {
      setPhase('idle');
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setTempStatus('נא לאפשר גישה למיקרופון');
      } else if (event.error === 'no-speech') {
        setTempStatus('לא זוהה דיבור — נסה שוב');
      } else {
        setTempStatus(`שגיאה: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (phase === 'listening') setPhase('idle');
    };

    recognition.start();
  };

  const isListening = phase === 'listening';
  const isThinking  = phase === 'thinking';

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={phase !== 'idle'}
        data-testid="button-voice-search"
        title="חיפוש קולי — אמור למשל: תפתח תהילים פרק א"
        className={[
          'w-24 h-24 rounded-full border-2 transition-all duration-200',
          'flex items-center justify-center',
          isListening
            ? 'bg-primary/20 border-primary animate-pulse scale-110'
            : isThinking
              ? 'bg-amber-500/10 border-amber-500 animate-pulse scale-105'
              : supported
                ? 'bg-card border-primary/40 hover:border-primary hover:bg-primary/10 active:scale-95'
                : 'bg-muted border-muted-foreground/20 opacity-40 cursor-not-allowed',
        ].join(' ')}
      >
        {supported
          ? <Mic className={`w-9 h-9 ${isListening ? 'text-primary' : isThinking ? 'text-amber-500' : 'text-primary/70'}`} />
          : <MicOff className="w-9 h-9 text-muted-foreground" />}
      </button>

      {status && (
        <p className="text-sm text-muted-foreground text-center max-w-xs px-2" dir="rtl"
          data-testid="text-voice-feedback">
          {status}
        </p>
      )}
    </div>
  );
}
