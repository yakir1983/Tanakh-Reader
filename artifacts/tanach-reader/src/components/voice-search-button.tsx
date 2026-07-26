import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  isSpeechRecognitionSupported,
  createHebrewSpeechRecognition,
  parseHebrewReference,
  type SpeechRecognitionResult,
} from '@/lib/speech-recognition';
import type { TanachBook } from '@/lib/tanach-data';

interface VoiceSearchButtonProps {
  onReferenceDetected: (book?: TanachBook, chapter?: number, verse?: number) => void;
}

export function VoiceSearchButton({ onReferenceDetected }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback]       = useState('');
  const [permError, setPermError]     = useState(false);
  const recognitionRef = useRef<any>(null);
  const feedbackTimer  = useRef<ReturnType<typeof setTimeout>>();

  const isSupported = isSpeechRecognitionSupported();

  function showFeedback(msg: string, durationMs = 5000) {
    setFeedback(msg);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), durationMs);
  }

  useEffect(() => {
    if (!isSupported) return;

    const handleResult = (result: SpeechRecognitionResult) => {
      setIsListening(false);
      const parsed = parseHebrewReference(result.transcript);
      showFeedback(`שמעתי: "${result.transcript}"`);
      if (parsed.book || parsed.chapter || parsed.verse) {
        onReferenceDetected(parsed.book, parsed.chapter, parsed.verse);
      }
    };

    const handleError = (error: string) => {
      setIsListening(false);
      if (error === 'not-allowed' || error === 'permission-denied') {
        setPermError(true);
        showFeedback('נא לאפשר גישה למיקרופון בהגדרות הדפדפן', 8000);
      } else if (error === 'no-speech') {
        showFeedback('לא זוהה דיבור — נסה שוב');
      } else {
        showFeedback(`שגיאה: ${error}`);
      }
    };

    recognitionRef.current = createHebrewSpeechRecognition(handleResult, handleError);
    return () => clearTimeout(feedbackTimer.current);
  }, [isSupported, onReferenceDetected]);

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setFeedback('');
      return;
    }

    // Explicitly request mic permission so the browser shows the native prompt
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermError(false);
    } catch {
      setPermError(true);
      showFeedback('נא לאפשר גישה למיקרופון בהגדרות הדפדפן', 8000);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      showFeedback('מקשיב... דבר עכשיו', 10000);
    } catch {
      showFeedback('לא ניתן להפעיל זיהוי קול');
    }
  };

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="lg"
            variant="outline"
            disabled
            data-testid="button-voice-search-disabled"
            className="w-28 h-28 rounded-full bg-muted border-2 border-muted-foreground/20 opacity-40"
          >
            <MicOff className="w-10 h-10 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>הדפדפן לא תומך בזיהוי קול</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="lg"
            variant="outline"
            onClick={toggleListening}
            data-testid="button-voice-search"
            className={[
              'w-28 h-28 rounded-full transition-all duration-300',
              isListening
                ? 'bg-primary/20 border-4 border-primary animate-pulse'
                : permError
                  ? 'bg-destructive/10 border-2 border-destructive/40 hover:border-destructive'
                  : 'bg-card border-2 border-primary/40 hover:border-primary hover:bg-primary/10',
            ].join(' ')}
          >
            {isListening ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Mic className={`w-10 h-10 ${permError ? 'text-destructive/70' : 'text-primary/80'}`} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent dir="rtl">
          <p>{isListening ? 'לחץ לעצירה' : 'חיפוש קולי — אמור למשל: "בראשית פרק א פסוק א"'}</p>
        </TooltipContent>
      </Tooltip>

      {feedback && (
        <p
          className="text-center text-sm text-muted-foreground max-w-xs px-2"
          data-testid="text-voice-feedback"
          dir="rtl"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
