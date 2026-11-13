-- Throwaway (agentic-sdlc #59, pilot story 3): passes on the local stack (one public row),
-- fails on production, which has a second public row.
create unique index pilot_messages_one_public on public.pilot_messages (public) where public;
