import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  isSpeechRecognitionSupported, 
  createHebrewSpeechRecognition,
  parseHebrewReference,
  type SpeechRecognitionResult 
} from '@/lib/speech-recognition';

interface VoiceSearchButtonProps {
  onReferenceDetected: (book?: string, chapter?: number, verse?: number) => void;
}

export function VoiceSearchButton({ onReferenceDetected }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!isSupported) return;

    const handleResult = (result: SpeechRecognitionResult) => {
      const parsed = parseHebrewReference(result.transcript);
      setFeedback(`שמעתי: ${result.transcript}`);
      setIsListening(false);
      
      // Pass to parent
      if (parsed.book || parsed.chapter || parsed.verse) {
        onReferenceDetected(parsed.book, parsed.chapter, parsed.verse);
      }
      
      // Clear feedback after 5 seconds
      setTimeout(() => setFeedback(''), 5000);
    };

    const handleError = (error: string) => {
      setFeedback(`שגיאה: ${error}`);
      setIsListening(false);
      setTimeout(() => setFeedback(''), 5000);
    };

    recognitionRef.current = createHebrewSpeechRecognition(handleResult, handleError);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isSupported, onReferenceDetected]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setFeedback('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setFeedback('מקשיב...');
      } catch (error) {
        setFeedback('לא ניתן להפעיל זיהוי קול');
        setTimeout(() => setFeedback(''), 3000);
      }
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
            className="w-32 h-32 rounded-full bg-muted border-2 border-muted-foreground/20 opacity-40"
          >
            <MicOff className="w-12 h-12 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>הדפדפן לא תומך בזיהוי קול</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="lg"
        variant="outline"
        onClick={toggleListening}
        data-testid="button-voice-search"
        className={`
          w-32 h-32 rounded-full transition-all duration-300
          ${isListening 
            ? 'bg-primary/20 border-4 border-primary animate-pulse-glow' 
            : 'bg-card border-2 border-primary/40 hover:border-primary hover:bg-primary/10'
          }
        `}
      >
        <Mic className={`w-12 h-12 ${isListening ? 'text-primary' : 'text-primary/80'}`} />
      </Button>
      
      {feedback && (
        <p 
          className="text-center text-base text-muted-foreground max-w-md px-4"
          data-testid="text-voice-feedback"
          dir="rtl"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
