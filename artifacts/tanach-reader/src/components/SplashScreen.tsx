import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
  duration?: number; // ms
}

export function SplashScreen({ onDone, duration = 2200 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    // fade-in: 400ms → hold → fade-out: 400ms
    const holdTimer = setTimeout(() => setPhase('out'), duration - 400);
    const doneTimer = setTimeout(onDone, duration);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, duration]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#1086C0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'in' ? 'opacity 0.4s ease-in' : 'opacity 0.4s ease-out',
      }}
    >
      {/* Logo */}
      <img
        src="/icon-192.png"
        alt="לוגו"
        style={{
          width: '110px',
          height: '110px',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          transform: phase === 'in' ? 'scale(0.85)' : 'scale(1)',
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />

      {/* App title */}
      <div style={{ textAlign: 'center', direction: 'rtl' }}>
        <div
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 700,
            fontFamily: 'serif',
            letterSpacing: '0.02em',
            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
            lineHeight: 1.3,
          }}
        >
          קורא תנ״ך ורש״י
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '14px',
            marginTop: '6px',
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
          }}
        >
          מאופשר בבינה מלאכותית
        </div>
      </div>

      {/* Subtle loading dots */}
      <LoadingDots />
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.6)',
            display: 'inline-block',
            animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
