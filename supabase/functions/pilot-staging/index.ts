// Throwaway function for the factory's Supabase preview check (agentic-sdlc #60).
Deno.serve(() => new Response(`staging v2 ${Deno.env.get("PILOT_STAGING_SECRET") ?? "unset"}`));
