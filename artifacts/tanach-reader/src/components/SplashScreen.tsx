import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

// Total: 4 seconds
// 0–2s  → static hold (circle at rest)
// 2–4s  → circle grows smoothly
// 3.6s  → fade-out starts (0.4s)
// 4s    → done
const HOLD_MS  = 2000;
const TOTAL_MS = 4000;
const FADE_MS  = 400;

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [circleGrow, setCircleGrow] = useState(false);
  const [fadeOut,    setFadeOut]    = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setCircleGrow(true),  HOLD_MS);
    const t2 = setTimeout(() => setFadeOut(true),      TOTAL_MS - FADE_MS);
    const t3 = setTimeout(onDone,                      TOTAL_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

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
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* Glowing circle — only this element grows */}
      <div
        style={{
          width:  circleGrow ? '300px' : '210px',
          height: circleGrow ? '300px' : '210px',
          borderRadius: '50%',
          boxShadow: '0 0 0 6px rgba(255,255,255,0.25), 0 8px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          transition: circleGrow
            ? `width ${TOTAL_MS - HOLD_MS}ms cubic-bezier(0.25,0.46,0.45,0.94),
               height ${TOTAL_MS - HOLD_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`
            : 'none',
        }}
      >
        <img
          src="/icon-192.png"
          alt="לוגו"
          style={{ width: '150px', height: '150px', borderRadius: '50%' }}
        />
      </div>

      {/* App title — fixed size, no transform */}
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
          עם בינה מלאכותית
        </div>
      </div>

      {/* Loading dots */}
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
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
