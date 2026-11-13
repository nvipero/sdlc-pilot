-- Throwaway (agentic-sdlc #59, pilot story 3): the fix after the unique index failed on
-- production's data. Never applied, so the file changes in place.
create index pilot_messages_public on public.pilot_messages (public);
