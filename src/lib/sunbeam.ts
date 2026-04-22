export function scoreColor(s: number): string {
  if (s >= 90) return 'text-sb-correct';
  if (s >= 70) return 'text-sb-primary-dark';
  if (s >= 50) return 'text-sb-yellow';
  return 'text-sb-wrong';
}

export function groupAccent(level: '1-2' | '3-4' | '5-6') {
  if (level === '1-2') return { chip: 'bg-sb-primary-pale text-sb-primary-dark', dot: '#77CDD0' };
  if (level === '3-4') return { chip: 'bg-sb-correct-pale text-sb-correct-dark', dot: '#2FA07E' };
  return { chip: 'bg-sb-orange-pale text-sb-orange-dark', dot: '#F47C5A' };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function playTTS(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) { /* noop */ }
}
