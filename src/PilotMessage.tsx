import { useEffect, useState } from 'react';

/** Throwaway: the public messages from Supabase, for the factory's production deploy check (agentic-sdlc #59). */
export function PilotMessage() {
  const [text, setText] = useState('');
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    fetch(`${url}/rest/v1/pilot_messages?select=body`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { body: string }[]) => setText(rows.map((r) => r.body).join(' · ')))
      .catch(() => setText(''));
  }, []);
  return text ? <p data-testid="pilot-message">{text}</p> : null;
}
