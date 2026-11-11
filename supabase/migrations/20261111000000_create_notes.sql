-- Private notes (spec 106): each note belongs to one account, and only that account reads or adds it.
create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (length(btrim(text)) > 0),
  created_at timestamptz not null default now()
);

create index notes_user_id_id_idx on public.notes (user_id, id);

alter table public.notes enable row level security;

-- Signed-in accounts read and add only their own notes; nobody updates or deletes them.
create policy "Accounts read their own notes" on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Accounts add their own notes" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Explicit, minimal grants: nothing without a sign-in or for the service role; a signed-in account
-- only reads notes and adds their text.
revoke all on table public.notes from anon, authenticated, service_role;
grant select (id, text) on table public.notes to authenticated;
grant insert (text) on table public.notes to authenticated;
