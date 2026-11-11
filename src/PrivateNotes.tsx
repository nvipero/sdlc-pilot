import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { noteText, toNotes, type Note } from './notes';
import { supabase } from './supabase';

/** Sign-up, sign-in and the signed-in account's private notes (spec 106). Separate from the board. */
export function PrivateNotes() {
  if (supabase === null) return null;
  return <Notes client={supabase} />;
}

function Notes({ client }: { client: SupabaseClient }) {
  // undefined until the stored session has been read, so no form flashes before a signed-in view.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  // Loading and adding notes run one after the other, so notes are stored and shown in the order added.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // The account the page currently shows, read by queued steps that finish after a change.
  const currentUserRef = useRef<string | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  /** Runs a step after the earlier ones; its result is dropped when the account changed meanwhile. */
  function enqueue(step: (isCurrent: () => boolean) => Promise<void>) {
    queueRef.current = queueRef.current.then(() => step(() => currentUserRef.current === userId)).catch(() => {});
  }

  useEffect(() => {
    currentUserRef.current = userId;
    setNotes([]);
    if (userId === null) return;
    setError(null);
    enqueue(async (isCurrent) => {
      const { data, error } = await client.from('notes').select('id,text').order('id');
      if (!isCurrent()) return;
      if (error) setError(error.message);
      else setNotes(toNotes(data));
    });
  }, [client, userId]);

  async function authenticate(kind: 'signIn' | 'signUp') {
    setBusy(true);
    setError(null);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      kind === 'signUp'
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) setError(error.message);
    else if (data.session === null) setError('Signing up did not sign you in.');
    else setPassword('');
  }

  function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate('signIn');
  }

  function handleSignUp(form: HTMLFormElement | null) {
    if (form !== null && !form.reportValidity()) return;
    void authenticate('signUp');
  }

  async function handleSignOut() {
    setError(null);
    const { error } = await client.auth.signOut();
    if (error) setError(error.message);
  }

  function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteText(draft);
    if (text === null) return;
    setDraft('');
    enqueue(async (isCurrent) => {
      const { data, error } = await client.from('notes').insert({ text }).select('id,text');
      if (!isCurrent()) return;
      if (error) setError(error.message);
      else setNotes((current) => [...current, ...toNotes(data)]);
    });
  }

  if (session === undefined) return null;

  return (
    <section aria-label="Private notes" className="private-notes">
      {error !== null && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {session === null ? (
        <form onSubmit={handleSignIn}>
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="button" disabled={busy} onClick={(event) => handleSignUp(event.currentTarget.form)}>
            Sign up
          </button>
          <button type="submit" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <p>
            <span>Signed in as {session.user.email}</span>{' '}
            <button type="button" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </p>
          <form onSubmit={handleAddNote}>
            <label htmlFor="note-text">Note</label>
            <input id="note-text" type="text" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit">Add note</button>
          </form>
          <ul aria-label="Notes" className="notes">
            {notes.map((note) => (
              <li key={note.id}>{note.text}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
