// Throwaway function for the factory's Supabase production deploy check (agentic-sdlc #59).
Deno.serve(() => new Response(Deno.env.get("PILOT_GREETING") ?? "no greeting set"));
