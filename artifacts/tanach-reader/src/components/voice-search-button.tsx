/**
 * Voice search button — uses webkitSpeechRecognition (he-IL).
 * On result: parses the transcript and calls onReferenceDetected.
 */
import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { parseHebrewReference } from '@/lib/speech-recognition';
import type { TanachBook } from '@/lib/tanach-data';

interface Props {
  onReferenceDetected: (book?: TanachBook, chapter?: number, verse?: number) => void;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function VoiceSearchButton({ onReferenceDetected }: Props) {
  const [listening,  setListening]  = useState(false);
  const [status,     setStatus]     = useState('');   // feedback text
  const [supported]                 = useState(() => !!SpeechRecognitionAPI);

  const handleClick = () => {
    if (!supported) {
      alert('הדפדפן אינו תומך בזיהוי קולי. מומלץ להשתמש ב-Chrome.');
      return;
    }

    if (listening) return; // already going, ignore double-tap

    const recognition = new SpeechRecognitionAPI();
    recognition.lang            = 'he-IL';
    recognition.interimResults  = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
      setStatus('מקשיב… דבר עכשיו');
    };

    recognition.onresult = (event: any) => {
      setListening(false);

      // Pick the alternative that contains a recognisable book name, else use first
      let bestTranscript = event.results[0][0].transcript;
      for (let i = 0; i < event.results[0].length; i++) {
        const t = event.results[0][i].transcript;
        const parsed = parseHebrewReference(t);
        if (parsed.book) { bestTranscript = t; break; }
      }

      setStatus(`שמעתי: "${bestTranscript}"`);
      setTimeout(() => setStatus(''), 5000);

      const { book, chapter, verse } = parseHebrewReference(bestTranscript);
      if (book || chapter || verse) {
        onReferenceDetected(book, chapter, verse);
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setStatus('נא לאפשר גישה למיקרופון');
      } else if (event.error === 'no-speech') {
        setStatus('לא זוהה דיבור — נסה שוב');
      } else {
        setStatus(`שגיאה: ${event.error}`);
      }
      setTimeout(() => setStatus(''), 5000);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        data-testid="button-voice-search"
        title="חיפוש קולי — אמור למשל: תהילים פרק א פסוק א"
        className={[
          'w-24 h-24 rounded-full border-2 transition-all duration-200',
          'flex items-center justify-center',
          listening
            ? 'bg-primary/20 border-primary animate-pulse scale-110'
            : supported
              ? 'bg-card border-primary/40 hover:border-primary hover:bg-primary/10 active:scale-95'
              : 'bg-muted border-muted-foreground/20 opacity-40 cursor-not-allowed',
        ].join(' ')}
      >
        {supported
          ? <Mic className={`w-9 h-9 ${listening ? 'text-primary' : 'text-primary/70'}`} />
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
