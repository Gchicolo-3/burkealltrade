'use client';
import { useEffect, useRef, useState } from 'react';

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

// Textarea with a mic button. Uses the browser's speech recognition when available.
// On iPhone, the keyboard mic works everywhere as a fallback.
export default function VoiceInput({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<SR | null>(null);
  const base = useRef('');

  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onChange((base.current ? base.current + ' ' : '') + text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setSupported(true);
    return () => r.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (!rec.current) return;
    if (listening) {
      rec.current.stop();
      setListening(false);
    } else {
      base.current = value.trim();
      rec.current.start();
      setListening(true);
    }
  };

  return (
    <div className="relative">
      <textarea
        className="input pr-14"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? 'Stop recording' : 'Talk instead of typing'}
          className={`absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-white ${listening ? 'animate-pulse bg-red-600' : 'bg-stone-800'}`}
        >
          {listening ? '■' : '🎤'}
        </button>
      )}
    </div>
  );
}
