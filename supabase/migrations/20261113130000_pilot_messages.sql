-- Throwaway table for the factory's Supabase production deploy check (agentic-sdlc #59).
create table public.pilot_messages (
  id bigint generated always as identity primary key,
  body text not null,
  public boolean not null default false
);
alter table public.pilot_messages enable row level security;
grant select on public.pilot_messages to anon;
create policy "public messages are readable" on public.pilot_messages
  for select to anon using (public);
insert into public.pilot_messages (body, public) values
  ('Hello from the production migrations', true),
  ('Hidden by row level security', false);
