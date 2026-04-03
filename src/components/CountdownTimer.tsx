import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  onStop: () => void;
  paused: boolean;
}

export default function CountdownTimer({ initialSeconds, onComplete, onStop, paused }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (paused) return;

    if (seconds === 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, paused, onComplete]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSeconds(prev => prev);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;

  return (
    <div className="w-full px-4">
      <div className="mb-3 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-frame rounded-full transition-all duration-1000 ease-ink"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-3">
        <button
          disabled
          className="flex-1 px-6 py-3 min-h-[48px] border border-white/20 text-white/70 bg-white/5 rounded-lg font-medium text-[15px] transition-all duration-200 ease-ink"
        >
          Submitting in {seconds}
        </button>
        <button
          onClick={onStop}
          className="flex-1 px-6 py-3 min-h-[48px] bg-frame text-white rounded-lg font-medium text-[15px] transition-all duration-200 ease-ink active:scale-[0.97]"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
